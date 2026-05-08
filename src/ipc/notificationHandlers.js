const { ipcMain } = require('electron')

ipcMain.handle('notifications:getCounts', () => {
  try {
    const { getDb } = require('../database/db')
    const db = getDb()
    const today   = new Date().toLocaleDateString('en-CA')
    const in3days = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-CA')

    // Total counts (for badge)
    const overdueHutang  = db.prepare(`SELECT COUNT(*) AS n FROM purchases   WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?`).get(today).n
    const dueSoonHutang  = db.prepare(`SELECT COUNT(*) AS n FROM purchases   WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?`).get(today, in3days).n
    const overduepiutang = db.prepare(`SELECT COUNT(*) AS n FROM receivables WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?`).get(today).n
    const dueSoonPiutang = db.prepare(`SELECT COUNT(*) AS n FROM receivables WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?`).get(today, in3days).n

    const hutang  = overdueHutang  + dueSoonHutang
    const piutang = overduepiutang + dueSoonPiutang

    // Individual items for panel (max 8 per type, ordered by urgency)
    const hutangItems = db.prepare(`
      SELECT supplier_name, (total - paid_amount) AS sisa, due_date,
             CASE WHEN due_date < ? THEN 1 ELSE 0 END AS is_overdue
      FROM purchases WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date <= ?
      ORDER BY due_date ASC LIMIT 8
    `).all(today, in3days)

    const piutangItems = db.prepare(`
      SELECT customer_name, (total_amount - paid_amount) AS sisa, due_date,
             CASE WHEN due_date < ? THEN 1 ELSE 0 END AS is_overdue
      FROM receivables WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date <= ?
      ORDER BY due_date ASC LIMIT 8
    `).all(today, in3days)

    return { hutang, piutang, total: hutang + piutang, overdueHutang, overduepiutang, hutangItems, piutangItems }
  } catch {
    return { hutang: 0, piutang: 0, total: 0, overdueHutang: 0, overduepiutang: 0, hutangItems: [], piutangItems: [] }
  }
})
