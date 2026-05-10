/**
 * Routes publiques : pages visibles par les visiteurs
 */
const express = require('express');
const router = express.Router();

const db = require('../db/database');
const { getAllSettings } = require('../utils/settings');
const { getAllHours, getCurrentStatus } = require('../utils/hours');
const { SUPPORTED_LANGS } = require('../middleware/i18n');

// Helper : récupère toutes les données du site nécessaires aux pages
function getSiteData(lang) {
  const settings = getAllSettings();

  const categories = db.prepare(`
    SELECT * FROM menu_categories
    WHERE is_visible = 1
    ORDER BY display_order ASC, id ASC
  `).all();

  const items = db.prepare(`
    SELECT * FROM menu_items
    WHERE is_visible = 1
    ORDER BY display_order ASC, id ASC
  `).all();

  // Group items by category
  const menu = categories.map((cat) => ({
    ...cat,
    items: items.filter((it) => it.category_id === cat.id),
  }));

  const featured = items.filter((it) => it.is_featured);

  const gallery = db.prepare(`
    SELECT * FROM gallery
    WHERE is_visible = 1
    ORDER BY display_order ASC, id ASC
  `).all();

  const reviews = db.prepare(`
    SELECT * FROM reviews
    WHERE is_visible = 1
    ORDER BY display_order ASC, id ASC
  `).all();

  const hours = getAllHours(lang);
  const status = getCurrentStatus(lang);

  return { settings, menu, featured, gallery, reviews, hours, status };
}

// Sélection de langue (pose un cookie et redirige)
router.get('/lang/:code', (req, res) => {
  const code = req.params.code;
  if (SUPPORTED_LANGS.includes(code)) {
    res.cookie('lang', code, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
    });
  }
  const back = req.headers.referer || '/';
  res.redirect(back);
});

// Page d'accueil
router.get('/', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/home', {
    page: 'home',
    ...data,
  });
});

// Page menu (carte complète)
router.get('/menu', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/menu', {
    page: 'menu',
    ...data,
  });
});

// Page galerie
router.get('/galerie', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/gallery', {
    page: 'gallery',
    ...data,
  });
});

// Page avis clients
router.get('/avis', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/reviews', {
    page: 'reviews',
    ...data,
  });
});

// Page contact
router.get('/contact', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/contact', {
    page: 'contact',
    ...data,
  });
});

// Mentions légales
router.get('/mentions-legales', (req, res) => {
  const data = getSiteData(res.locals.lang);
  res.render('public/legal', {
    page: 'legal',
    ...data,
  });
});

// Endpoint JSON-LD pour SEO (généré dynamiquement)
router.get('/structured-data.json', (req, res) => {
  const settings = getAllSettings();
  const reviews = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE is_visible = 1').get();

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings.restaurant_name || 'Street Food Vla',
    image: `${process.env.PUBLIC_URL || ''}/images/logo.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address_street || '',
      addressLocality: settings.address_city || '',
      postalCode: settings.address_postal || '',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: parseFloat(settings.geo_lat) || 0,
      longitude: parseFloat(settings.geo_lng) || 0,
    },
    telephone: settings.phone || '',
    email: settings.email || '',
    servesCuisine: ['Burger', 'Tacos', 'American', 'French'],
    priceRange: '€€',
    sameAs: [settings.social_instagram, settings.social_facebook, settings.social_ubereats].filter(Boolean),
  };

  res.json(jsonld);
});

module.exports = router;
