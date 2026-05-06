const { getDb } = require('./db')

const categoryRepository = {
  findAll() {
    return getDb().prepare('SELECT * FROM categories ORDER BY name ASC').all()
  },

  create(name) {
    const result = getDb().prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim())
    return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)
  },

  update(id, name) {
    getDb().prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id)
    return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id)
  },

  delete(id) {
    return getDb().prepare('DELETE FROM categories WHERE id = ?').run(id)
  },
}

module.exports = categoryRepository
