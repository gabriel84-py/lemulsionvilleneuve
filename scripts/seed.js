/**
 * Seed script — Initialise la base avec les données du dossier
 * Idempotent : peut être ré-exécuté sans casser les données utilisateur
 *
 * Usage : npm run seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db/database');
const { setSetting, getSetting } = require('../src/utils/settings');

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
  // On n'écrase pas les valeurs existantes (sauf premier seed)
  const isFirstSeed = !getSetting('restaurant_name');

  if (!isFirstSeed) {
    console.log('✓ Settings déjà initialisés — skip (pour réinitialiser, supprimez data/streetfood.db)');
    return;
  }

  const settings = {
    restaurant_name: 'Street Food Vla',
    phone: '+33 9 51 74 13 57',
    email: 'streetfood30400@gmail.com',
    address_street: '17 Avenue Gabriel Péri',
    address_postal: '30400',
    address_city: 'Villeneuve-lès-Avignon',
    geo_lat: '43.9615785',
    geo_lng: '4.7995146',
    social_instagram: 'https://www.instagram.com/streetfood_vla/',
    social_facebook: 'https://www.facebook.com/streetfoodvla/',
    social_ubereats: 'https://www.ubereats.com/fr/store/street-food/RCnA9qrbV2q8yLIzRP9vyg',
    social_google_maps: 'https://www.google.com/maps/place/?q=place_id:ChIJ_____STREET_FOOD_VLA', // À mettre à jour avec le vrai place_id
    rating_value: '4.8',
    rating_count: '292',
    announcement_active: '0',
    legal_siret: '',
    legal_host: '',
  };

  for (const [key, value] of Object.entries(settings)) {
    setSetting(key, value);
  }

  // Champs traduits
  setSetting('hero_title', {
    fr: 'Smash burgers, tacos & spécialité provençale',
    en: 'Smash burgers, tacos & Provençal specialty',
    it: 'Smash burger, tacos e specialità provenzale',
  });

  setSetting('hero_subtitle', {
    fr: 'Tout est fait maison, viande Limousine française, frites de panisses. À deux pas du Pont d\'Avignon.',
    en: 'Everything is homemade, French Limousine beef, panisse fries. Steps away from the Pont d\'Avignon.',
    it: 'Tutto è fatto in casa, manzo Limousine francese, panisse fritte. A due passi dal Pont d\'Avignon.',
  });

  setSetting('about_title', {
    fr: 'Le goût du vrai fait maison',
    en: 'Real homemade taste',
    it: 'Il gusto del vero fatto in casa',
  });

  setSetting('about_text', {
    fr: 'Chez Street Food, on aime les bonnes choses. Notre viande est française race Limousine, nos frites sont coupées et dorées maison, nos sauces sont de recette secrète, et même la mousse au chocolat est faite par nos soins.\n\nAvec une touche provençale qu\'on adore — les frites de panisses, à base de farine de pois chiches — on revisite le smash burger avec gourmandise et fraîcheur. Et chaque mois, un nouveau "Daily Street Smash" sort de la cuisine.',
    en: 'At Street Food, we love good food. Our beef is French Limousine breed, our fries are cut and fried in-house, our sauces follow secret recipes, and even the chocolate mousse is made by us.\n\nWith a Provençal touch we adore — panisse fries, made from chickpea flour — we reinvent the smash burger with gourmet flair and freshness. And each month, a new "Daily Street Smash" comes out of the kitchen.',
    it: 'Da Street Food, amiamo il buon cibo. La nostra carne è di razza Limousine francese, le nostre patatine sono tagliate e fritte in casa, le nostre salse seguono ricette segrete, e persino la mousse al cioccolato è fatta da noi.\n\nCon un tocco provenzale che adoriamo — le panisse fritte, a base di farina di ceci — reinventiamo lo smash burger con gusto e freschezza. E ogni mese, un nuovo "Daily Street Smash" esce dalla cucina.',
  });

  setSetting('announcement_text', { fr: '', en: '', it: '' });

  console.log('✓ Settings initialisés');
}

// ─── 3. HORAIRES ─────────────────────────────────────────────────────────────
function seedHours() {
  const count = db.prepare('SELECT COUNT(*) as c FROM opening_hours').get().c;
  if (count > 0) {
    console.log('✓ Horaires déjà présents — skip');
    return;
  }

  // 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam
  // Selon dossier :
  // Lundi : midi 11h30-14h30 + soir 18h30-22h
  // Mar-Ven : midi 11h30-14h30 + soir 18h30-22h30
  // Sam-Dim : seulement soir 18h30-22h30
  const hours = [
    // Dimanche
    { d: 0, s: 'lunch', closed: 1, opens: null, closes: null },
    { d: 0, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
    // Lundi
    { d: 1, s: 'lunch', closed: 0, opens: '11:30', closes: '14:30' },
    { d: 1, s: 'dinner', closed: 0, opens: '18:30', closes: '22:00' },
    // Mardi
    { d: 2, s: 'lunch', closed: 0, opens: '11:30', closes: '14:30' },
    { d: 2, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
    // Mercredi
    { d: 3, s: 'lunch', closed: 0, opens: '11:30', closes: '14:30' },
    { d: 3, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
    // Jeudi
    { d: 4, s: 'lunch', closed: 0, opens: '11:30', closes: '14:30' },
    { d: 4, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
    // Vendredi
    { d: 5, s: 'lunch', closed: 0, opens: '11:30', closes: '14:30' },
    { d: 5, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
    // Samedi
    { d: 6, s: 'lunch', closed: 1, opens: null, closes: null },
    { d: 6, s: 'dinner', closed: 0, opens: '18:30', closes: '22:30' },
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
    return null; // signale qu'on ne seed pas non plus les items
  }

  const categories = [
    {
      slug: 'smash-burgers',
      name_fr: 'Smash Burgers', name_en: 'Smash Burgers', name_it: 'Smash Burger',
      description_fr: 'Buns brioché, viande Limousine française. Tout est préparé minute.',
      description_en: 'Brioche buns, French Limousine beef. Made to order.',
      description_it: 'Pane brioche, manzo Limousine francese. Preparato al momento.',
      display_order: 1,
    },
    {
      slug: 'tacos',
      name_fr: 'Tacos', name_en: 'Tacos', name_it: 'Tacos',
      description_fr: 'Galette de blé, viandes au choix, sauces maison.',
      description_en: 'Wheat tortilla, your choice of meat, homemade sauces.',
      description_it: 'Tortilla di grano, carne a scelta, salse fatte in casa.',
      display_order: 2,
    },
    {
      slug: 'accompagnements',
      name_fr: 'Accompagnements', name_en: 'Sides', name_it: 'Contorni',
      description_fr: 'Frites maison, panisses provençales, onion rings.',
      description_en: 'Homemade fries, Provençal panisses, onion rings.',
      description_it: 'Patatine fatte in casa, panisse provenzali, onion rings.',
      display_order: 3,
    },
    {
      slug: 'salades',
      name_fr: 'Salades', name_en: 'Salads', name_it: 'Insalate',
      description_fr: 'Pour les amateurs de fraîcheur.',
      description_en: 'For those who love it fresh.',
      description_it: 'Per chi ama il fresco.',
      display_order: 4,
    },
    {
      slug: 'desserts',
      name_fr: 'Desserts', name_en: 'Desserts', name_it: 'Dessert',
      description_fr: 'Faits maison, ça finit toujours mieux.',
      description_en: 'Homemade, it always finishes better.',
      description_it: 'Fatti in casa, finiscono sempre meglio.',
      display_order: 5,
    },
    {
      slug: 'boissons',
      name_fr: 'Boissons', name_en: 'Drinks', name_it: 'Bevande',
      description_fr: '',
      description_en: '',
      description_it: '',
      display_order: 6,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO menu_categories (slug, name_fr, name_en, name_it, description_fr, description_en, description_it, display_order, is_visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const tx = db.transaction(() => {
    categories.forEach((c) => {
      stmt.run(c.slug, c.name_fr, c.name_en, c.name_it, c.description_fr, c.description_en, c.description_it, c.display_order);
    });
  });
  tx();
  console.log(`✓ ${categories.length} catégories créées`);
  return true;
}

// ─── 5. PLATS ────────────────────────────────────────────────────────────────
function seedItems() {
  const cats = db.prepare('SELECT id, slug FROM menu_categories').all();
  const catBySlug = {};
  cats.forEach((c) => { catBySlug[c.slug] = c.id; });

  // Données issues du dossier (menu_street_food_vla.webp + dossier markdown)
  const items = [
    // Smash Burgers
    { cat: 'smash-burgers', name_fr: 'Smash Signature', name_en: 'Signature Smash', name_it: 'Smash Signature', desc_fr: 'Double steak smashé, cheddar fondu, oignons confits, sauce maison.', desc_en: 'Double smashed patty, melted cheddar, caramelized onions, house sauce.', desc_it: 'Doppio hamburger smashato, cheddar fuso, cipolle caramellate, salsa della casa.', price: '12,90 €', featured: 1, order: 1 },
    { cat: 'smash-burgers', name_fr: 'Daily Street Smash', name_en: 'Daily Street Smash', name_it: 'Daily Street Smash', desc_fr: 'Le burger du mois, créé par notre chef. Disponible tout le mois.', desc_en: 'Burger of the month, crafted by our chef. Available all month.', desc_it: 'Hamburger del mese, creato dal nostro chef. Disponibile tutto il mese.', price: '13,90 €', featured: 1, order: 2 },
    { cat: 'smash-burgers', name_fr: 'Cheese Smash', name_en: 'Cheese Smash', name_it: 'Cheese Smash', desc_fr: 'Steak smashé, double cheddar, cornichons, sauce signature.', desc_en: 'Smashed patty, double cheddar, pickles, signature sauce.', desc_it: 'Hamburger smashato, doppio cheddar, sottaceti, salsa signature.', price: '10,90 €', order: 3 },
    { cat: 'smash-burgers', name_fr: 'Veggie Smash', name_en: 'Veggie Smash', name_it: 'Veggie Smash', desc_fr: 'Steak végétal, cheddar, salade, tomate, oignons rouges, sauce maison.', desc_en: 'Veggie patty, cheddar, lettuce, tomato, red onions, house sauce.', desc_it: 'Hamburger vegetale, cheddar, lattuga, pomodoro, cipolle rosse, salsa della casa.', price: '11,90 €', veggie: 1, order: 4 },
    { cat: 'smash-burgers', name_fr: 'Bacon Smash', name_en: 'Bacon Smash', name_it: 'Bacon Smash', desc_fr: 'Double steak, bacon croustillant, cheddar, sauce BBQ maison.', desc_en: 'Double patty, crispy bacon, cheddar, house BBQ sauce.', desc_it: 'Doppio hamburger, bacon croccante, cheddar, salsa BBQ della casa.', price: '13,50 €', order: 5 },

    // Tacos
    { cat: 'tacos', name_fr: 'Tacos XL', name_en: 'Tacos XL', name_it: 'Tacos XL', desc_fr: 'Galette XL, 2 viandes au choix, frites, fromage fondu, sauce maison.', desc_en: 'XL tortilla, 2 meats of your choice, fries, melted cheese, house sauce.', desc_it: 'Tortilla XL, 2 carni a scelta, patatine, formaggio fuso, salsa della casa.', price: '11,50 €', featured: 1, order: 1 },
    { cat: 'tacos', name_fr: 'Tacos Classic', name_en: 'Classic Tacos', name_it: 'Tacos Classico', desc_fr: 'Galette, 1 viande, frites, fromage fondu, sauce maison.', desc_en: 'Tortilla, 1 meat, fries, melted cheese, house sauce.', desc_it: 'Tortilla, 1 carne, patatine, formaggio fuso, salsa della casa.', price: '8,90 €', order: 2 },
    { cat: 'tacos', name_fr: 'Tacos Veggie', name_en: 'Veggie Tacos', name_it: 'Tacos Veggie', desc_fr: 'Galette, légumes grillés, fromage fondu, sauce maison.', desc_en: 'Tortilla, grilled vegetables, melted cheese, house sauce.', desc_it: 'Tortilla, verdure grigliate, formaggio fuso, salsa della casa.', price: '9,50 €', veggie: 1, order: 3 },

    // Accompagnements
    { cat: 'accompagnements', name_fr: 'Frites maison', name_en: 'Homemade fries', name_it: 'Patatine fatte in casa', desc_fr: 'Coupées et dorées sur place.', desc_en: 'Cut and fried on-site.', desc_it: 'Tagliate e fritte sul posto.', price: '4,50 €', order: 1 },
    { cat: 'accompagnements', name_fr: 'Frites de panisses', name_en: 'Panisse fries', name_it: 'Panisse fritte', desc_fr: 'Spécialité provençale, à base de farine de pois chiches. Le must.', desc_en: 'Provençal specialty, made from chickpea flour. A must-try.', desc_it: 'Specialità provenzale, a base di farina di ceci. Da provare.', price: '5,50 €', veggie: 1, featured: 1, order: 2 },
    { cat: 'accompagnements', name_fr: 'Onion rings', name_en: 'Onion rings', name_it: 'Onion rings', desc_fr: 'Croustillants, panure maison.', desc_en: 'Crispy, homemade breading.', desc_it: 'Croccanti, panatura fatta in casa.', price: '5,50 €', veggie: 1, order: 3 },
    { cat: 'accompagnements', name_fr: 'Frites + Panisses', name_en: 'Fries + Panisses', name_it: 'Patatine + Panisse', desc_fr: 'Le combo gagnant.', desc_en: 'The winning combo.', desc_it: 'La combo vincente.', price: '6,50 €', veggie: 1, order: 4 },

    // Salades
    { cat: 'salades', name_fr: 'Salade César', name_en: 'Caesar Salad', name_it: 'Insalata Cesar', desc_fr: 'Salade verte, poulet grillé, parmesan, croûtons, sauce César maison.', desc_en: 'Green salad, grilled chicken, parmesan, croutons, homemade Caesar dressing.', desc_it: 'Insalata verde, pollo grigliato, parmigiano, crostini, salsa Cesar della casa.', price: '11,90 €', order: 1 },
    { cat: 'salades', name_fr: 'Salade Veggie', name_en: 'Veggie Salad', name_it: 'Insalata Veggie', desc_fr: 'Mesclun, légumes de saison, fromage, croûtons.', desc_en: 'Mixed greens, seasonal vegetables, cheese, croutons.', desc_it: 'Insalata mista, verdure di stagione, formaggio, crostini.', price: '9,90 €', veggie: 1, order: 2 },

    // Desserts
    { cat: 'desserts', name_fr: 'Mousse au chocolat maison', name_en: 'Homemade chocolate mousse', name_it: 'Mousse al cioccolato fatta in casa', desc_fr: 'La fierté de la maison. Tout en douceur.', desc_en: 'House pride. All about the smoothness.', desc_it: 'L\'orgoglio della casa. Tutta morbidezza.', price: '4,50 €', veggie: 1, order: 1 },
    { cat: 'desserts', name_fr: 'Cookie maison', name_en: 'Homemade cookie', name_it: 'Cookie fatto in casa', desc_fr: 'Pépites de chocolat, cuit du jour.', desc_en: 'Chocolate chips, baked daily.', desc_it: 'Gocce di cioccolato, cotto al giorno.', price: '3,00 €', veggie: 1, order: 2 },

    // Boissons
    { cat: 'boissons', name_fr: 'Sodas', name_en: 'Sodas', name_it: 'Bibite', desc_fr: 'Coca, Coca Zero, Fanta, Sprite, Ice Tea (33 cl).', desc_en: 'Coke, Diet Coke, Fanta, Sprite, Ice Tea (33 cl).', desc_it: 'Coca, Coca Zero, Fanta, Sprite, Ice Tea (33 cl).', price: '3,00 €', order: 1 },
    { cat: 'boissons', name_fr: 'Eau plate / gazeuse', name_en: 'Still / sparkling water', name_it: 'Acqua naturale / frizzante', desc_fr: '50 cl.', desc_en: '50 cl.', desc_it: '50 cl.', price: '2,50 €', order: 2 },
    { cat: 'boissons', name_fr: 'Bière artisanale', name_en: 'Craft beer', name_it: 'Birra artigianale', desc_fr: 'Sélection locale, 33 cl.', desc_en: 'Local selection, 33 cl.', desc_it: 'Selezione locale, 33 cl.', price: '5,00 €', order: 3 },
  ];

  const stmt = db.prepare(`
    INSERT INTO menu_items
      (category_id, name_fr, name_en, name_it, description_fr, description_en, description_it, price, is_veggie, is_featured, is_visible, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const tx = db.transaction(() => {
    items.forEach((i) => {
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
  console.log(`✓ ${items.length} plats créés`);
}

// ─── 6. AVIS ─────────────────────────────────────────────────────────────────
function seedReviews() {
  const count = db.prepare('SELECT COUNT(*) as c FROM reviews').get().c;
  if (count > 0) {
    console.log('✓ Avis déjà présents — skip');
    return;
  }

  // Verbatims du dossier (recensiones récentes Google)
  const reviews = [
    {
      author: 'Camille M.',
      source: 'Google',
      rating: 5,
      content_fr: 'Les meilleurs smash burgers que j\'ai mangé à Avignon. Viande de qualité, frites maison parfaites, et l\'accueil est top. On y retourne !',
      content_en: 'The best smash burgers I\'ve had in Avignon. Quality beef, perfect homemade fries, and the welcome is great. We\'ll be back!',
      content_it: 'I migliori smash burger che abbia mangiato ad Avignone. Carne di qualità, patatine fatte in casa perfette, e l\'accoglienza è top. Torneremo!',
    },
    {
      author: 'Lucas D.',
      source: 'Google',
      rating: 5,
      content_fr: 'Une découverte. Les frites de panisses sont une tuerie, vraiment quelque chose qu\'on ne trouve nulle part ailleurs. Le burger Signature : un vrai régal.',
      content_en: 'A real find. The panisse fries are amazing, really something you don\'t find anywhere else. The Signature burger: pure delight.',
      content_it: 'Una scoperta. Le panisse fritte sono pazzesche, davvero qualcosa che non si trova altrove. Il burger Signature: una vera delizia.',
    },
    {
      author: 'Sarah B.',
      source: 'Google',
      rating: 5,
      content_fr: 'Cuisine fait maison du début à la fin, on le sent. La mousse au chocolat est une dinguerie, je n\'en avais jamais mangé d\'aussi bonne. Service rapide et souriant.',
      content_en: 'Homemade from start to finish, you can taste it. The chocolate mousse is insane, I\'ve never had a better one. Quick and friendly service.',
      content_it: 'Fatto in casa dall\'inizio alla fine, si sente. La mousse al cioccolato è pazzesca, non ne avevo mai mangiata una così buona. Servizio veloce e cordiale.',
    },
    {
      author: 'Thomas P.',
      source: 'Google',
      rating: 5,
      content_fr: 'Le rapport qualité-prix est imbattable. Le tacos XL est largement de quoi caler, les sauces maison font la différence. À recommander !',
      content_en: 'Unbeatable value for money. The XL tacos is more than filling, the homemade sauces make all the difference. Highly recommended!',
      content_it: 'Rapporto qualità-prezzo imbattibile. Il tacos XL è più che sufficiente per saziarsi, le salse della casa fanno la differenza. Da consigliare!',
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
  console.log('\n🍔 Street Food Vla — Seed\n');

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
