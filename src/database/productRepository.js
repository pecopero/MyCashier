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

  create({ name, price, cost_price = 0, stock = 0, min_stock = 5, unit = 'pcs', category = 'Umum', barcode = null, wholesale_price = 0, wholesale_min_qty = 0 }) {
    const result = getDb().prepare(`
      INSERT INTO products (name, price, cost_price, stock, min_stock, unit, category, barcode, wholesale_price, wholesale_min_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, price, cost_price, stock, min_stock, unit || 'pcs', category, barcode || null, wholesale_price || 0, wholesale_min_qty || 0)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, price, cost_price = 0, stock, min_stock = 5, unit = 'pcs', category, barcode, wholesale_price = 0, wholesale_min_qty = 0 }) {
    getDb().prepare(`
      UPDATE products
      SET name = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?,
          unit = ?, category = ?, barcode = ?, wholesale_price = ?, wholesale_min_qty = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, price, cost_price, stock, min_stock, unit || 'pcs', category, barcode || null, wholesale_price || 0, wholesale_min_qty || 0, id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
  },

  decrementStock(id, quantity) {
    return getDb().prepare(`
      UPDATE products SET stock = ROUND(stock - ?, 6), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(quantity, id)
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
