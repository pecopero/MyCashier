const { getDb } = require('./db')

const productRepository = {
  findAll() {
    return getDb().prepare('SELECT * FROM products ORDER BY name ASC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id)
  },

  findByBarcode(barcode) {
    return getDb().prepare('SELECT * FROM products WHERE barcode = ?').get(barcode)
  },

  findLowStock() {
    return getDb().prepare('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC').all()
  },

  create({ name, price, cost_price = 0, stock = 0, min_stock = 5, category = 'Umum', barcode = null }) {
    const result = getDb().prepare(`
      INSERT INTO products (name, price, cost_price, stock, min_stock, category, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, price, cost_price, stock, min_stock, category, barcode || null)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, price, cost_price = 0, stock, min_stock = 5, category, barcode }) {
    getDb().prepare(`
      UPDATE products
      SET name = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?,
          category = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, price, cost_price, stock, min_stock, category, barcode || null, id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
  },

  decrementStock(id, quantity) {
    return getDb().prepare(`
      UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND stock >= ?
    `).run(quantity, id, quantity)
  },

  incrementStock(id, quantity, newCostPrice = null) {
    if (newCostPrice !== null) {
      return getDb().prepare(`
        UPDATE products SET stock = stock + ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(quantity, newCostPrice, id)
    }
    return getDb().prepare(`
      UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(quantity, id)
  },
}

module.exports = productRepository
