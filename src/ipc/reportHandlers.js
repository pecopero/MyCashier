const { ipcMain } = require('electron')
const { getDb } = require('../database/db')
const expenseRepository = require('../database/expenseRepository')

ipcMain.handle('reports:sales', (_, { startDate, endDate }) => {
  const db = getDb()

  const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE date(created_at, 'localtime') BETWEEN ? AND ?
    ORDER BY created_at DESC
  `).all(startDate, endDate)

  const summary = db.prepare(`
    SELECT
      COUNT(t.id)                                   AS total_transactions,
      COALESCE(SUM(t.total), 0)                     AS total_revenue,
      COALESCE(SUM(t.discount), 0)                  AS total_discount,
      COALESCE(SUM(ti.cost_price * ti.quantity), 0) AS total_cost,
      COALESCE(SUM(t.total), 0) - COALESCE(SUM(ti.cost_price * ti.quantity), 0) AS gross_profit
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE date(t.created_at, 'localtime') BETWEEN ? AND ?
  `).get(startDate, endDate)

  const topProducts = db.prepare(`
    SELECT
      ti.product_name,
      SUM(ti.quantity)  AS total_qty,
      SUM(ti.subtotal)  AS total_revenue
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at, 'localtime') BETWEEN ? AND ?
    GROUP BY ti.product_name
    ORDER BY total_qty DESC
    LIMIT 10
  `).all(startDate, endDate)

  return { transactions, summary, topProducts }
})

ipcMain.handle('reports:profitLoss', (_, { startDate, endDate }) => {
  const db = getDb()

  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(t.total), 0)                     AS revenue,
      COALESCE(SUM(t.discount), 0)                  AS discount,
      COALESCE(SUM(ti.cost_price * ti.quantity), 0) AS cogs
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE date(t.created_at, 'localtime') BETWEEN ? AND ?
  `).get(startDate, endDate)

  const expenseRows = expenseRepository.findAll({ startDate, endDate })
  const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0)

  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE date BETWEEN ? AND ?
    GROUP BY category ORDER BY total DESC
  `).all(startDate, endDate)

  const grossProfit = sales.revenue - sales.cogs
  const netProfit = grossProfit - totalExpenses

  return {
    revenue: sales.revenue,
    discount: sales.discount,
    cogs: sales.cogs,
    grossProfit,
    totalExpenses,
    netProfit,
    expensesByCategory: byCategory,
    expenses: expenseRows,
  }
})

ipcMain.handle('reports:dashboard', () => {
  const db = getDb()
  const todayStr = new Date().toLocaleDateString('en-CA')

  const today = db.prepare(`
    SELECT
      COUNT(id)               AS transactions,
      COALESCE(SUM(total), 0) AS revenue,
      COALESCE(SUM(discount),0) AS discount
    FROM transactions
    WHERE date(created_at, 'localtime') = ?
  `).get(todayStr)

  const todayCost = db.prepare(`
    SELECT COALESCE(SUM(ti.cost_price * ti.quantity), 0) AS cost
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at, 'localtime') = ?
  `).get(todayStr)

  // Grafik 7 hari terakhir
  const chart = db.prepare(`
    SELECT
      date(created_at, 'localtime') AS day,
      COALESCE(SUM(total), 0)       AS revenue,
      COUNT(id)                     AS transactions
    FROM transactions
    WHERE date(created_at, 'localtime') >= date(?, '-6 days')
    GROUP BY day
    ORDER BY day ASC
  `).all(todayStr)

  const lowStock = db.prepare(`
    SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC LIMIT 10
  `).all()

  const recentTx = db.prepare(`
    SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5
  `).all()

  return {
    today: {
      transactions: today.transactions,
      revenue: today.revenue,
      discount: today.discount,
      cost: todayCost.cost,
      profit: today.revenue - todayCost.cost,
    },
    chart,
    lowStock,
    recentTx,
  }
})

ipcMain.handle('reports:lowStock', () => {
  return getDb().prepare(`
    SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC
  `).all()
})
