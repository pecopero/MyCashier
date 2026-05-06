const { getDb } = require('./db')

const settingsRepository = {
  getAll() {
    const rows = getDb().prepare('SELECT key, value FROM settings').all()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  },

  get(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row?.value ?? ''
  },

  set(key, value) {
    getDb().prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value))
  },

  setMany(obj) {
    const stmt = getDb().prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    const tx = getDb().transaction(() => {
      for (const [key, value] of Object.entries(obj)) stmt.run(key, String(value))
    })
    tx()
  },
}

module.exports = settingsRepository
