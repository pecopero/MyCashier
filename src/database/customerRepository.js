const { getDb } = require('./db')

const customerRepository = {
  findAll(search = '') {
    if (search) {
      return getDb().prepare(`
        SELECT * FROM customers
        WHERE name LIKE ? OR phone LIKE ?
        ORDER BY name ASC
      `).all(`%${search}%`, `%${search}%`)
    }
    return getDb().prepare('SELECT * FROM customers ORDER BY name ASC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id)
  },

  create({ name, phone = '', address = '', notes = '' }) {
    const result = getDb().prepare(`
      INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)
    `).run(name, phone || '', address || '', notes || '')
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, phone = '', address = '', notes = '' }) {
    getDb().prepare(`
      UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?
    `).run(name, phone || '', address || '', notes || '', id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM customers WHERE id = ?').run(id)
  },
}

module.exports = customerRepository
