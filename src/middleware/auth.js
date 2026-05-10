/**
 * Auth middleware : protège les routes admin
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.admin && req.session.admin.id) {
    return next();
  }
  // Redirige vers login en gardant l'URL d'origine
  const redirectTo = encodeURIComponent(req.originalUrl);
  return res.redirect(`/admin/login?next=${redirectTo}`);
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.admin && req.session.admin.id) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuthed };
