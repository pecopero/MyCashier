const { getDb } = require('./db')

const cashClosingRepository = {
  getByDate(date) {
    return getDb().prepare('SELECT * FROM cash_closings WHERE date = ?').get(date)
  },

  upsert({ date, openingCash, actualCash, expectedCash, note = '' }) {
    const db = getDb()
    const difference = actualCash - expectedCash
    db.prepare(`
      INSERT INTO cash_closings (date, opening_cash, expected_cash, actual_cash, difference, note)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        opening_cash = excluded.opening_cash,
        expected_cash = excluded.expected_cash,
        actual_cash = excluded.actual_cash,
        difference = excluded.difference,
        note = excluded.note
    `).run(date, openingCash, expectedCash, actualCash, difference, note)
    return this.getByDate(date)
  },

  findAll({ limit = 90 } = {}) {
    return getDb().prepare('SELECT * FROM cash_closings ORDER BY date DESC LIMIT ?').all(limit)
  },

  getDailySummary(date) {
    const db = getDb()
    const salesCash = db.prepare(`
      SELECT COALESCE(SUM(payment), 0) AS total
      FROM transactions
      WHERE date(created_at, 'localtime') = ?
        AND (payment_type = 'cash' OR payment_type IS NULL)
    `).get(date)

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date = ?
    `).get(date)

    const purchasesCash = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS total
      FROM purchases
      WHERE date(created_at, 'localtime') = ? AND payment_type = 'cash'
    `).get(date)

    const receivablePayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM receivable_payments
      WHERE date(created_at, 'localtime') = ?
    `).get(date)

    return {
      salesCash: salesCash.total,
      expenses: expenses.total,
      purchasesCash: purchasesCash.total,
      receivablePayments: receivablePayments.total,
    }
  },
}

module.exports = cashClosingRepository
