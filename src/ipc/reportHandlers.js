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
      AND (t.is_void = 0 OR t.is_void IS NULL)
  `).get(startDate, endDate)

  const topProducts = db.prepare(`
    SELECT
      ti.product_name,
      SUM(ti.quantity)  AS total_qty,
      SUM(ti.subtotal)  AS total_revenue
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at, 'localtime') BETWEEN ? AND ?
      AND (t.is_void = 0 OR t.is_void IS NULL)
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
      AND (t.is_void = 0 OR t.is_void IS NULL)
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

  // Yesterday comparison
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  const yesterday = db.prepare(`
    SELECT COUNT(id) AS transactions, COALESCE(SUM(total),0) AS revenue
    FROM transactions WHERE date(created_at,'localtime') = ?
  `).get(yesterdayStr)
  const yesterdayCost = db.prepare(`
    SELECT COALESCE(SUM(ti.cost_price*ti.quantity),0) AS cost
    FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id
    WHERE date(t.created_at,'localtime') = ?
  `).get(yesterdayStr)

  // Hourly sales today
  const hourly = db.prepare(`
    SELECT strftime('%H', created_at, 'localtime') AS hour,
           COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
    FROM transactions
    WHERE date(created_at,'localtime') = ?
    GROUP BY hour ORDER BY hour ASC
  `).all(todayStr)

  // Top 5 products last 7 days
  const top5 = db.prepare(`
    SELECT ti.product_name, SUM(ti.quantity) AS total_qty, SUM(ti.subtotal) AS total_rev
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at,'localtime') >= date(?,' -6 days')
    GROUP BY ti.product_name
    ORDER BY total_qty DESC LIMIT 5
  `).all(todayStr)

  return {
    today: {
      transactions: today.transactions,
      revenue: today.revenue,
      discount: today.discount,
      cost: todayCost.cost,
      profit: today.revenue - todayCost.cost,
    },
    yesterday: {
      transactions: yesterday.transactions,
      revenue: yesterday.revenue,
      profit: yesterday.revenue - yesterdayCost.cost,
    },
    chart,
    hourly,
    top5,
    lowStock,
    recentTx,
  }
})

ipcMain.handle('reports:lowStock', () => {
  return getDb().prepare(`
    SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC
  `).all()
})

ipcMain.handle('reports:purchases', (_, { startDate, endDate, supplierId } = {}) => {
  const db = getDb()
  const params = [startDate, endDate]
  let supplierClause = ''
  if (supplierId) { supplierClause = 'AND p.supplier_id = ?'; params.push(supplierId) }

  const purchases = db.prepare(`
    SELECT p.* FROM purchases p
    WHERE date(p.created_at, 'localtime') BETWEEN ? AND ?
    ${supplierClause}
    ORDER BY p.created_at DESC
  `).all(...params)

  const summary = db.prepare(`
    SELECT
      COUNT(p.id)                                    AS total_purchases,
      COALESCE(SUM(p.total), 0)                      AS total_amount,
      COALESCE(SUM(p.paid_amount), 0)                AS total_paid,
      COALESCE(SUM(p.total - p.paid_amount), 0)      AS total_remaining
    FROM purchases p
    WHERE date(p.created_at, 'localtime') BETWEEN ? AND ?
    ${supplierClause}
  `).get(...params)

  const bySupplier = db.prepare(`
    SELECT
      COALESCE(p.supplier_name, 'Tanpa Supplier') AS supplier,
      COUNT(p.id)                                  AS count,
      COALESCE(SUM(p.total), 0)                    AS total
    FROM purchases p
    WHERE date(p.created_at, 'localtime') BETWEEN ? AND ?
    ${supplierClause}
    GROUP BY supplier ORDER BY total DESC
  `).all(...params)

  return { purchases, summary, bySupplier }
})

ipcMain.handle('reports:stockValue', () => {
  return getDb().prepare(`
    SELECT id, name, category, stock, min_stock, price, cost_price,
           stock * cost_price AS stock_value
    FROM products
    ORDER BY name ASC
  `).all()
})

ipcMain.handle('reports:byCashier', (_, { startDate, endDate }) => {
  const db = getDb()

  const byCashier = db.prepare(`
    SELECT
      COALESCE(user_name, 'Tidak diketahui') AS kasir,
      COUNT(id)                               AS total_transaksi,
      COALESCE(SUM(total), 0)                 AS total_omzet,
      COALESCE(SUM(discount), 0)              AS total_diskon
    FROM transactions
    WHERE date(created_at, 'localtime') BETWEEN ? AND ?
    GROUP BY user_name
    ORDER BY total_omzet DESC
  `).all(startDate, endDate)

  const shifts = db.prepare(`
    SELECT
      user_name AS kasir,
      COUNT(id)                      AS total_shift,
      COALESCE(SUM(total_sales), 0)  AS total_sales,
      COALESCE(SUM(total_transactions), 0) AS total_tx
    FROM shifts
    WHERE date(opened_at, 'localtime') BETWEEN ? AND ?
    GROUP BY user_name
    ORDER BY total_sales DESC
  `).all(startDate, endDate)

  const daily = db.prepare(`
    SELECT
      COALESCE(user_name, 'Tidak diketahui') AS kasir,
      date(created_at, 'localtime')           AS hari,
      COUNT(id)                               AS transaksi,
      COALESCE(SUM(total), 0)                 AS omzet
    FROM transactions
    WHERE date(created_at, 'localtime') BETWEEN ? AND ?
    GROUP BY user_name, date(created_at, 'localtime')
    ORDER BY hari DESC, omzet DESC
  `).all(startDate, endDate)

  return { byCashier, shifts, daily }
})
