const { getDb } = require('./db')
const productRepository = require('./productRepository')

const returnRepository = {
  create({ transactionId, items, note = '' }) {
    const db = getDb()
    const totalRefund = items.reduce((s, i) => s + i.subtotal, 0)

    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO returns (transaction_id, total_refund, note) VALUES (?, ?, ?)
      `).run(transactionId || null, totalRefund, note)

      const returnId = result.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO return_items (return_id, product_id, product_name, quantity, price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const item of items) {
        insertItem.run(returnId, item.productId, item.productName, item.quantity, item.price, item.subtotal)
        productRepository.incrementStock(item.productId, item.quantity)
      }

      return this.findById(returnId)
    })()
  },

  findById(id) {
    const db = getDb()
    const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(id)
    if (!ret) return null
    ret.items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(id)
    return ret
  },

  findAll({ limit = 100 } = {}) {
    return getDb().prepare('SELECT * FROM returns ORDER BY created_at DESC LIMIT ?').all(limit)
  },
}

module.exports = returnRepository
