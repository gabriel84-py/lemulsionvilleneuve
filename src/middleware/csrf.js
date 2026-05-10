/**
 * CSRF protection — implémentation simple basée sur la session.
 *
 * - issueCsrf : génère un token par session (s'il n'existe pas) et l'expose
 *   à toutes les vues via res.locals.csrfToken. À appliquer LARGEMENT, pour
 *   que GET /admin/* dispose toujours d'un token à inclure dans les forms.
 *
 * - verifyCsrf : sur toute méthode mutante (POST/PUT/PATCH/DELETE), exige
 *   que le token reçu (body._csrf, query._csrf ou en-tête X-CSRF-Token)
 *   égale celui de la session. Comparaison constant-time.
 *
 *   IMPORTANT pour les routes multipart : verifyCsrf doit s'exécuter APRÈS
 *   multer (sinon req.body._csrf n'est pas encore parsé). Sur les routes
 *   urlencoded/json classiques, l'ordre n'a pas d'importance.
 */

const crypto = require('crypto');

function ensureToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function issueCsrf(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token || '';
  next();
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifyCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const sessionToken = req.session && req.session.csrfToken;
  const provided =
    (req.body && typeof req.body._csrf === 'string' && req.body._csrf) ||
    (req.query && typeof req.query._csrf === 'string' && req.query._csrf) ||
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    '';

  if (!sessionToken || !timingSafeEqual(sessionToken, String(provided))) {
    res.status(403);
    if (req.accepts('html')) {
      return res
        .type('text/html; charset=utf-8')
        .send('<h1>403 — Requête rejetée</h1><p>Token CSRF invalide ou expiré. Rechargez la page et réessayez.</p>');
    }
    return res.json({ error: 'csrf_invalid' });
  }

  next();
}

/**
 * Rotation explicite du token CSRF (à utiliser après login / changement de
 * mot de passe pour invalider les anciens tokens).
 */
function rotateCsrf(req) {
  if (req.session) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
}

module.exports = { issueCsrf, verifyCsrf, rotateCsrf };
