const { getDb } = require('./db')

const expenseRepository = {
  findAll({ startDate, endDate } = {}) {
    let query = 'SELECT * FROM expenses WHERE 1=1'
    const params = []
    if (startDate) { query += ' AND date >= ?'; params.push(startDate) }
    if (endDate)   { query += ' AND date <= ?'; params.push(endDate) }
    query += ' ORDER BY date DESC, created_at DESC'
    return getDb().prepare(query).all(...params)
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM expenses WHERE id = ?').get(id)
  },

  create({ category = 'Lain-lain', amount, note = '', date }) {
    const result = getDb().prepare(`
      INSERT INTO expenses (category, amount, note, date) VALUES (?, ?, ?, ?)
    `).run(category, amount, note, date)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { category, amount, note, date }) {
    getDb().prepare(`
      UPDATE expenses SET category = ?, amount = ?, note = ?, date = ? WHERE id = ?
    `).run(category, amount, note, date, id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id)
  },

  sumByPeriod(startDate, endDate) {
    return getDb().prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate)
  },
}

module.exports = expenseRepository
