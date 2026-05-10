/**
 * Upload middleware : multer + sharp
 * - Limite la taille à 8 MB
 * - Convertit en WebP avec redimensionnement (max 1600px de large)
 * - Stocke avec un nom unique
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Stockage en mémoire pour traitement par sharp
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Format d\'image non supporté (JPEG, PNG, WebP uniquement)'));
  },
});

/**
 * Middleware qui traite les fichiers uploadés et les convertit en WebP
 * Doit être appelé APRÈS multer.
 * Ajoute `req.processedFiles` = [{ originalName, path, url }]
 */
async function processImages(req, res, next) {
  try {
    const files = req.files
      ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
      : (req.file ? [req.file] : []);
    if (!files.length) return next();

    const processed = [];
    for (const file of files) {
      const hash = crypto.randomBytes(8).toString('hex');
      const filename = `${Date.now()}-${hash}.webp`;
      const filepath = path.join(UPLOAD_DIR, filename);

      await sharp(file.buffer)
        .rotate() // respect EXIF orientation
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(filepath);

      processed.push({
        originalName: file.originalname,
        filename,
        path: filepath,
        url: `/uploads/${filename}`,
      });
    }

    req.processedFiles = processed;
    if (processed.length === 1) req.processedFile = processed[0];
    next();
  } catch (err) {
    console.error('[upload] processing error:', err);
    next(err);
  }
}

/**
 * Helper : supprime un fichier upload (silencieux si n'existe pas)
 */
function deleteUpload(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const filename = path.basename(urlPath);
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filepath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('[upload] delete error:', err.message);
  });
}

module.exports = { upload, processImages, deleteUpload, UPLOAD_DIR };
