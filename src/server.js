/**
 * L'Émulsion — Serveur principal
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { i18nMiddleware } = require('./middleware/i18n');
const { issueCsrf } = require('./middleware/csrf');
const publicRoutes = require('./routes/public');
const adminAuthRoutes = require('./routes/admin-auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5678;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy (Nginx en amont). NB : on fait confiance UNIQUEMENT au premier
// hop, pas à toute la chaîne — protège contre des X-Forwarded-For falsifiés.
app.set('trust proxy', 1);
// Désactive l'identifiant de stack
app.disable('x-powered-by');

// ─── SESSION SECRET CHECK ───────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  console.error('⚠️  SESSION_SECRET manquant ou trop court (min 32 caractères). Voir .env.example');
  if (isProd) process.exit(1);
}

// ─── SECURITY HEADERS ───────────────────────────────────────────────────────
// CSP nonce par requête (utilisable dans <script nonce=...> si nécessaire à l'avenir).
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Aucun script inline n'est utilisé — on retire 'unsafe-inline'. Le seul
      // <script type="application/ld+json"> n'est PAS exécutable et n'est pas
      // concerné par scriptSrc. <script src="/js/..."> est couvert par 'self'.
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      // Les styles inline (attribut style="...") sont utilisés sur .reveal etc.,
      // donc on garde 'unsafe-inline' uniquement pour styleSrc.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      // imgSrc restreint : 'self' (uploads) + data: (placeholders) ; pas de https: wildcard.
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // HSTS : forcer HTTPS pendant 1 an (incluant sous-domaines), preload-ready.
  // Activé seulement en prod (sinon casse le dev en HTTP localhost).
  strictTransportSecurity: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ─── BODY PARSING ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '512kb', parameterLimit: 200 }));
app.use(express.json({ limit: '512kb' }));

// ─── COOKIES (lecture simple — pas de signature côté app, sessions signées) ─
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) req.cookies[k] = decodeURIComponent(v.join('='));
  }
  next();
});

// ─── SESSIONS ───────────────────────────────────────────────────────────────
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, '..', 'data') }),
  secret: sessionSecret || 'dev-only-insecure-secret-change-in-production-pls',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 1000 * 60 * 60 * 8, // 8h
  },
  name: 'sfv.sid',
}));

// ─── CSRF — token de session disponible dans toutes les vues ────────────────
// On émet (issueCsrf) globalement ; la vérification (verifyCsrf) est appliquée
// route par route dans les routers admin.
app.use(issueCsrf);

// ─── VIEW ENGINE (EJS avec layouts custom) ──────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Helper pour les layouts (EJS n'a pas de layout natif)
const ejs = require('ejs');
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = function (view, options = {}, callback) {
    const layout = options.layout || 'layouts/public';
    const opts = { ...res.locals, ...options };

    ejs.renderFile(
      path.join(app.get('views'), `${view}.ejs`),
      opts,
      (err, content) => {
        if (err) return next(err);
        opts.body = content;
        ejs.renderFile(
          path.join(app.get('views'), `${layout}.ejs`),
          opts,
          (err2, finalHtml) => {
            if (err2) return next(err2);
            if (callback) return callback(null, finalHtml);
            res.send(finalHtml);
          }
        );
      }
    );
  };
  next();
});

// ─── i18n ───────────────────────────────────────────────────────────────────
app.use(i18nMiddleware);

// Expose des helpers globaux aux templates
app.use((req, res, next) => {
  res.locals.publicUrl = process.env.PUBLIC_URL || '';
  res.locals.currentPath = req.path;
  res.locals.year = new Date().getFullYear();

  try {
    const { getAllSettings } = require('./utils/settings');
    const { getAllHours, getCurrentStatus } = require('./utils/hours');
    res.locals.settings = getAllSettings();
    res.locals.hours = getAllHours(res.locals.lang);
    res.locals.status = getCurrentStatus(res.locals.lang);
    res.locals.menu = res.locals.menu || [];
    res.locals.featured = res.locals.featured || [];
    res.locals.gallery = res.locals.gallery || [];
    res.locals.reviews = res.locals.reviews || [];
  } catch (err) {
    res.locals.settings = {};
    res.locals.hours = [];
    res.locals.status = { isOpen: false, message: '' };
    res.locals.menu = [];
    res.locals.featured = [];
    res.locals.gallery = [];
    res.locals.reviews = [];
  }
  next();
});

// ─── STATIC FILES ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: isProd ? '7d' : 0,
  etag: true,
  // Empêche servir des dotfiles (.env, .git, .htaccess…) accidentellement copiés
  dotfiles: 'deny',
  // Empêche un bypass via redirect
  redirect: false,
}));

// ─── NOINDEX SUR /admin (anti-indexation des moteurs) ───────────────────────
app.use('/admin', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  // Headers anti-cache : empêche un proxy/navigateur de garder en cache une
  // page admin qui pourrait être servie à un autre utilisateur.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/admin', adminAuthRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('public/404', { layout: 'layouts/public', page: '404' });
});

// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Log côté serveur uniquement — jamais leaké au client en prod.
  console.error('[error]', err.stack || err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).send('Fichier trop volumineux (max 8 MB).');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).send('Trop de fichiers ou champ inattendu.');
  }
  if (err.message && err.message.includes("Format d'image")) {
    return res.status(400).send(err.message);
  }
  res.status(500).render('public/error', {
    layout: 'layouts/public',
    page: 'error',
    error: isProd ? null : err,
  });
});

// ─── STARTUP ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✦ L'Émulsion — serveur démarré`);
  console.log(`   ▸ http://localhost:${PORT}`);
  console.log(`   ▸ Admin : http://localhost:${PORT}/admin/login`);
  console.log(`   ▸ Mode  : ${isProd ? 'production' : 'development'}\n`);
});
