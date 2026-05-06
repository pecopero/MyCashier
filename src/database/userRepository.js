const { getDb } = require('./db')

const userRepository = {
  findAll() {
    return getDb().prepare('SELECT id, name, role, active, created_at FROM users ORDER BY id ASC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT id, name, role, active FROM users WHERE id = ?').get(id)
  },

  login(name, pin) {
    return getDb().prepare(
      'SELECT id, name, role FROM users WHERE name = ? AND pin = ? AND active = 1'
    ).get(name, pin) || null
  },

  loginById(id, pin) {
    return getDb().prepare(
      'SELECT id, name, role FROM users WHERE id = ? AND pin = ? AND active = 1'
    ).get(id, pin) || null
  },

  create({ name, pin, role = 'kasir' }) {
    const db = getDb()
    const result = db.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)').run(name, pin, role)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, pin, role, active }) {
    const db = getDb()
    if (pin) {
      db.prepare('UPDATE users SET name = ?, pin = ?, role = ?, active = ? WHERE id = ?')
        .run(name, pin, role, active ?? 1, id)
    } else {
      db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?')
        .run(name, role, active ?? 1, id)
    }
    return this.findById(id)
  },

  delete(id) {
    getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
  },
}

module.exports = userRepository
