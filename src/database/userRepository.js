const { getDb } = require('./db')
const { hashPin, verifyPin, isHashed } = require('./pinUtils')

const userRepository = {
  findAll() {
    return getDb().prepare('SELECT id, name, role, active, created_at FROM users ORDER BY id ASC').all()
  },

  findById(id) {
    return getDb().prepare('SELECT id, name, role, active FROM users WHERE id = ?').get(id)
  },

  login(name, pin) {
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE name = ? AND active = 1').get(name)
    if (!user || !verifyPin(pin, user.pin)) return null
    if (!isHashed(user.pin)) {
      db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashPin(pin), user.id)
    }
    return { id: user.id, name: user.name, role: user.role }
  },

  loginById(id, pin) {
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id)
    if (!user || !verifyPin(pin, user.pin)) return null
    if (!isHashed(user.pin)) {
      db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashPin(pin), user.id)
    }
    return { id: user.id, name: user.name, role: user.role }
  },

  create({ name, pin, role = 'kasir' }) {
    const db = getDb()
    const result = db.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)').run(name, hashPin(pin), role)
    return this.findById(result.lastInsertRowid)
  },

  update(id, { name, pin, role, active }) {
    const db = getDb()
    if (pin) {
      db.prepare('UPDATE users SET name = ?, pin = ?, role = ?, active = ? WHERE id = ?')
        .run(name, hashPin(pin), role, active ?? 1, id)
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
