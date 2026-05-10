/**
 * i18n middleware : charge les traductions et expose `t()` aux templates
 */
const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGS = ['fr', 'en', 'it'];
const DEFAULT_LANG = 'fr';

const translations = {};
for (const lang of SUPPORTED_LANGS) {
  const filePath = path.join(__dirname, '..', '..', 'locales', `${lang}.json`);
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Récupère une clé dans les traductions (notation pointée : "nav.home")
 */
function getKey(obj, key) {
  return key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
}

/**
 * Détecte la langue préférée (cookie > Accept-Language > default)
 */
function detectLang(req) {
  // 1. Cookie
  const cookieLang = req.cookies?.lang;
  if (cookieLang && SUPPORTED_LANGS.includes(cookieLang)) return cookieLang;

  // 2. Query param ?lang=xx
  const qLang = req.query?.lang;
  if (qLang && SUPPORTED_LANGS.includes(qLang)) return qLang;

  // 3. Accept-Language header
  const accept = req.headers['accept-language'] || '';
  for (const part of accept.split(',')) {
    const code = part.trim().split(';')[0].slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.includes(code)) return code;
  }

  return DEFAULT_LANG;
}

/**
 * Middleware Express : injecte `lang` et `t()` dans res.locals
 */
function i18nMiddleware(req, res, next) {
  const lang = detectLang(req);
  res.locals.lang = lang;
  res.locals.SUPPORTED_LANGS = SUPPORTED_LANGS;

  res.locals.t = function (key, params = {}) {
    let value = getKey(translations[lang], key);
    if (value == null) value = getKey(translations[DEFAULT_LANG], key);
    if (value == null) return key;
    if (typeof value === 'string' && Object.keys(params).length) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return value;
  };

  // Helper pour traduire un objet {fr, en, it} stocké en DB
  res.locals.tr = function (obj) {
    if (!obj) return '';
    if (typeof obj === 'string') {
      // Tenter parse JSON
      try {
        const parsed = JSON.parse(obj);
        if (typeof parsed === 'object') return parsed[lang] || parsed.fr || parsed.en || '';
      } catch {
        return obj;
      }
    }
    if (typeof obj === 'object') return obj[lang] || obj.fr || obj.en || '';
    return String(obj);
  };

  next();
}

module.exports = { i18nMiddleware, SUPPORTED_LANGS, DEFAULT_LANG, translations };
