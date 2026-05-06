const { getDb } = require('./db')
const productRepository = require('./productRepository')

const purchaseRepository = {
  create({ supplierId, supplierName, items, note = '', paymentType = 'cash', dueDate = null }) {
    const db = getDb()
    const total = items.reduce((sum, i) => sum + i.subtotal, 0)
    const paidAmount = paymentType === 'cash' ? total : 0
    const status = paymentType === 'cash' ? 'paid' : 'unpaid'

    const insertPurchase = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO purchases (supplier_id, supplier_name, total, payment_type, due_date, paid_amount, status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(supplierId || null, supplierName || '', total, paymentType, dueDate || null, paidAmount, status, note)

      const purchaseId = result.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, cost_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const item of items) {
        insertItem.run(purchaseId, item.productId, item.productName, item.quantity, item.costPrice, item.subtotal)
        productRepository.incrementStock(item.productId, item.quantity, item.costPrice)
      }

      return purchaseId
    })

    const id = insertPurchase()
    return this.findById(id)
  },

  findById(id) {
    const db = getDb()
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id)
    if (!purchase) return null
    purchase.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id)
    purchase.payments = db.prepare('SELECT * FROM purchase_payments WHERE purchase_id = ? ORDER BY created_at ASC').all(id)
    return purchase
  },

  findAll({ startDate, endDate, status, limit = 200 } = {}) {
    let query = 'SELECT * FROM purchases WHERE 1=1'
    const params = []
    if (startDate) { query += ' AND date(created_at) >= ?'; params.push(startDate) }
    if (endDate)   { query += ' AND date(created_at) <= ?'; params.push(endDate) }
    if (status)    { query += ' AND status = ?'; params.push(status) }
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)
    return getDb().prepare(query).all(...params)
  },

  findUnpaid() {
    return getDb().prepare(`
      SELECT * FROM purchases WHERE status IN ('unpaid', 'partial')
      ORDER BY due_date ASC, created_at ASC
    `).all()
  },

  addPayment(purchaseId, amount, note = '') {
    const db = getDb()
    return db.transaction(() => {
      db.prepare(`INSERT INTO purchase_payments (purchase_id, amount, note) VALUES (?, ?, ?)`)
        .run(purchaseId, amount, note)

      const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId)
      const newPaid = purchase.paid_amount + amount
      const newStatus = newPaid >= purchase.total ? 'paid' : 'partial'

      db.prepare(`UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?`)
        .run(newPaid, newStatus, purchaseId)

      return this.findById(purchaseId)
    })()
  },

  extendDueDate(purchaseId, newDueDate) {
    getDb().prepare('UPDATE purchases SET due_date = ? WHERE id = ?').run(newDueDate, purchaseId)
    return this.findById(purchaseId)
  },

  getDueSoon() {
    const db = getDb()
    const today = new Date().toLocaleDateString('en-CA')
    const in2days = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA')
    return db.prepare(`
      SELECT * FROM purchases
      WHERE status IN ('unpaid', 'partial')
        AND due_date IS NOT NULL
        AND due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `).all(today, in2days)
  },

  getOverdue() {
    const today = new Date().toLocaleDateString('en-CA')
    return getDb().prepare(`
      SELECT * FROM purchases
      WHERE status IN ('unpaid', 'partial')
        AND due_date IS NOT NULL
        AND due_date < ?
      ORDER BY due_date ASC
    `).all(today)
  },
}

module.exports = purchaseRepository
