/**
 * Routes admin (protégées) : tout le CRUD pour le restaurateur
 */
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { verifyCsrf, rotateCsrf } = require('../middleware/csrf');
const { upload, processImages, deleteUpload } = require('../middleware/upload');
const { getAllSettings, getSetting, setSetting } = require('../utils/settings');
const { getAllHours } = require('../utils/hours');
const { logActivity, getRecentLogs } = require('../utils/logger');

const router = express.Router();

// Toutes les routes ici sont protégées
router.use(requireAuth);

// Layout admin par défaut
router.use((req, res, next) => {
  res.locals.adminLayout = 'layouts/admin';
  res.locals.adminUser = req.session.admin;
  next();
});

// ─── Helpers de validation simples ─────────────────────────────────────────
function str(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  return s.slice(0, max);
}
function reqStr(v, max = 500) {
  const s = str(v, max);
  return s || '';
}
function intIn(v, def = 0, min = -2147483648, max = 2147483647) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function bool(v) { return v === 'on' || v === 'true' || v === '1' || v === 1 || v === true; }
function isSafeUrl(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  // Autorise http(s) + tel: + mailto: ; refuse javascript:, data:, etc.
  if (!/^(https?:|mailto:|tel:)/i.test(s)) return null;
  if (s.length > 2048) return null;
  return s;
}

// ─── Rate limit anti brute-force pour la zone /account ─────────────────────
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives. Réessayez dans 15 minutes.',
});

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const stats = {
    menuItems: db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c,
    galleryPhotos: db.prepare('SELECT COUNT(*) as c FROM gallery').get().c,
    reviews: db.prepare('SELECT COUNT(*) as c FROM reviews').get().c,
    categories: db.prepare('SELECT COUNT(*) as c FROM menu_categories').get().c,
  };
  const recentLogs = getRecentLogs(10);

  res.render('admin/dashboard', {
    layout: 'layouts/admin',
    page: 'dashboard',
    stats,
    recentLogs,
  });
});

// ─── SETTINGS GÉNÉRAUX ──────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const settings = getAllSettings();
  res.render('admin/settings', {
    layout: 'layouts/admin',
    page: 'settings',
    settings,
    flash: req.query.saved ? 'Modifications enregistrées' : null,
  });
});

router.post('/settings',
  upload.fields([
    { name: 'hero_image', maxCount: 1 },
    { name: 'about_image', maxCount: 1 },
  ]),
  verifyCsrf, // après multer pour que req.body._csrf soit dispo
  processImages,
  async (req, res) => {
    const body = req.body || {};

    // Champs simples (avec validation par type)
    const simpleStrings = {
      restaurant_name: 120, phone: 40, email: 120,
      address_street: 200, address_postal: 20, address_city: 120,
      geo_lat: 40, geo_lng: 40,
      rating_value: 10, rating_count: 10,
      meta_description: 320,
    };
    for (const [key, max] of Object.entries(simpleStrings)) {
      if (body[key] !== undefined) setSetting(key, reqStr(body[key], max));
    }

    // URLs : validation stricte (anti javascript:)
    const urlKeys = ['social_instagram', 'social_facebook', 'social_google_maps'];
    for (const key of urlKeys) {
      if (body[key] !== undefined) {
        const cleaned = isSafeUrl(body[key]) || '';
        setSetting(key, cleaned);
      }
    }

    if (body.announcement_active !== undefined) {
      setSetting('announcement_active', bool(body.announcement_active) ? '1' : '0');
    }

    // Champs traduits {fr, en, it}
    const i18nKeys = {
      hero_title: 200, hero_subtitle: 400,
      about_title: 200, about_text: 4000,
      announcement_text: 400,
    };
    for (const [key, max] of Object.entries(i18nKeys)) {
      const value = {
        fr: reqStr(body[`${key}_fr`], max),
        en: reqStr(body[`${key}_en`], max),
        it: reqStr(body[`${key}_it`], max),
      };
      setSetting(key, value);
    }

    // Images uploadées
    if (req.files && req.files.hero_image && req.files.hero_image[0]) {
      const old = getSetting('hero_image');
      if (old) deleteUpload(old);
      const newUrl = req.processedFiles && req.processedFiles
        .find((f) => f.originalName === req.files.hero_image[0].originalname);
      if (newUrl) setSetting('hero_image', newUrl.url);
    }
    if (req.files && req.files.about_image && req.files.about_image[0]) {
      const old = getSetting('about_image');
      if (old) deleteUpload(old);
      const newUrl = req.processedFiles && req.processedFiles
        .find((f) => f.originalName === req.files.about_image[0].originalname);
      if (newUrl) setSetting('about_image', newUrl.url);
    }

    logActivity(req, { action: 'update', entity: 'settings' });
    res.redirect('/admin/settings?saved=1');
  }
);

// ─── HORAIRES ───────────────────────────────────────────────────────────────
router.get('/hours', (req, res) => {
  const hours = getAllHours('fr');
  res.render('admin/hours', {
    layout: 'layouts/admin',
    page: 'hours',
    hours,
    flash: req.query.saved ? 'Horaires enregistrés' : null,
  });
});

router.post('/hours', verifyCsrf, (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO opening_hours (day_of_week, service, opens, closes, is_closed)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(day_of_week, service) DO UPDATE SET
      opens = excluded.opens,
      closes = excluded.closes,
      is_closed = excluded.is_closed
  `);

  const validTime = (v) => {
    if (!v) return null;
    return /^[0-2][0-9]:[0-5][0-9]$/.test(v) ? v : null;
  };

  const tx = db.transaction(() => {
    for (let day = 0; day < 7; day++) {
      for (const service of ['lunch', 'dinner']) {
        const closedKey = `closed_${day}_${service}`;
        const opensKey = `opens_${day}_${service}`;
        const closesKey = `closes_${day}_${service}`;
        const isClosed = bool(req.body[closedKey]) ? 1 : 0;
        const opens = validTime(req.body[opensKey]);
        const closes = validTime(req.body[closesKey]);
        upsert.run(day, service, isClosed ? null : opens, isClosed ? null : closes, isClosed);
      }
    }
  });
  tx();

  logActivity(req, { action: 'update', entity: 'opening_hours' });
  res.redirect('/admin/hours?saved=1');
});

// ─── MENU : CATÉGORIES ──────────────────────────────────────────────────────
router.get('/menu', (req, res) => {
  const categories = db.prepare(`
    SELECT * FROM menu_categories
    ORDER BY display_order ASC, id ASC
  `).all();

  const items = db.prepare(`
    SELECT mi.*, mc.name_fr as category_name
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    ORDER BY mc.display_order, mi.display_order, mi.id
  `).all();

  const itemsByCategory = {};
  for (const cat of categories) itemsByCategory[cat.id] = [];
  for (const item of items) {
    if (itemsByCategory[item.category_id]) itemsByCategory[item.category_id].push(item);
  }

  res.render('admin/menu', {
    layout: 'layouts/admin',
    page: 'menu',
    categories,
    itemsByCategory,
    flash: req.query.saved ? 'Modifications enregistrées' : null,
  });
});

router.post('/menu/categories', verifyCsrf, (req, res) => {
  const slug = reqStr(req.body.slug, 80);
  const name_fr = reqStr(req.body.name_fr, 120);
  if (!slug || !name_fr) return res.redirect('/admin/menu');
  if (!/^[a-z0-9-]+$/.test(slug)) return res.redirect('/admin/menu');

  const stmt = db.prepare(`
    INSERT INTO menu_categories (slug, name_fr, name_en, name_it, description_fr, description_en, description_it, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    slug, name_fr,
    str(req.body.name_en, 120), str(req.body.name_it, 120),
    str(req.body.description_fr, 1000), str(req.body.description_en, 1000), str(req.body.description_it, 1000),
    intIn(req.body.display_order, 0, 0, 9999),
  );
  logActivity(req, { action: 'create', entity: 'menu_category', entityId: result.lastInsertRowid, details: { slug, name_fr } });
  res.redirect('/admin/menu?saved=1');
});

router.post('/menu/categories/:id', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/menu');

  const slug = reqStr(req.body.slug, 80);
  const name_fr = reqStr(req.body.name_fr, 120);
  if (!slug || !name_fr || !/^[a-z0-9-]+$/.test(slug)) return res.redirect('/admin/menu');

  db.prepare(`
    UPDATE menu_categories
    SET slug = ?, name_fr = ?, name_en = ?, name_it = ?,
        description_fr = ?, description_en = ?, description_it = ?,
        display_order = ?, is_visible = ?
    WHERE id = ?
  `).run(
    slug, name_fr,
    str(req.body.name_en, 120), str(req.body.name_it, 120),
    str(req.body.description_fr, 1000), str(req.body.description_en, 1000), str(req.body.description_it, 1000),
    intIn(req.body.display_order, 0, 0, 9999),
    bool(req.body.is_visible) ? 1 : 0,
    id,
  );

  logActivity(req, { action: 'update', entity: 'menu_category', entityId: id });
  res.redirect('/admin/menu?saved=1');
});

router.post('/menu/categories/:id/delete', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/menu');

  const items = db.prepare('SELECT image_path FROM menu_items WHERE category_id = ?').all(id);
  for (const it of items) if (it.image_path) deleteUpload(it.image_path);
  db.prepare('DELETE FROM menu_categories WHERE id = ?').run(id);
  logActivity(req, { action: 'delete', entity: 'menu_category', entityId: id });
  res.redirect('/admin/menu?saved=1');
});

// ─── MENU : ITEMS ───────────────────────────────────────────────────────────
router.get('/menu/items/new', (req, res) => {
  const categories = db.prepare('SELECT * FROM menu_categories ORDER BY display_order, id').all();
  res.render('admin/menu-item-form', {
    layout: 'layouts/admin',
    page: 'menu',
    categories,
    item: null,
    action: '/admin/menu/items',
  });
});

router.get('/menu/items/:id/edit', (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/menu');
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  if (!item) return res.redirect('/admin/menu');
  const categories = db.prepare('SELECT * FROM menu_categories ORDER BY display_order, id').all();
  res.render('admin/menu-item-form', {
    layout: 'layouts/admin',
    page: 'menu',
    categories,
    item,
    action: `/admin/menu/items/${id}`,
  });
});

router.post('/menu/items',
  upload.single('image'),
  verifyCsrf,
  processImages,
  (req, res) => {
    const b = req.body;
    const category_id = intIn(b.category_id, 0, 1, 2147483647);
    const name_fr = reqStr(b.name_fr, 200);
    if (!category_id || !name_fr) return res.redirect('/admin/menu');

    const imageUrl = req.processedFile?.url || null;

    const result = db.prepare(`
      INSERT INTO menu_items
        (category_id, name_fr, name_en, name_it, description_fr, description_en, description_it,
         price, image_path, is_veggie, is_featured, is_visible, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category_id,
      name_fr, str(b.name_en, 200), str(b.name_it, 200),
      str(b.description_fr, 1000), str(b.description_en, 1000), str(b.description_it, 1000),
      reqStr(b.price, 30),
      imageUrl,
      bool(b.is_veggie) ? 1 : 0,
      bool(b.is_featured) ? 1 : 0,
      bool(b.is_visible) ? 1 : 0,
      intIn(b.display_order, 0, 0, 9999),
    );

    logActivity(req, { action: 'create', entity: 'menu_item', entityId: result.lastInsertRowid, details: { name: name_fr } });
    res.redirect('/admin/menu?saved=1');
  }
);

router.post('/menu/items/:id',
  upload.single('image'),
  verifyCsrf,
  processImages,
  (req, res) => {
    const id = intIn(req.params.id, 0, 1, 2147483647);
    if (!id) return res.redirect('/admin/menu');

    const b = req.body;
    const category_id = intIn(b.category_id, 0, 1, 2147483647);
    const name_fr = reqStr(b.name_fr, 200);
    if (!category_id || !name_fr) return res.redirect('/admin/menu');

    const current = db.prepare('SELECT image_path FROM menu_items WHERE id = ?').get(id);
    if (!current) return res.redirect('/admin/menu');

    let imageUrl = current.image_path;
    if (req.processedFile?.url) {
      if (current.image_path) deleteUpload(current.image_path);
      imageUrl = req.processedFile.url;
    } else if (bool(b.remove_image)) {
      if (current.image_path) deleteUpload(current.image_path);
      imageUrl = null;
    }

    db.prepare(`
      UPDATE menu_items SET
        category_id = ?, name_fr = ?, name_en = ?, name_it = ?,
        description_fr = ?, description_en = ?, description_it = ?,
        price = ?, image_path = ?,
        is_veggie = ?, is_featured = ?, is_visible = ?, display_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      category_id,
      name_fr, str(b.name_en, 200), str(b.name_it, 200),
      str(b.description_fr, 1000), str(b.description_en, 1000), str(b.description_it, 1000),
      reqStr(b.price, 30), imageUrl,
      bool(b.is_veggie) ? 1 : 0,
      bool(b.is_featured) ? 1 : 0,
      bool(b.is_visible) ? 1 : 0,
      intIn(b.display_order, 0, 0, 9999),
      id,
    );

    logActivity(req, { action: 'update', entity: 'menu_item', entityId: id, details: { name: name_fr } });
    res.redirect('/admin/menu?saved=1');
  }
);

router.post('/menu/items/:id/delete', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/menu');
  const item = db.prepare('SELECT image_path, name_fr FROM menu_items WHERE id = ?').get(id);
  if (item?.image_path) deleteUpload(item.image_path);
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
  logActivity(req, { action: 'delete', entity: 'menu_item', entityId: id, details: { name: item?.name_fr } });
  res.redirect('/admin/menu?saved=1');
});

// ─── GALERIE ────────────────────────────────────────────────────────────────
router.get('/gallery', (req, res) => {
  const photos = db.prepare('SELECT * FROM gallery ORDER BY display_order ASC, id ASC').all();
  res.render('admin/gallery', {
    layout: 'layouts/admin',
    page: 'gallery',
    photos,
    flash: req.query.saved ? 'Modifications enregistrées' : null,
  });
});

router.post('/gallery',
  upload.array('images', 12),
  verifyCsrf,
  processImages,
  (req, res) => {
    if (!req.processedFiles || !req.processedFiles.length) return res.redirect('/admin/gallery');

    const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM gallery').get().m || 0;
    const stmt = db.prepare('INSERT INTO gallery (image_path, display_order) VALUES (?, ?)');
    const tx = db.transaction(() => {
      req.processedFiles.forEach((f, i) => {
        stmt.run(f.url, maxOrder + i + 1);
      });
    });
    tx();

    logActivity(req, { action: 'create', entity: 'gallery', details: { count: req.processedFiles.length } });
    res.redirect('/admin/gallery?saved=1');
  }
);

router.post('/gallery/reorder', express.json(), verifyCsrf, (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  if (order.length > 500) return res.status(400).json({ error: 'too_many' });
  const stmt = db.prepare('UPDATE gallery SET display_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    order.forEach((id, idx) => {
      const n = intIn(id, 0, 1, 2147483647);
      if (n) stmt.run(idx, n);
    });
  });
  tx();
  logActivity(req, { action: 'reorder', entity: 'gallery' });
  res.json({ ok: true });
});

router.post('/gallery/:id', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/gallery');
  db.prepare(`
    UPDATE gallery SET caption_fr = ?, caption_en = ?, caption_it = ?, display_order = ?, is_visible = ?
    WHERE id = ?
  `).run(
    str(req.body.caption_fr, 200), str(req.body.caption_en, 200), str(req.body.caption_it, 200),
    intIn(req.body.display_order, 0, 0, 9999),
    bool(req.body.is_visible) ? 1 : 0,
    id,
  );
  logActivity(req, { action: 'update', entity: 'gallery', entityId: id });
  res.redirect('/admin/gallery?saved=1');
});

router.post('/gallery/:id/delete', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/gallery');
  const photo = db.prepare('SELECT image_path FROM gallery WHERE id = ?').get(id);
  if (photo?.image_path) deleteUpload(photo.image_path);
  db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  logActivity(req, { action: 'delete', entity: 'gallery', entityId: id });
  res.redirect('/admin/gallery?saved=1');
});

// ─── AVIS ───────────────────────────────────────────────────────────────────
router.get('/reviews', (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews ORDER BY display_order ASC, id ASC').all();
  res.render('admin/reviews', {
    layout: 'layouts/admin',
    page: 'reviews',
    reviews,
    flash: req.query.saved ? 'Modifications enregistrées' : null,
  });
});

router.post('/reviews', verifyCsrf, (req, res) => {
  const author = reqStr(req.body.author, 80);
  const content_fr = reqStr(req.body.content_fr, 1500);
  if (!author || !content_fr) return res.redirect('/admin/reviews');
  const result = db.prepare(`
    INSERT INTO reviews (author, source, rating, content_fr, content_en, content_it, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    author,
    str(req.body.source, 60),
    intIn(req.body.rating, 5, 1, 5),
    content_fr,
    str(req.body.content_en, 1500), str(req.body.content_it, 1500),
    intIn(req.body.display_order, 0, 0, 9999),
  );
  logActivity(req, { action: 'create', entity: 'review', entityId: result.lastInsertRowid });
  res.redirect('/admin/reviews?saved=1');
});

router.post('/reviews/:id', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/reviews');
  const author = reqStr(req.body.author, 80);
  const content_fr = reqStr(req.body.content_fr, 1500);
  if (!author || !content_fr) return res.redirect('/admin/reviews');
  db.prepare(`
    UPDATE reviews SET author = ?, source = ?, rating = ?, content_fr = ?, content_en = ?, content_it = ?, display_order = ?, is_visible = ?
    WHERE id = ?
  `).run(
    author, str(req.body.source, 60),
    intIn(req.body.rating, 5, 1, 5),
    content_fr, str(req.body.content_en, 1500), str(req.body.content_it, 1500),
    intIn(req.body.display_order, 0, 0, 9999),
    bool(req.body.is_visible) ? 1 : 0,
    id,
  );
  logActivity(req, { action: 'update', entity: 'review', entityId: id });
  res.redirect('/admin/reviews?saved=1');
});

router.post('/reviews/:id/delete', verifyCsrf, (req, res) => {
  const id = intIn(req.params.id, 0, 1, 2147483647);
  if (!id) return res.redirect('/admin/reviews');
  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  logActivity(req, { action: 'delete', entity: 'review', entityId: id });
  res.redirect('/admin/reviews?saved=1');
});

// ─── LOGS ───────────────────────────────────────────────────────────────────
router.get('/logs', (req, res) => {
  const logs = getRecentLogs(200);
  res.render('admin/logs', {
    layout: 'layouts/admin',
    page: 'logs',
    logs,
  });
});

// ─── COMPTE ADMIN (changer mot de passe) ────────────────────────────────────
router.get('/account', (req, res) => {
  res.render('admin/account', {
    layout: 'layouts/admin',
    page: 'account',
    flash: req.query.saved ? 'Mot de passe modifié' : null,
    error: null,
  });
});

router.post('/account', accountLimiter, verifyCsrf, async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { current_password, new_password, confirm_password } = req.body || {};

  const errorView = (msg) => res.render('admin/account', {
    layout: 'layouts/admin', page: 'account', flash: null, error: msg,
  });

  if (typeof current_password !== 'string' || typeof new_password !== 'string' ||
      typeof confirm_password !== 'string' ||
      !current_password || !new_password || !confirm_password) {
    return errorView('Tous les champs sont requis.');
  }
  if (new_password.length < 10 || new_password.length > 256) {
    return errorView('Le nouveau mot de passe doit faire entre 10 et 256 caractères.');
  }
  if (new_password !== confirm_password) {
    return errorView('Les deux nouveaux mots de passe ne correspondent pas.');
  }
  if (new_password === current_password) {
    return errorView('Le nouveau mot de passe doit être différent de l\'actuel.');
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.admin.id);
  if (!admin) return errorView('Compte introuvable.');

  const valid = await bcrypt.compare(current_password, admin.password_hash);
  if (!valid) {
    logActivity(req, { action: 'password_change_failed', entity: 'admin', entityId: admin.id });
    return errorView('Mot de passe actuel incorrect.');
  }

  const newHash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, admin.id);

  logActivity(req, { action: 'update', entity: 'admin_password', entityId: admin.id });

  // Régénère la session (anti session-fixation après reprise de compte) et le
  // token CSRF. L'utilisateur reste connecté sur cette session uniquement.
  const adminSnapshot = { id: admin.id, username: admin.username };
  req.session.regenerate((err) => {
    if (err) {
      console.error('[account] session regenerate failed:', err);
      return res.status(500).send('Erreur de session');
    }
    req.session.admin = adminSnapshot;
    rotateCsrf(req);
    req.session.save(() => res.redirect('/admin/account?saved=1'));
  });
});

module.exports = router;
