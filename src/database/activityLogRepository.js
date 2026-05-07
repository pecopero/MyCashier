const { getDb } = require('./db')

const activityLogRepository = {
  add({ userId = null, userName = '', action, entity = '', details = '' }) {
    getDb().prepare(`
      INSERT INTO activity_logs (user_id, user_name, action, entity, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, userName, action, entity, details)
  },

  findAll({ startDate, endDate, userId, limit = 200 } = {}) {
    let query = 'SELECT * FROM activity_logs WHERE 1=1'
    const params = []
    if (startDate) { query += ` AND date(created_at,'localtime') >= ?`; params.push(startDate) }
    if (endDate)   { query += ` AND date(created_at,'localtime') <= ?`; params.push(endDate) }
    if (userId)    { query += ' AND user_id = ?'; params.push(userId) }
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)
    return getDb().prepare(query).all(...params)
  },
}

module.exports = activityLogRepository
