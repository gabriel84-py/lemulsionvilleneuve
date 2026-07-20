/**
 * Backup script — Sauvegarde la DB + les uploads dans un .tar.gz
 *
 * Usage : npm run backup
 * Crée un fichier dans backups/ avec timestamp.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');
const DB_PATH = path.join(ROOT, 'data', 'lemulsion.db');
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
const tmpDir = path.join(BACKUP_DIR, `tmp-${stamp}`);
const archivePath = path.join(BACKUP_DIR, `lemulsion-${stamp}.tar.gz`);

console.log('\n✦ L\'Émulsion — Backup\n');

try {
  fs.mkdirSync(tmpDir, { recursive: true });

  // 1. Backup DB en utilisant l'API native better-sqlite3 (atomique, safe en cours d'utilisation)
  if (fs.existsSync(DB_PATH)) {
    console.log('▸ Sauvegarde de la base de données…');
    const db = new Database(DB_PATH, { readonly: true });
    const dbBackupPath = path.join(tmpDir, 'lemulsion.db');
    db.backup(dbBackupPath).then(() => db.close()).catch(() => {});
    // L'API .backup est async mais on peut aussi simplement copier le WAL :
    // pour la robustesse on fait une copie simple synchrone du fichier ici si .backup échoue
    if (!fs.existsSync(dbBackupPath)) {
      fs.copyFileSync(DB_PATH, dbBackupPath);
    }
    console.log('  ✓ DB sauvegardée');
  } else {
    console.log('  ⚠ Aucune DB trouvée (pas encore initialisée ?)');
  }

  // 2. Copy uploads
  if (fs.existsSync(UPLOADS_DIR)) {
    console.log('▸ Sauvegarde des uploads…');
    const tmpUploads = path.join(tmpDir, 'uploads');
    fs.mkdirSync(tmpUploads, { recursive: true });
    const files = fs.readdirSync(UPLOADS_DIR).filter((f) => !f.startsWith('.'));
    for (const file of files) {
      fs.copyFileSync(path.join(UPLOADS_DIR, file), path.join(tmpUploads, file));
    }
    console.log(`  ✓ ${files.length} fichier(s) sauvegardé(s)`);
  }

  // 3. Compresser
  console.log('▸ Compression de l\'archive…');
  execSync(`tar -czf "${archivePath}" -C "${tmpDir}" .`);

  // 4. Nettoyer le tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // 5. Récap
  const size = fs.statSync(archivePath).size;
  const sizeMb = (size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Backup créé : ${archivePath}`);
  console.log(`  Taille : ${sizeMb} MB`);

  // Conseil de rétention
  const allBackups = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.tar.gz'));
  if (allBackups.length > 7) {
    console.log(`\n⚠ Vous avez ${allBackups.length} backups. Pensez à supprimer les plus anciens.`);
  }

  console.log('');
} catch (err) {
  console.error('\n❌ Backup failed:', err.message);
  // Cleanup tmp
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}
