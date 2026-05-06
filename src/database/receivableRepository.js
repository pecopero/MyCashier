const { getDb } = require('./db')

const receivableRepository = {
  create({ transactionId = null, customerName, customerPhone = '', totalAmount, paidAmount = 0, dueDate = null, note = '' }) {
    const db = getDb()
    const status = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
    const result = db.prepare(`
      INSERT INTO receivables (transaction_id, customer_name, customer_phone, total_amount, paid_amount, due_date, status, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transactionId || null, customerName, customerPhone || '', totalAmount, paidAmount, dueDate || null, status, note)
    return this.findById(result.lastInsertRowid)
  },

  findById(id) {
    const db = getDb()
    const row = db.prepare('SELECT * FROM receivables WHERE id = ?').get(id)
    if (!row) return null
    row.payments = db.prepare('SELECT * FROM receivable_payments WHERE receivable_id = ? ORDER BY created_at ASC').all(id)
    return row
  },

  findAll({ status } = {}) {
    let query = 'SELECT * FROM receivables WHERE 1=1'
    const params = []
    if (status) { query += ' AND status = ?'; params.push(status) }
    query += ' ORDER BY created_at DESC'
    return getDb().prepare(query).all(...params)
  },

  findUnpaid() {
    return getDb().prepare(`
      SELECT * FROM receivables WHERE status IN ('unpaid', 'partial')
      ORDER BY due_date ASC, created_at ASC
    `).all()
  },

  addPayment(receivableId, amount, note = '') {
    const db = getDb()
    return db.transaction(() => {
      db.prepare(`INSERT INTO receivable_payments (receivable_id, amount, note) VALUES (?, ?, ?)`)
        .run(receivableId, amount, note)

      const rec = db.prepare('SELECT * FROM receivables WHERE id = ?').get(receivableId)
      const newPaid = rec.paid_amount + amount
      const newStatus = newPaid >= rec.total_amount ? 'paid' : 'partial'

      db.prepare('UPDATE receivables SET paid_amount = ?, status = ? WHERE id = ?')
        .run(newPaid, newStatus, receivableId)

      return this.findById(receivableId)
    })()
  },

  extendDueDate(receivableId, newDueDate) {
    getDb().prepare('UPDATE receivables SET due_date = ? WHERE id = ?').run(newDueDate, receivableId)
    return this.findById(receivableId)
  },

  getDueSoon() {
    const today = new Date().toLocaleDateString('en-CA')
    const in2days = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA')
    return getDb().prepare(`
      SELECT * FROM receivables
      WHERE status IN ('unpaid', 'partial')
        AND due_date IS NOT NULL
        AND due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `).all(today, in2days)
  },

  getSummary() {
    return getDb().prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('unpaid','partial') THEN 1 ELSE 0 END) AS outstanding_count,
        COALESCE(SUM(CASE WHEN status IN ('unpaid','partial') THEN total_amount - paid_amount ELSE 0 END), 0) AS outstanding_amount
      FROM receivables
    `).get()
  },
}

module.exports = receivableRepository
