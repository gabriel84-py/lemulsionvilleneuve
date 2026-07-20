/**
 * Database connection + schema initialization
 * SQLite via better-sqlite3 (synchronous, fast)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'lemulsion.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys + WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── SCHEMA ─────────────────────────────────────────────────────────────────
const schema = `
-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Site settings (key-value, multi-langue via JSON)
-- Pour les valeurs traduites, on stocke un JSON {fr: ..., en: ..., it: ...}
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_json INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Horaires
CREATE TABLE IF NOT EXISTS opening_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  service TEXT NOT NULL CHECK(service IN ('lunch', 'dinner')),
  opens TEXT,
  closes TEXT,
  is_closed INTEGER DEFAULT 0,
  UNIQUE(day_of_week, service)
);

-- Catégories du menu (Smash Burgers, Tacos, etc.)
CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_it TEXT,
  description_fr TEXT,
  description_en TEXT,
  description_it TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1
);

-- Plats
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  name_it TEXT,
  description_fr TEXT,
  description_en TEXT,
  description_it TEXT,
  price TEXT NOT NULL, -- string pour gérer "9 €" "8,90 €" etc.
  image_path TEXT,
  is_veggie INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
);

-- Galerie photos
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_path TEXT NOT NULL,
  caption_fr TEXT,
  caption_en TEXT,
  caption_it TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Avis clients (verbatims)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  source TEXT, -- "Google", "TripAdvisor", etc.
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  content_fr TEXT NOT NULL,
  content_en TEXT,
  content_it TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Logs des modifications
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  admin_username TEXT,
  action TEXT NOT NULL, -- "create", "update", "delete", "login"
  entity TEXT NOT NULL, -- "menu_item", "settings", "hours", etc.
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_visible ON menu_items(is_visible);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
`;

db.exec(schema);

module.exports = db;
