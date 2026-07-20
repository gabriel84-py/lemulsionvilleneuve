/**
 * Import de photos dans la galerie
 *
 * Lit tous les fichiers image dans `public/uploads/gallery-tmp/`, les convertit
 * en WebP (max 1600px, qualité 82) et les stocke dans `public/uploads/`, puis
 * les insère dans la table `gallery` avec un ordre séquentiel.
 *
 * Le dossier gallery-tmp/ est ensuite laissé tel quel (à supprimer manuellement
 * quand tu es content du résultat, ou à re-scanner pour ajouter de nouvelles
 * photos).
 *
 * Usage : npm run import-gallery
 * Options :
 *   --reset   Vide la galerie existante avant l'import
 *   --dir=X   Utilise un dossier source autre que public/uploads/gallery-tmp
 *
 * Ex : npm run import-gallery -- --reset
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const db = require('../src/db/database');

const ROOT = path.join(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');

const args = process.argv.slice(2);
const doReset = args.includes('--reset');
const dirArg = args.find((a) => a.startsWith('--dir='));
const SRC_DIR = dirArg
  ? path.resolve(dirArg.slice('--dir='.length))
  : path.join(UPLOAD_DIR, 'gallery-tmp');

// Métadonnées descriptives (facultatives) : indexées par un motif dans le nom
// du fichier source. Les fichiers qui ne matchent aucun motif prennent une
// caption par défaut.
const CAPTIONS = [
  { match: /interior|salle|cave|voute|arcade/i, fr: 'Sous la voûte du XVIIᵉ siècle', en: 'Under the 17th-century vault', it: 'Sotto la volta del XVII secolo' },
  { match: /cheesecake/i, fr: 'Cheesecake au basilic, fraises de Carpentras', en: 'Basil cheesecake, Carpentras strawberries', it: 'Cheesecake al basilico, fragole di Carpentras' },
  { match: /tiramisu/i, fr: 'Tiramisu, revisite maison', en: 'Tiramisu, house revisit', it: 'Tiramisù, rivisitazione della casa' },
  { match: /mussel|moule/i, fr: 'Moules du moment, retour du MIN', en: 'Mussels of the moment, from the market', it: 'Cozze del momento, dal mercato' },
  { match: /seafood|fish|poisson/i, fr: 'Poisson de ligne, sauce du jour', en: 'Line-caught fish, sauce of the day', it: 'Pesce di lenza, salsa del giorno' },
  { match: /meal|plat|dish/i, fr: 'Assiette du chef', en: "Chef's plate", it: 'Piatto dello chef' },
  { match: /menu/i, fr: 'La carte du jour', en: 'Today\'s menu', it: 'La carta del giorno' },
  { match: /food/i, fr: 'Produit du marché, minute', en: 'Market produce, à la minute', it: 'Prodotto del mercato, al momento' },
];
const DEFAULT_CAPTION = {
  fr: 'Une signature de la maison',
  en: 'A signature of the house',
  it: 'Una firma della casa',
};

function captionFor(sourceName) {
  for (const c of CAPTIONS) {
    if (c.match.test(sourceName)) return { fr: c.fr, en: c.en, it: c.it };
  }
  return DEFAULT_CAPTION;
}

async function main() {
  console.log('\n✦ L\'Émulsion — Import galerie\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Dossier source introuvable : ${SRC_DIR}`);
    console.error('   Créez-le et placez-y vos photos, ou passez --dir=/chemin/vers/photos');
    process.exit(1);
  }

  if (doReset) {
    const removed = db.prepare('SELECT image_path FROM gallery').all();
    for (const row of removed) {
      if (row.image_path && row.image_path.startsWith('/uploads/')) {
        const filepath = path.join(UPLOAD_DIR, path.basename(row.image_path));
        try { fs.unlinkSync(filepath); } catch (e) { /* ignore */ }
      }
    }
    db.prepare('DELETE FROM gallery').run();
    console.log(`✓ Galerie vidée (${removed.length} entrée(s) supprimée(s))\n`);
  }

  const files = fs.readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(f))
    .sort();

  if (!files.length) {
    console.log(`ℹ Aucune image trouvée dans ${SRC_DIR}`);
    process.exit(0);
  }

  console.log(`▸ ${files.length} image(s) à traiter depuis ${SRC_DIR}\n`);

  const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM gallery').get().m || 0;
  const insertStmt = db.prepare(`
    INSERT INTO gallery (image_path, caption_fr, caption_en, caption_it, display_order, is_visible)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const srcName = files[i];
    const srcPath = path.join(SRC_DIR, srcName);
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${hash}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await sharp(srcPath)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(filepath);

      const cap = captionFor(srcName);
      insertStmt.run(`/uploads/${filename}`, cap.fr, cap.en, cap.it, maxOrder + i + 1);

      const outSize = fs.statSync(filepath).size;
      console.log(`  ✓ ${srcName} → ${filename} (${(outSize / 1024).toFixed(1)} Ko)`);
      imported++;
    } catch (err) {
      console.warn(`  ✗ ${srcName} — ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✓ Import terminé : ${imported} image(s) importée(s)${skipped ? `, ${skipped} en erreur` : ''}.\n`);
  console.log(`  Total en galerie : ${db.prepare('SELECT COUNT(*) as c FROM gallery').get().c} photo(s).\n`);
  console.log('  → Modifier / réordonner via l\'admin : http://localhost:3000/admin/gallery\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
