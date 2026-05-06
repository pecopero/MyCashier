const { getDb } = require('./db')

const supplierRepository = {
  findAll() {
    return getDb().prepare('SELECT * FROM suppliers ORDER BY name ASC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
  },

  create({ name, phone = '', address = '' }) {
    const result = getDb().prepare(`
      INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)
    `).run(name, phone, address)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, phone = '', address = '' }) {
    getDb().prepare(`
      UPDATE suppliers SET name = ?, phone = ?, address = ? WHERE id = ?
    `).run(name, phone, address, id)
    return this.findById(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM suppliers WHERE id = ?').run(id)
  },
}

module.exports = supplierRepository
