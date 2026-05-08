const { ipcMain } = require('electron')
const { getDb } = require('../database/db')
const expenseRepository = require('../database/expenseRepository')

ipcMain.handle('expenses:getAll', (_, filters) => expenseRepository.findAll(filters))
ipcMain.handle('expenses:create', (_, data) => expenseRepository.create(data))
ipcMain.handle('expenses:update', (_, id, data) => expenseRepository.update(id, data))
ipcMain.handle('expenses:delete', (_, id) => {
  expenseRepository.delete(id)
  return { success: true }
})

// Semua kas keluar: pengeluaran operasional + pembelian tunai + bayar hutang pembelian
ipcMain.handle('expenses:getCashOut', (_, { startDate, endDate }) => {
  const db = getDb()

  const expenses = db.prepare(`
    SELECT date, amount, category, note, 'expense' AS source, created_at
    FROM expenses WHERE date BETWEEN ? AND ?
  `).all(startDate, endDate)

  const cashPurchases = db.prepare(`
    SELECT date(created_at, 'localtime') AS date,
           total AS amount, 'Pembelian Tunai' AS category,
           supplier_name AS note, 'purchase' AS source, created_at
    FROM purchases
    WHERE payment_type = 'cash'
      AND date(created_at, 'localtime') BETWEEN ? AND ?
  `).all(startDate, endDate)

  const purchasePayments = db.prepare(`
    SELECT date(pp.created_at, 'localtime') AS date,
           pp.amount, 'Bayar Hutang Pembelian' AS category,
           p.supplier_name AS note, 'purchase_payment' AS source, pp.created_at
    FROM purchase_payments pp
    JOIN purchases p ON p.id = pp.purchase_id
    WHERE date(pp.created_at, 'localtime') BETWEEN ? AND ?
  `).all(startDate, endDate)

  const items = [...expenses, ...cashPurchases, ...purchasePayments]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  const total = items.reduce((s, r) => s + (r.amount ?? 0), 0)
  return { items, total }
})
