/**
 * Carte L'Émulsion — source de vérité initiale
 *
 * Reconstituée à partir des sources publiques (TripAdvisor, Gault&Millau,
 * Petit Futé, Restaurant Guru, presse locale). La carte réelle change
 * quotidiennement — le chef Damien Chocano compose au marché du MIN d'Avignon
 * chaque matin. Ces plats sont représentatifs et servent de base ; ils sont
 * modifiables/remplaçables à 100 % depuis l'admin.
 *
 * Utilisé par scripts/seed.js (install) et scripts/refresh-menu.js (mise à jour).
 */

const categories = [
  {
    slug: 'formules',
    name_fr: 'Formules', name_en: 'Set menus', name_it: 'Formule',
    description_fr: 'Notre formule du midi et nos menus dégustation, composés chaque jour au retour du marché.',
    description_en: 'Our lunch set menu and tasting menus, composed each day upon returning from the market.',
    description_it: 'La nostra formula del pranzo e i menu degustazione, composti ogni giorno al ritorno dal mercato.',
    display_order: 1,
  },
  {
    slug: 'entrees',
    name_fr: 'Entrées', name_en: 'Starters', name_it: 'Antipasti',
    description_fr: 'Produits de saison, techniques modernes, souvenirs de cuisine de grand-mère.',
    description_en: 'Seasonal produce, modern techniques, echoes of grandmother\'s cooking.',
    description_it: 'Prodotti di stagione, tecniche moderne, ricordi di cucina della nonna.',
    display_order: 2,
  },
  {
    slug: 'plats',
    name_fr: 'Plats', name_en: 'Mains', name_it: 'Piatti principali',
    description_fr: 'Poisson, viande, cuissons basses températures et jus corsés.',
    description_en: 'Fish, meat, low-temperature cooking and rich jus.',
    description_it: 'Pesce, carne, cotture a bassa temperatura e fondi ricchi.',
    display_order: 3,
  },
  {
    slug: 'desserts',
    name_fr: 'Desserts', name_en: 'Desserts', name_it: 'Dolci',
    description_fr: 'Faits maison. Fruits de saison, herbes fraîches, textures aériennes.',
    description_en: 'Homemade. Seasonal fruit, fresh herbs, airy textures.',
    description_it: 'Fatti in casa. Frutta di stagione, erbe fresche, texture ariose.',
    display_order: 4,
  },
  {
    slug: 'vins',
    name_fr: 'Sélection de vins', name_en: 'Wine selection', name_it: 'Selezione di vini',
    description_fr: 'Carte courte et vivante, majoritairement Vallée du Rhône et Provence. Verres à partir de 6 €.',
    description_en: 'A short, lively list, mostly Rhône Valley and Provence. Glasses from €6.',
    description_it: 'Carta corta e viva, in prevalenza Valle del Rodano e Provenza. Calici da 6 €.',
    display_order: 5,
  },
];

const items = [
  // ─── Formules ─────────────────────────────────────────────────────────────
  {
    cat: 'formules', name_fr: 'Déjeuner du marché', name_en: 'Market lunch', name_it: 'Pranzo del mercato',
    desc_fr: 'Entrée, plat, dessert — composés chaque matin selon l\'arrivage du MIN d\'Avignon. Du mardi au vendredi midi.',
    desc_en: 'Starter, main and dessert — composed each morning based on arrivals from the Avignon market. Tuesday to Friday, lunch only.',
    desc_it: 'Antipasto, piatto principale e dolce — composti ogni mattina in base agli arrivi del mercato di Avignone. Da martedì a venerdì, solo pranzo.',
    price: '27 €', featured: 1, order: 1,
  },
  {
    cat: 'formules', name_fr: 'Menu Émulsion', name_en: 'Émulsion menu', name_it: 'Menu Émulsion',
    desc_fr: 'Trois services au choix parmi la carte du soir. La table à sa juste mesure.',
    desc_en: 'Three courses of your choice from the evening menu. The full experience, right-sized.',
    desc_it: 'Tre portate a scelta dalla carta serale. L\'esperienza completa, nella giusta misura.',
    price: '52 €', featured: 1, order: 2,
  },
  {
    cat: 'formules', name_fr: 'Menu Carte Blanche', name_en: 'Chef\'s carte blanche menu', name_it: 'Menu Carte Blanche',
    desc_fr: 'On vous laisse faire — le chef compose au fil du marché, en cinq temps. Sur réservation, toute la table.',
    desc_en: 'Leave it to us — five courses composed by the chef along the market. By reservation, whole table.',
    desc_it: 'Lasciate fare a noi — cinque portate composte dallo chef seguendo il mercato. Su prenotazione, tutto il tavolo.',
    price: '78 €', order: 3,
  },

  // ─── Entrées ──────────────────────────────────────────────────────────────
  {
    cat: 'entrees', name_fr: 'Ris de veau poêlés', name_en: 'Pan-seared sweetbreads', name_it: 'Animelle di vitello scottate',
    desc_fr: 'Topinambour en velouté, jus de viande corsé, éclats de noisette torréfiée.',
    desc_en: 'Jerusalem artichoke velouté, rich meat jus, roasted hazelnut shards.',
    desc_it: 'Vellutata di topinambur, fondo di carne intenso, scaglie di nocciole tostate.',
    price: '19 €', featured: 1, order: 1,
  },
  {
    cat: 'entrees', name_fr: 'Cannelloni à la joue de bœuf', name_en: 'Beef cheek cannelloni', name_it: 'Cannelloni alla guancia di manzo',
    desc_fr: 'Joue confite longtemps, pâte fine, écume de parmesan, herbes du jardin.',
    desc_en: 'Slow-confit cheek, fine pasta sheet, parmesan foam, garden herbs.',
    desc_it: 'Guancia confit a lungo, sfoglia sottile, spuma al parmigiano, erbe dell\'orto.',
    price: '17 €', order: 2,
  },
  {
    cat: 'entrees', name_fr: 'Tartare de veau', name_en: 'Veal tartare', name_it: 'Tartare di vitello',
    desc_fr: 'Coupé au couteau, câpres, échalotes, huile de noisette, jaune d\'œuf mariné au shoyu.',
    desc_en: 'Hand-cut, capers, shallots, hazelnut oil, egg yolk marinated in shoyu.',
    desc_it: 'Tagliata al coltello, capperi, scalogno, olio di nocciola, tuorlo marinato allo shoyu.',
    price: '18 €', order: 3,
  },
  {
    cat: 'entrees', name_fr: 'Œuf parfait, asperges vertes', name_en: 'Perfect egg, green asparagus', name_it: 'Uovo perfetto, asparagi verdi',
    desc_fr: 'Cuisson 63°C, asperges de Pertuis, écume à l\'ail des ours, croquant d\'épeautre.',
    desc_en: '63°C egg, Pertuis asparagus, wild garlic foam, spelt crunch.',
    desc_it: 'Uovo a 63°C, asparagi di Pertuis, spuma all\'aglio orsino, croccante di farro.',
    price: '16 €', veggie: 1, order: 4,
  },

  // ─── Plats ────────────────────────────────────────────────────────────────
  {
    cat: 'plats', name_fr: 'Dorade royale', name_en: 'Gilthead sea bream', name_it: 'Orata reale',
    desc_fr: 'Minestrone de légumes, bouillon léger au gingembre et à la citronnelle, huile de basilic.',
    desc_en: 'Vegetable minestrone, light broth with ginger and lemongrass, basil oil.',
    desc_it: 'Minestrone di verdure, brodo leggero allo zenzero e citronella, olio al basilico.',
    price: '34 €', featured: 1, order: 1,
  },
  {
    cat: 'plats', name_fr: 'Cabillaud rôti sur peau', name_en: 'Skin-roasted cod', name_it: 'Merluzzo arrosto sulla pelle',
    desc_fr: 'Purée d\'artichaut, câpres de Pantelleria, sabayon citronné.',
    desc_en: 'Artichoke purée, Pantelleria capers, lemon sabayon.',
    desc_it: 'Purea di carciofi, capperi di Pantelleria, sabayon al limone.',
    price: '32 €', order: 2,
  },
  {
    cat: 'plats', name_fr: 'Filet d\'agneau des Alpilles', name_en: 'Alpilles lamb fillet', name_it: 'Filetto d\'agnello delle Alpilles',
    desc_fr: 'Aubergine fumée, jus au thym-citron, olives Tanche, panisse croustillante.',
    desc_en: 'Smoked eggplant, thyme-lemon jus, Tanche olives, crisp panisse.',
    desc_it: 'Melanzana affumicata, fondo timo-limone, olive Tanche, panisse croccante.',
    price: '38 €', featured: 1, order: 3,
  },
  {
    cat: 'plats', name_fr: 'Cochon fermier basse température', name_en: 'Low-temperature farm pork', name_it: 'Maiale di fattoria a bassa temperatura',
    desc_fr: 'Ventrèche laquée 24h, purée de petit épeautre du Ventoux, jus court aux baies de genièvre.',
    desc_en: '24h-lacquered belly, small Ventoux spelt purée, short juniper berry jus.',
    desc_it: 'Pancetta laccata 24h, purea di farro piccolo del Ventoux, fondo corto alle bacche di ginepro.',
    price: '31 €', order: 4,
  },
  {
    cat: 'plats', name_fr: 'Risotto Carnaroli du printemps', name_en: 'Spring Carnaroli risotto', name_it: 'Risotto Carnaroli di primavera',
    desc_fr: 'Petits pois, fèves, menthe fraîche, écume de pecorino, huile d\'olive Aglandau.',
    desc_en: 'Peas, broad beans, fresh mint, pecorino foam, Aglandau olive oil.',
    desc_it: 'Piselli, fave, menta fresca, spuma di pecorino, olio d\'oliva Aglandau.',
    price: '28 €', veggie: 1, order: 5,
  },

  // ─── Desserts ─────────────────────────────────────────────────────────────
  {
    cat: 'desserts', name_fr: 'Cheesecake au basilic', name_en: 'Basil cheesecake', name_it: 'Cheesecake al basilico',
    desc_fr: 'Fraises Gariguette de Carpentras, sablé breton, sorbet basilic-citron.',
    desc_en: 'Gariguette strawberries from Carpentras, Breton shortbread, basil-lemon sorbet.',
    desc_it: 'Fragole Gariguette di Carpentras, frolla bretone, sorbetto basilico-limone.',
    price: '12 €', featured: 1, order: 1,
  },
  {
    cat: 'desserts', name_fr: 'Vacherin fraise', name_en: 'Strawberry Vacherin', name_it: 'Vacherin alla fragola',
    desc_fr: 'Meringue croustillante, crème glacée à la vanille de Madagascar, coulis de fraises fraîches.',
    desc_en: 'Crisp meringue, Madagascar vanilla ice cream, fresh strawberry coulis.',
    desc_it: 'Meringa croccante, gelato alla vaniglia del Madagascar, coulis di fragole fresche.',
    price: '11 €', order: 2,
  },
  {
    cat: 'desserts', name_fr: 'Poire pochée, crème diplomate', name_en: 'Poached pear, diplomat cream', name_it: 'Pera pochée, crema diplomatica',
    desc_fr: 'Diplomate à la vanille, biscuit café, glace grué de cacao.',
    desc_en: 'Vanilla diplomat cream, coffee biscuit, cocoa nib ice cream.',
    desc_it: 'Diplomatica alla vaniglia, biscotto al caffè, gelato alle fave di cacao.',
    price: '11 €', order: 3,
  },
  {
    cat: 'desserts', name_fr: 'Ganache chocolat grand cru', name_en: 'Grand cru chocolate ganache', name_it: 'Ganache al cioccolato grand cru',
    desc_fr: 'Chocolat Guanaja 70 %, biscuit noisette, sorbet cacao amer, fleur de sel.',
    desc_en: 'Guanaja 70% chocolate, hazelnut biscuit, bitter cocoa sorbet, fleur de sel.',
    desc_it: 'Cioccolato Guanaja 70%, biscotto alla nocciola, sorbetto al cacao amaro, fleur de sel.',
    price: '12 €', order: 4,
  },

  // ─── Vins ─────────────────────────────────────────────────────────────────
  {
    cat: 'vins', name_fr: 'Côtes du Rhône, verre', name_en: 'Côtes du Rhône, glass', name_it: 'Côtes du Rhône, calice',
    desc_fr: 'Sélection du chef, rouge ou blanc du moment.',
    desc_en: 'Chef\'s pick — current red or white.',
    desc_it: 'Selezione dello chef — rosso o bianco del momento.',
    price: '6 €', order: 1,
  },
  {
    cat: 'vins', name_fr: 'Châteauneuf-du-Pape, verre', name_en: 'Châteauneuf-du-Pape, glass', name_it: 'Châteauneuf-du-Pape, calice',
    desc_fr: 'Un vin voisin, à quelques kilomètres. À demander à la salle.',
    desc_en: 'A neighbour wine, just a few kilometres away. Ask the room.',
    desc_it: 'Un vino vicino, a pochi chilometri. Chiedete in sala.',
    price: '11 €', featured: 1, order: 2,
  },
  {
    cat: 'vins', name_fr: 'Tavel rosé, bouteille', name_en: 'Tavel rosé, bottle', name_it: 'Tavel rosé, bottiglia',
    desc_fr: 'Le rosé qui n\'a rien à envier aux rouges. Domaine à découvrir.',
    desc_en: 'The rosé that stands up to reds. A domaine to discover.',
    desc_it: 'Il rosé che non ha nulla da invidiare ai rossi. Un dominio da scoprire.',
    price: '38 €', order: 3,
  },
  {
    cat: 'vins', name_fr: 'Accord mets & vins', name_en: 'Wine pairing', name_it: 'Abbinamento cibo-vino',
    desc_fr: 'Trois verres choisis en accord avec votre menu, servis à la bonne température.',
    desc_en: 'Three glasses chosen to match your menu, served at the right temperature.',
    desc_it: 'Tre calici scelti in abbinamento al vostro menu, serviti alla giusta temperatura.',
    price: '24 €', order: 4,
  },
];

module.exports = { categories, items };
