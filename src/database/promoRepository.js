const { getDb } = require('./db')

const promoRepository = {
  findAll() {
    return getDb().prepare(`
      SELECT p.*, pr.name as product_name
      FROM promos p
      LEFT JOIN products pr ON pr.id = p.product_id
      ORDER BY p.created_at DESC
    `).all()
  },

  findActive(date) {
    const today = date || new Date().toLocaleDateString('en-CA')
    return getDb().prepare(`
      SELECT p.*, pr.name as product_name
      FROM promos p
      LEFT JOIN products pr ON pr.id = p.product_id
      WHERE p.active = 1 AND p.start_date <= ? AND p.end_date >= ?
    `).all(today, today)
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM promos WHERE id = ?').get(id)
  },

  create({ name, type, value, minPurchase = 0, productId = null, startDate, endDate, active = 1 }) {
    const result = getDb().prepare(`
      INSERT INTO promos (name, type, value, min_purchase, product_id, start_date, end_date, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, type, value, minPurchase, productId || null, startDate, endDate, active ? 1 : 0)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, type, value, minPurchase = 0, productId = null, startDate, endDate, active }) {
    getDb().prepare(`
      UPDATE promos SET name = ?, type = ?, value = ?, min_purchase = ?, product_id = ?, start_date = ?, end_date = ?, active = ?
      WHERE id = ?
    `).run(name, type, value, minPurchase, productId || null, startDate, endDate, active ? 1 : 0, id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM promos WHERE id = ?').run(id)
  },
}

module.exports = promoRepository
