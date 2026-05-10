/**
 * Hours utility : calcule l'état "ouvert / fermé" en temps réel
 */
const db = require('../db/database');

const getAllHoursStmt = db.prepare(`
  SELECT day_of_week, service, opens, closes, is_closed
  FROM opening_hours
  ORDER BY day_of_week, service
`);

const DAY_KEYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_KEYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

function getDayLabel(dayIndex, lang = 'fr') {
  if (lang === 'en') return DAY_KEYS_EN[dayIndex];
  if (lang === 'it') return DAY_KEYS_IT[dayIndex];
  return DAY_KEYS_FR[dayIndex];
}

/**
 * Renvoie tous les horaires regroupés par jour
 * [{ day: 1, dayLabel: 'Lundi', services: [{ service: 'lunch', opens, closes, is_closed }, ...] }]
 */
function getAllHours(lang = 'fr') {
  const rows = getAllHoursStmt.all();
  // Order: Lundi → Dimanche (1..6, 0)
  const ordered = [1, 2, 3, 4, 5, 6, 0];
  const grouped = ordered.map((day) => {
    const services = rows.filter((r) => r.day_of_week === day);
    return {
      day,
      dayLabel: getDayLabel(day, lang),
      lunch: services.find((s) => s.service === 'lunch') || null,
      dinner: services.find((s) => s.service === 'dinner') || null,
    };
  });
  return grouped;
}

/**
 * Calcule l'état actuel : ouvert ? fermé ? prochaine ouverture ?
 */
function getCurrentStatus(lang = 'fr') {
  const now = new Date();
  // On utilise l'heure locale du serveur (le serveur sera en Europe/Paris)
  const today = now.getDay(); // 0..6
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const rows = getAllHoursStmt.all();

  // Check si on est ouvert maintenant
  const todayServices = rows.filter((r) => r.day_of_week === today && !r.is_closed);
  for (const svc of todayServices) {
    if (!svc.opens || !svc.closes) continue;
    const [oh, om] = svc.opens.split(':').map(Number);
    const [ch, cm] = svc.closes.split(':').map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    if (currentMinutes >= openMin && currentMinutes < closeMin) {
      return {
        isOpen: true,
        closesAt: svc.closes,
        message: { fr: `Ouvert · ferme à ${svc.closes}`, en: `Open · closes at ${svc.closes}`, it: `Aperto · chiude alle ${svc.closes}` }[lang] || `Ouvert · ferme à ${svc.closes}`,
      };
    }
  }

  // Pas ouvert, on cherche la prochaine ouverture (jusqu'à 7 jours en avant)
  for (let offset = 0; offset < 8; offset++) {
    const checkDay = (today + offset) % 7;
    const dayServices = rows
      .filter((r) => r.day_of_week === checkDay && !r.is_closed && r.opens)
      .sort((a, b) => a.opens.localeCompare(b.opens));

    for (const svc of dayServices) {
      if (!svc.opens) continue;
      const [oh, om] = svc.opens.split(':').map(Number);
      const openMin = oh * 60 + om;
      // Si c'est aujourd'hui, ça doit être dans le futur
      if (offset === 0 && openMin <= currentMinutes) continue;

      let prefix;
      if (offset === 0) {
        prefix = { fr: `Ferme · ouvre aujourd'hui à`, en: `Closed · opens today at`, it: `Chiuso · apre oggi alle` }[lang];
      } else if (offset === 1) {
        prefix = { fr: `Fermé · ouvre demain à`, en: `Closed · opens tomorrow at`, it: `Chiuso · apre domani alle` }[lang];
      } else {
        prefix = { fr: `Fermé · ouvre ${getDayLabel(checkDay, lang)} à`, en: `Closed · opens ${getDayLabel(checkDay, lang)} at`, it: `Chiuso · apre ${getDayLabel(checkDay, lang)} alle` }[lang];
      }

      return {
        isOpen: false,
        opensAt: svc.opens,
        opensDay: checkDay,
        message: `${prefix} ${svc.opens}`,
      };
    }
  }

  return {
    isOpen: false,
    message: { fr: 'Fermé', en: 'Closed', it: 'Chiuso' }[lang] || 'Fermé',
  };
}

module.exports = { getAllHours, getCurrentStatus, getDayLabel };
