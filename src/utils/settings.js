/**
 * Settings utility : key-value store pour les réglages du site
 * Supporte les valeurs traduites stockées en JSON {fr, en, it}
 */
const db = require('../db/database');

const getStmt = db.prepare('SELECT value, is_json FROM settings WHERE key = ?');
const upsertStmt = db.prepare(`
  INSERT INTO settings (key, value, is_json, updated_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_json = excluded.is_json, updated_at = CURRENT_TIMESTAMP
`);
const allStmt = db.prepare('SELECT key, value, is_json FROM settings');

function getSetting(key, defaultValue = null) {
  const row = getStmt.get(key);
  if (!row) return defaultValue;
  if (row.is_json) {
    try { return JSON.parse(row.value); } catch { return defaultValue; }
  }
  return row.value;
}

function setSetting(key, value) {
  const isJson = typeof value === 'object' && value !== null;
  const stored = isJson ? JSON.stringify(value) : String(value);
  upsertStmt.run(key, stored, isJson ? 1 : 0);
}

function getAllSettings() {
  const rows = allStmt.all();
  const out = {};
  for (const row of rows) {
    if (row.is_json) {
      try { out[row.key] = JSON.parse(row.value); } catch { out[row.key] = row.value; }
    } else {
      out[row.key] = row.value;
    }
  }
  return out;
}

/**
 * Helper : pour une valeur traduite, retourner la version dans la langue voulue
 * (avec fallback FR puis EN)
 */
function translate(jsonValue, lang = 'fr') {
  if (!jsonValue) return '';
  if (typeof jsonValue === 'string') return jsonValue;
  return jsonValue[lang] || jsonValue.fr || jsonValue.en || '';
}

module.exports = { getSetting, setSetting, getAllSettings, translate };
