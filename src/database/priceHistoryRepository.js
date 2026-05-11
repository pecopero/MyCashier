const { getDb } = require('./db')

module.exports = {
  record({ productId, productName, oldPrice, newPrice, oldCostPrice, newCostPrice, changedBy }) {
    getDb().prepare(`
      INSERT INTO price_history (product_id, product_name, old_price, new_price, old_cost_price, new_cost_price, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(productId, productName, oldPrice, newPrice, oldCostPrice, newCostPrice, changedBy || null)
  },

  getByProduct(productId, limit = 50) {
    return getDb().prepare(`
      SELECT * FROM price_history WHERE product_id = ? ORDER BY changed_at DESC LIMIT ?
    `).all(productId, limit)
  },

  getAll({ startDate, endDate } = {}) {
    if (startDate && endDate) {
      return getDb().prepare(`
        SELECT * FROM price_history WHERE date(changed_at) BETWEEN ? AND ? ORDER BY changed_at DESC LIMIT 200
      `).all(startDate, endDate)
    }
    return getDb().prepare(`SELECT * FROM price_history ORDER BY changed_at DESC LIMIT 200`).all()
  },
}
