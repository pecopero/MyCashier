const { ipcMain } = require('electron')

ipcMain.handle('notifications:getCounts', () => {
  try {
    const { getDb } = require('../database/db')
    const db = getDb()
    const today   = new Date().toLocaleDateString('en-CA')
    const in3days = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-CA')

    // ── Hutang ────────────────────────────────────────────────────────────
    const overdueHutang  = db.prepare(`SELECT COUNT(*) AS n FROM purchases   WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?`).get(today).n
    const dueSoonHutang  = db.prepare(`SELECT COUNT(*) AS n FROM purchases   WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?`).get(today, in3days).n

    // ── Piutang ───────────────────────────────────────────────────────────
    const overduepiutang = db.prepare(`SELECT COUNT(*) AS n FROM receivables WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?`).get(today).n
    const dueSoonPiutang = db.prepare(`SELECT COUNT(*) AS n FROM receivables WHERE status IN ('unpaid','partial') AND due_date BETWEEN ? AND ?`).get(today, in3days).n

    const hutang  = overdueHutang  + dueSoonHutang
    const piutang = overduepiutang + dueSoonPiutang

    // ── Stok menipis ──────────────────────────────────────────────────────
    const lowStockCount = db.prepare(`SELECT COUNT(*) AS n FROM products WHERE stock <= min_stock AND active != 0`).get().n

    // ── Items for panel (max 8 per type) ──────────────────────────────────
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

    const lowStockItems = db.prepare(`
      SELECT name, stock, min_stock, unit
      FROM products WHERE stock <= min_stock AND active != 0
      ORDER BY stock ASC LIMIT 8
    `).all()

    return {
      hutang, piutang, lowStock: lowStockCount,
      total: hutang + piutang + lowStockCount,
      overdueHutang, overduepiutang,
      hutangItems, piutangItems, lowStockItems,
    }
  } catch {
    return { hutang: 0, piutang: 0, lowStock: 0, total: 0, overdueHutang: 0, overduepiutang: 0, hutangItems: [], piutangItems: [], lowStockItems: [] }
  }
})
