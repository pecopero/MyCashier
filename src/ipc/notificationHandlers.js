const { ipcMain } = require('electron')

ipcMain.handle('notifications:getCounts', () => {
  try {
    const { getDb } = require('../database/db')
    const db = getDb()
    const today = new Date().toLocaleDateString('en-CA')
    const in2days = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA')

    const overdueHutang = db.prepare(`
      SELECT COUNT(*) AS n FROM purchases
      WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?
    `).get(today).n

    const dueSoonHutang = db.prepare(`
      SELECT COUNT(*) AS n FROM purchases
      WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?
    `).get(today, in2days).n

    const overduePiutang = db.prepare(`
      SELECT COUNT(*) AS n FROM receivables
      WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?
    `).get(today).n

    const dueSoonPiutang = db.prepare(`
      SELECT COUNT(*) AS n FROM receivables
      WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?
    `).get(today, in2days).n

    const hutang = overdueHutang + dueSoonHutang
    const piutang = overduePiutang + dueSoonPiutang

    return { hutang, piutang, total: hutang + piutang, overdueHutang, overduepiutang: overduePiutang }
  } catch {
    return { hutang: 0, piutang: 0, total: 0, overdueHutang: 0, overduePiutang: 0 }
  }
})
