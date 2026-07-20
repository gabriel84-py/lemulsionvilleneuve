/**
 * Seed script — Initialise la base avec les données de L'Émulsion
 * Idempotent : peut être ré-exécuté sans casser les données utilisateur.
 *
 * Usage : npm run seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db/database');
const { setSetting, getSetting } = require('../src/utils/settings');
const { categories: MENU_CATEGORIES, items: MENU_ITEMS } = require('./menu-data');

// ─── 1. ADMIN ────────────────────────────────────────────────────────────────
async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme';

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    console.log(`✓ Admin "${username}" déjà existant — skip`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`✓ Admin "${username}" créé`);
  if (password === 'changeme' || password === 'change_this_password_immediately') {
    console.log(`  ⚠  Mot de passe par défaut détecté. Changez-le sur /admin/account dès la première connexion.`);
  }
}

// ─── 2. SETTINGS ─────────────────────────────────────────────────────────────
function seedSettings() {
  const isFirstSeed = !getSetting('restaurant_name');

  if (!isFirstSeed) {
    console.log('✓ Settings déjà initialisés — skip (pour réinitialiser, supprimez data/lemulsion.db)');
    return;
  }

  const settings = {
    restaurant_name: 'L\'Émulsion',
    phone: '+33 4 90 02 05 39',
    email: 'contact@lemulsion-villeneuve.fr',
    address_street: '1 rue de l\'Hôpital',
    address_postal: '30400',
    address_city: 'Villeneuve-lès-Avignon',
    // Coordonnées de la Collégiale (repère central sous les arcades)
    geo_lat: '43.9660',
    geo_lng: '4.7970',
    social_instagram: 'https://www.instagram.com/lemulsionvilleneuve/',
    social_facebook: 'https://www.facebook.com/p/L%C3%A9mulsion-Villeneuve-100063723782861/',
    social_google_maps: 'https://www.google.com/maps/search/?api=1&query=L%27%C3%89mulsion+Villeneuve-l%C3%A8s-Avignon',
    rating_value: '4.8',
    rating_count: '126',
    announcement_active: '0',
    legal_siret: '',
    legal_host: '',
    meta_description: 'L\'Émulsion, restaurant bistronomique à Villeneuve-lès-Avignon. Cuisine française et provençale, produits du marché, par le chef Damien Chocano. Table gourmande Gault&Millau, n°1 sur TripAdvisor.',
  };

  for (const [key, value] of Object.entries(settings)) {
    setSetting(key, value);
  }

  // Champs traduits
  setSetting('hero_title', {
    fr: 'Bistronomie sous les arcades',
    en: 'Bistronomy under the arcades',
    it: 'Bistronomia sotto i portici',
  });

  setSetting('hero_subtitle', {
    fr: 'Une carte courte, composée chaque matin au marché. Cuisine française sensible et généreuse, sous la voûte du 1 rue de l\'Hôpital, face à la Collégiale.',
    en: 'A short menu, composed every morning at the market. Honest, generous French cooking under the vaults of 1 rue de l\'Hôpital, facing the Collegiate church.',
    it: 'Una carta breve, composta ogni mattina al mercato. Cucina francese sincera e generosa, sotto le volte del 1 rue de l\'Hôpital, di fronte alla Collegiata.',
  });

  setSetting('about_title', {
    fr: 'La cuisine, comme une émulsion',
    en: 'Cooking, like an emulsion',
    it: 'La cucina, come un\'emulsione',
  });

  setSetting('about_text', {
    fr: 'L\'Émulsion, c\'est l\'histoire d\'un chef, Damien Chocano, et d\'une adresse chargée d\'histoire. Passé par un étoilé de Stockholm puis par la cuisine des frères Pourcel au Maroc, il pose ses cocottes à Villeneuve en 2019, avant de reprendre en février 2024 le mythique 1 rue de l\'Hôpital — la maison Aubertin, fermée depuis quatorze ans.\n\nIci, la carte est courte, elle change tous les jours au retour du MIN d\'Avignon — 95 % des produits sont sourcés à quelques kilomètres. La cuisine tient d\'un souvenir : celui d\'un velouté de fèves suédois, servi jadis par un mentor, qui lui inspira le nom de la maison. Cette sensation de bulles qui explosent en bouche est devenue une manière de faire : des techniques modernes au service d\'une cuisine sensible, où les produits, parfois oubliés ou mal-aimés, retrouvent leur juste place.\n\nSous la voûte du XVIIᵉ siècle, on est trente-deux à table ; trente de plus sur la terrasse ombragée, face à la Collégiale.',
    en: 'L\'Émulsion is the story of a chef, Damien Chocano, and a place steeped in history. After a Michelin-starred kitchen in Stockholm and time with the Pourcel brothers in Morocco, he settled in Villeneuve in 2019, before taking over the legendary 1 rue de l\'Hôpital in February 2024 — the former Aubertin, closed for fourteen years.\n\nHere, the menu is short and changes every day, drawn from the morning market in Avignon — 95% of the produce comes from just a few kilometres away. The cooking is rooted in a memory: a Swedish broad bean velouté, once served by a mentor, which gave the house its name. That sensation of bubbles bursting in the mouth has become a way of working — modern techniques at the service of a sensitive cuisine, where ingredients, sometimes overlooked, find their rightful place.\n\nUnder the 17th-century vault, thirty-two seats indoors; thirty more on the shaded terrace, facing the Collegiate church.',
    it: 'L\'Émulsion è la storia di uno chef, Damien Chocano, e di un indirizzo carico di storia. Passato per una stella Michelin a Stoccolma e per la cucina dei fratelli Pourcel in Marocco, si è stabilito a Villeneuve nel 2019, prima di rilevare nel febbraio 2024 il mitico 1 rue de l\'Hôpital — l\'ex Aubertin, chiuso da quattordici anni.\n\nQui, la carta è breve e cambia ogni giorno al ritorno dal mercato di Avignone — il 95% dei prodotti proviene da pochi chilometri. La cucina nasce da un ricordo: quello di una vellutata di fave svedese, servita un tempo da un mentore, che ha ispirato il nome della casa. Quella sensazione di bolle che esplodono in bocca è diventata un modo di lavorare — tecniche moderne al servizio di una cucina sensibile, dove i prodotti, a volte dimenticati, ritrovano il loro giusto posto.\n\nSotto la volta del XVII secolo, trentadue coperti in sala; trenta in più sulla terrazza ombreggiata, di fronte alla Collegiata.',
  });

  setSetting('announcement_text', { fr: '', en: '', it: '' });

  console.log('✓ Settings initialisés (L\'Émulsion)');
}

// ─── 3. HORAIRES ─────────────────────────────────────────────────────────────
function seedHours() {
  const count = db.prepare('SELECT COUNT(*) as c FROM opening_hours').get().c;
  if (count > 0) {
    console.log('✓ Horaires déjà présents — skip');
    return;
  }

  // 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam
  // L'Émulsion : Mardi → Samedi, midi & soir. Fermé dimanche & lundi.
  //   Midi : 12h00–14h00
  //   Soir : 19h30–21h30
  const hours = [
    // Dimanche — fermé
    { d: 0, s: 'lunch', closed: 1, opens: null, closes: null },
    { d: 0, s: 'dinner', closed: 1, opens: null, closes: null },
    // Lundi — fermé
    { d: 1, s: 'lunch', closed: 1, opens: null, closes: null },
    { d: 1, s: 'dinner', closed: 1, opens: null, closes: null },
    // Mardi
    { d: 2, s: 'lunch', closed: 0, opens: '12:00', closes: '14:00' },
    { d: 2, s: 'dinner', closed: 0, opens: '19:30', closes: '21:30' },
    // Mercredi
    { d: 3, s: 'lunch', closed: 0, opens: '12:00', closes: '14:00' },
    { d: 3, s: 'dinner', closed: 0, opens: '19:30', closes: '21:30' },
    // Jeudi
    { d: 4, s: 'lunch', closed: 0, opens: '12:00', closes: '14:00' },
    { d: 4, s: 'dinner', closed: 0, opens: '19:30', closes: '21:30' },
    // Vendredi
    { d: 5, s: 'lunch', closed: 0, opens: '12:00', closes: '14:00' },
    { d: 5, s: 'dinner', closed: 0, opens: '19:30', closes: '21:30' },
    // Samedi
    { d: 6, s: 'lunch', closed: 0, opens: '12:00', closes: '14:00' },
    { d: 6, s: 'dinner', closed: 0, opens: '19:30', closes: '21:30' },
  ];

  const stmt = db.prepare(`
    INSERT INTO opening_hours (day_of_week, service, opens, closes, is_closed)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    hours.forEach((h) => stmt.run(h.d, h.s, h.opens, h.closes, h.closed));
  });
  tx();
  console.log(`✓ ${hours.length} créneaux d'horaires créés`);
}

// ─── 4. CATÉGORIES ───────────────────────────────────────────────────────────
function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) as c FROM menu_categories').get().c;
  if (count > 0) {
    console.log('✓ Catégories déjà présentes — skip');
    return null;
  }

  const stmt = db.prepare(`
    INSERT INTO menu_categories (slug, name_fr, name_en, name_it, description_fr, description_en, description_it, display_order, is_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const tx = db.transaction(() => {
    MENU_CATEGORIES.forEach((c) => {
      stmt.run(c.slug, c.name_fr, c.name_en, c.name_it, c.description_fr, c.description_en, c.description_it, c.display_order);
    });
  });
  tx();
  console.log(`✓ ${MENU_CATEGORIES.length} catégories créées`);
  return true;
}

// ─── 5. PLATS ────────────────────────────────────────────────────────────────
function seedItems() {
  const cats = db.prepare('SELECT id, slug FROM menu_categories').all();
  const catBySlug = {};
  cats.forEach((c) => { catBySlug[c.slug] = c.id; });

  const stmt = db.prepare(`
    INSERT INTO menu_items
      (category_id, name_fr, name_en, name_it, description_fr, description_en, description_it, price, is_veggie, is_featured, is_visible, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const tx = db.transaction(() => {
    MENU_ITEMS.forEach((i) => {
      const catId = catBySlug[i.cat];
      if (!catId) {
        console.warn(`  ⚠ Catégorie "${i.cat}" introuvable, skip "${i.name_fr}"`);
        return;
      }
      stmt.run(
        catId,
        i.name_fr, i.name_en, i.name_it,
        i.desc_fr, i.desc_en, i.desc_it,
        i.price,
        i.veggie ? 1 : 0,
        i.featured ? 1 : 0,
        i.order || 0
      );
    });
  });
  tx();
  console.log(`✓ ${MENU_ITEMS.length} plats créés`);
}

// ─── 6. AVIS ─────────────────────────────────────────────────────────────────
function seedReviews() {
  const count = db.prepare('SELECT COUNT(*) as c FROM reviews').get().c;
  if (count > 0) {
    console.log('✓ Avis déjà présents — skip');
    return;
  }

  // Verbatims issus de TripAdvisor et de la presse locale.
  const reviews = [
    {
      author: 'Frédéric D.',
      source: 'TripAdvisor',
      rating: 5,
      content_fr: 'Chaque plat était une véritable explosion de saveurs, une découverte exceptionnelle. Le chef a une vraie main, la carte est courte mais chaque assiette est pensée.',
      content_en: 'Every dish was a real explosion of flavours, an exceptional discovery. The chef has a real hand, the menu is short but every plate is considered.',
      content_it: 'Ogni piatto è stata una vera esplosione di sapori, una scoperta eccezionale. Lo chef ha una vera mano, la carta è breve ma ogni piatto è pensato.',
    },
    {
      author: 'Jeff V.',
      source: 'TripAdvisor',
      rating: 5,
      content_fr: 'Cuisine inventive, présentation extrêmement soignée. De la vraie bistronomie, dans la meilleure adresse du village. On y revient.',
      content_en: 'Inventive cooking, extremely careful presentation. True bistronomy, in the best address in the village. We\'ll be back.',
      content_it: 'Cucina inventiva, presentazione estremamente curata. Vera bistronomia, nel miglior indirizzo del paese. Ci torneremo.',
    },
    {
      author: 'Aude L.',
      source: 'TripAdvisor',
      rating: 5,
      content_fr: 'Belle expérience avec une cuisine raffinée et pleine de goût. Le service est aux petits soins, sans jamais être pesant. La terrasse face à la Collégiale, un plaisir.',
      content_en: 'A beautiful experience with refined, flavourful cuisine. The service is attentive without ever being oppressive. The terrace facing the Collegiate is a pleasure.',
      content_it: 'Bella esperienza con una cucina raffinata e piena di gusto. Il servizio è attento senza mai essere pesante. La terrazza di fronte alla Collegiata è un piacere.',
    },
    {
      author: 'Camille M.',
      source: 'Google',
      rating: 5,
      content_fr: 'Les assiettes sont généreuses, la carte des vins sublime et le service ultra professionnel sans être pesant. Un vrai coup de cœur à Villeneuve.',
      content_en: 'The plates are generous, the wine list sublime and the service ultra-professional without being heavy-handed. A real crush in Villeneuve.',
      content_it: 'I piatti sono generosi, la carta dei vini è sublime e il servizio è ultra professionale senza essere pesante. Un vero colpo di fulmine a Villeneuve.',
    },
    {
      author: 'traveler_PMO',
      source: 'TripAdvisor',
      rating: 5,
      content_fr: 'Accueil chaleureux, plats préparés du jour, parfaitement présentés. On sent le produit frais, le geste juste. Une adresse à ne pas manquer.',
      content_en: 'Warm welcome, freshly prepared daily dishes, perfectly presented. You can feel the fresh produce, the right gesture. Not to be missed.',
      content_it: 'Accoglienza calorosa, piatti preparati al giorno, presentati alla perfezione. Si sente il prodotto fresco, il gesto giusto. Un indirizzo da non perdere.',
    },
    {
      author: 'kokosandiego',
      source: 'TripAdvisor',
      rating: 5,
      content_fr: 'Cuisine délicieuse, joliment présentée, accompagnée de vins locaux bien choisis. Nous avons passé une soirée mémorable.',
      content_en: 'Delicious food, beautifully presented, paired with well-chosen local wines. We had a memorable evening.',
      content_it: 'Cibo delizioso, splendidamente presentato, abbinato a vini locali ben scelti. Abbiamo trascorso una serata memorabile.',
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO reviews (author, source, rating, content_fr, content_en, content_it, display_order, is_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  reviews.forEach((r, i) => {
    stmt.run(r.author, r.source, r.rating, r.content_fr, r.content_en, r.content_it, i);
  });
  console.log(`✓ ${reviews.length} avis ajoutés`);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n✦ L\'Émulsion — Seed\n');

  await seedAdmin();
  seedSettings();
  seedHours();
  seedCategories();
  seedItems();
  seedReviews();

  console.log('\n✓ Seed terminé.\n');
  console.log('Étapes suivantes :');
  console.log('  1. Démarrer le serveur : npm run dev (ou npm start en prod)');
  console.log('  2. Visiter le site : http://localhost:3000');
  console.log('  3. Se connecter à l\'admin : http://localhost:3000/admin/login');
  console.log(`     Identifiant : ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log(`     Mot de passe : voir .env`);
  console.log('  4. ⚠  Changer le mot de passe immédiatement sur /admin/account\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
