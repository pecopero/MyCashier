const { getDb } = require('./db')

const productUnitRepository = {
  findByProduct(productId) {
    return getDb()
      .prepare('SELECT * FROM product_units WHERE product_id = ? ORDER BY is_default DESC, id ASC')
      .all(productId)
  },

  findAllGrouped() {
    const rows = getDb().prepare('SELECT * FROM product_units ORDER BY product_id, is_default DESC, id ASC').all()
    const map = {}
    for (const row of rows) {
      if (!map[row.product_id]) map[row.product_id] = []
      map[row.product_id].push(row)
    }
    return map
  },

  saveAll(productId, units) {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM product_units WHERE product_id = ?').run(productId)
      if (!units || units.length === 0) return
      const insert = db.prepare(
        'INSERT INTO product_units (product_id, unit_name, conversion, price, is_default) VALUES (?, ?, ?, ?, ?)'
      )
      units.forEach((u, i) => {
        insert.run(productId, u.unit_name.trim(), parseFloat(u.conversion) || 1,
          parseFloat(u.price) || 0, u.is_default ? 1 : 0)
      })
    })()
    return this.findByProduct(productId)
  },
}

module.exports = productUnitRepository
