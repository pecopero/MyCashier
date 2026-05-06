const { getDb } = require('./db')

const stockOpnameRepository = {
  findAll() {
    return getDb().prepare('SELECT * FROM stock_opnames ORDER BY created_at DESC').all()
  },

  findById(id) {
    const opname = getDb().prepare('SELECT * FROM stock_opnames WHERE id = ?').get(id)
    if (!opname) return null
    opname.items = getDb().prepare('SELECT * FROM stock_opname_items WHERE opname_id = ? ORDER BY product_name ASC').all(id)
    return opname
  },

  create({ date, note, items }) {
    const db = getDb()
    const insertOpname = db.prepare('INSERT INTO stock_opnames (date, note) VALUES (?, ?)')
    const insertItem = db.prepare(`
      INSERT INTO stock_opname_items (opname_id, product_id, product_name, system_stock, actual_stock, difference)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const updateStock = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')

    const run = db.transaction(() => {
      const result = insertOpname.run(date, note || '')
      const opnameId = result.lastInsertRowid
      for (const item of items) {
        const diff = item.actualStock - item.systemStock
        insertItem.run(opnameId, item.productId, item.productName, item.systemStock, item.actualStock, diff)
        updateStock.run(item.actualStock, item.productId)
      }
      return opnameId
    })

    const opnameId = run()
    return this.findById(opnameId)
  },
}

module.exports = stockOpnameRepository
