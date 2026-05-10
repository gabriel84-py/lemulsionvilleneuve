/**
 * Routes admin auth : login, logout
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const db = require('../db/database');
const { redirectIfAuthed } = require('../middleware/auth');
const { verifyCsrf, rotateCsrf } = require('../middleware/csrf');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// Rate limiting strict sur le login : 8 tentatives / 15 min par IP.
// Bloque même si l'IP fait un mix de POST différents.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  // Compte également les requêtes 401/403 (par défaut, certaines lib ne les comptent pas).
  skipSuccessfulRequests: false,
  message: 'Trop de tentatives. Réessayez dans 15 minutes.',
});

// Validation stricte des "next" pour éviter open-redirect via /admin//evil.com
function safeNext(value) {
  if (typeof value !== 'string') return '/admin';
  // Path-only, doit commencer par "/admin/" ou être "/admin"
  // Refuse "//..." (protocol-relative) et schémas "javascript:" etc.
  if (!value.startsWith('/')) return '/admin';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/admin';
  if (!/^\/admin(\/|$)/.test(value)) return '/admin';
  // Nettoie tout caractère exotique
  if (/[\r\n\0]/.test(value)) return '/admin';
  return value;
}

// GET /admin/login
router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('admin/login', {
    layout: 'layouts/admin-bare',
    error: null,
    next: safeNext(req.query.next),
  });
});

// POST /admin/login
// Ordre : rate-limit → vérif CSRF → redirect-if-auth → traitement.
router.post('/login', loginLimiter, verifyCsrf, redirectIfAuthed, async (req, res) => {
  const { username, password } = req.body;
  const next = safeNext(req.body.next);

  if (typeof username !== 'string' || typeof password !== 'string' ||
      !username || !password ||
      username.length > 64 || password.length > 256) {
    return res.render('admin/login', {
      layout: 'layouts/admin-bare',
      error: 'Identifiant et mot de passe requis.',
      next,
    });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  // Comparaison bcrypt même si admin n'existe pas (timing attack protection)
  const fakeHash = '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval';
  const validPassword = await bcrypt.compare(password, admin?.password_hash || fakeHash);

  if (!admin || !validPassword) {
    logActivity(req, {
      action: 'login_failed',
      entity: 'auth',
      // On ne log pas l'username brut (peut être PII / pollution log) : on tronque.
      details: { user: String(username).slice(0, 32) },
    });
    return res.render('admin/login', {
      layout: 'layouts/admin-bare',
      error: 'Identifiants incorrects.',
      next,
    });
  }

  // Login OK : régénère la session (anti session-fixation) et fait pivoter le
  // token CSRF (anti reuse d'un token capturé avant authentification).
  req.session.regenerate((err) => {
    if (err) {
      console.error('[auth] session regenerate failed:', err);
      return res.status(500).send('Erreur de session');
    }
    req.session.admin = { id: admin.id, username: admin.username };
    rotateCsrf(req);

    db.prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(admin.id);

    logActivity(req, {
      action: 'login_success',
      entity: 'auth',
      entityId: admin.id,
    });

    req.session.save((errSave) => {
      if (errSave) console.error('[auth] session save failed:', errSave);
      res.redirect(next);
    });
  });
});

// POST /admin/logout — protégé CSRF (sinon un attaquant peut forcer une décon.)
router.post('/logout', verifyCsrf, (req, res) => {
  if (req.session && req.session.admin) {
    logActivity(req, {
      action: 'logout',
      entity: 'auth',
      entityId: req.session.admin.id,
    });
  }
  req.session.destroy(() => {
    res.clearCookie('sfv.sid');
    res.redirect('/admin/login');
  });
});

module.exports = router;
