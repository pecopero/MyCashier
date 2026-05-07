const { getDb } = require('./db')

const shiftRepository = {
  open({ userId, userName, openingCash }) {
    const result = getDb().prepare(`
      INSERT INTO shifts (user_id, user_name, opening_cash, status)
      VALUES (?, ?, ?, 'open')
    `).run(userId, userName, openingCash)
    return this.findById(result.lastInsertRowid)
  },

  close(shiftId, { closingCash = 0, note = '' }) {
    const db = getDb()
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId)
    if (!shift) return null

    // Calculate totals from transactions in this shift's time window
    const summary = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS sales
      FROM transactions
      WHERE shift_id = ?
    `).get(shiftId)

    db.prepare(`
      UPDATE shifts SET
        closed_at = CURRENT_TIMESTAMP,
        closing_cash = ?,
        total_sales = ?,
        total_transactions = ?,
        note = ?,
        status = 'closed'
      WHERE id = ?
    `).run(closingCash, summary.sales, summary.count, note, shiftId)

    return this.findById(shiftId)
  },

  getActive(userId) {
    return getDb().prepare(`
      SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1
    `).get(userId)
  },

  findAll() {
    return getDb().prepare('SELECT * FROM shifts ORDER BY opened_at DESC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM shifts WHERE id = ?').get(id)
  },
}

module.exports = shiftRepository
