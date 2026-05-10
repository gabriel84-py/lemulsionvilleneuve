/**
 * Activity logger : enregistre toutes les actions admin
 */
const db = require('../db/database');

const insertLog = db.prepare(`
  INSERT INTO activity_logs (admin_id, admin_username, action, entity, entity_id, details, ip_address)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function logActivity(req, { action, entity, entityId = null, details = null }) {
  try {
    const adminId = req.session?.admin?.id || null;
    const adminUsername = req.session?.admin?.username || 'system';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    insertLog.run(
      adminId,
      adminUsername,
      action,
      entity,
      entityId ? String(entityId) : null,
      details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      ip
    );
  } catch (err) {
    console.error('[logger] failed to log activity:', err.message);
  }
}

function getRecentLogs(limit = 100) {
  return db.prepare(`
    SELECT * FROM activity_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { logActivity, getRecentLogs };
