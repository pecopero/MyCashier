const { ipcMain, dialog } = require('electron')
const { getDb } = require('../database/db')
const expenseRepository = require('../database/expenseRepository')
const XLSX = require('xlsx')

async function saveExcel(workbook, defaultName) {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Simpan File Excel',
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return { success: false }
  XLSX.writeFile(workbook, filePath)
  return { success: true, filePath }
}

ipcMain.handle('export:sales', async (_, { startDate, endDate }) => {
  const db = getDb()

  const transactions = db.prepare(`
    SELECT t.id, datetime(t.created_at,'localtime') as waktu,
           t.subtotal, t.discount, t.total, t.payment, t.change
    FROM transactions t
    WHERE date(t.created_at,'localtime') BETWEEN ? AND ?
    ORDER BY t.created_at ASC
  `).all(startDate, endDate)

  const items = db.prepare(`
    SELECT t.id as tx_id, datetime(t.created_at,'localtime') as waktu,
           ti.product_name, ti.quantity, ti.price, ti.cost_price, ti.subtotal
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at,'localtime') BETWEEN ? AND ?
    ORDER BY t.created_at ASC, ti.id ASC
  `).all(startDate, endDate)

  const wb = XLSX.utils.book_new()

  const txSheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
    'No Transaksi': t.id,
    'Waktu':        t.waktu,
    'Subtotal':     t.subtotal || t.total,
    'Diskon':       t.discount,
    'Total':        t.total,
    'Bayar':        t.payment,
    'Kembalian':    t.change,
  })))
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transaksi')

  const itemSheet = XLSX.utils.json_to_sheet(items.map(i => ({
    'No Transaksi':  i.tx_id,
    'Waktu':         i.waktu,
    'Produk':        i.product_name,
    'Qty':           i.quantity,
    'Harga Jual':    i.price,
    'Harga Pokok':   i.cost_price,
    'Subtotal':      i.subtotal,
  })))
  XLSX.utils.book_append_sheet(wb, itemSheet, 'Detail Item')

  const now = new Date().toISOString().slice(0, 10)
  return saveExcel(wb, `penjualan-${startDate}-sd-${endDate}.xlsx`)
})

ipcMain.handle('export:stock', async () => {
  const db = getDb()

  const products = db.prepare(`
    SELECT name, category, stock, min_stock, price, cost_price,
           (stock * cost_price) AS stock_value
    FROM products
    ORDER BY category ASC, name ASC
  `).all()

  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(products.map(p => ({
    'Nama Produk':  p.name,
    'Kategori':     p.category || 'Umum',
    'Stok':         p.stock,
    'Stok Min':     p.min_stock,
    'Harga Jual':   p.price,
    'Harga Pokok':  p.cost_price,
    'Nilai Stok':   p.stock_value,
    'Status':       p.stock === 0 ? 'Habis' : p.stock <= p.min_stock ? 'Tipis' : 'OK',
  })))
  XLSX.utils.book_append_sheet(wb, sheet, 'Stok Produk')

  return saveExcel(wb, `laporan-stok-${new Date().toLocaleDateString('en-CA')}.xlsx`)
})

ipcMain.handle('export:purchases', async (_, { startDate, endDate, supplierId }) => {
  const db = getDb()

  let query = `
    SELECT p.id, datetime(p.created_at,'localtime') AS tanggal,
           p.supplier_name, p.total, p.paid_amount, p.status,
           p.payment_type, p.due_date, p.note
    FROM purchases p
    WHERE date(p.created_at,'localtime') BETWEEN ? AND ?
  `
  const params = [startDate, endDate]
  if (supplierId) { query += ' AND p.supplier_id = ?'; params.push(supplierId) }
  query += ' ORDER BY p.created_at ASC'

  const purchases = db.prepare(query).all(...params)

  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(purchases.map(p => ({
    'No':           p.id,
    'Tanggal':      p.tanggal,
    'Supplier':     p.supplier_name || '—',
    'Total':        p.total,
    'Dibayar':      p.paid_amount,
    'Sisa':         p.total - p.paid_amount,
    'Jatuh Tempo':  p.due_date || '—',
    'Metode Bayar': p.payment_type,
    'Status':       p.status === 'paid' ? 'Lunas' : p.status === 'partial' ? 'Cicil' : 'Belum Bayar',
    'Catatan':      p.note || '',
  })))
  XLSX.utils.book_append_sheet(wb, sheet, 'Pembelian')

  return saveExcel(wb, `laporan-pembelian-${startDate}-sd-${endDate}.xlsx`)
})

ipcMain.handle('export:expenses', async (_, { startDate, endDate }) => {
  const expenses = expenseRepository.findAll({ startDate, endDate })

  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(expenses.map(e => ({
    'Tanggal':    e.date,
    'Kategori':   e.category,
    'Jumlah':     e.amount,
    'Keterangan': e.note || '',
  })))
  XLSX.utils.book_append_sheet(wb, sheet, 'Pengeluaran')

  return saveExcel(wb, `pengeluaran-${startDate}-sd-${endDate}.xlsx`)
})

ipcMain.handle('export:profitLoss', async (_, { startDate, endDate }) => {
  const db = getDb()

  const sales = db.prepare(`
    SELECT
      COALESCE(SUM(t.total + t.discount), 0) AS penjualan_kotor,
      COALESCE(SUM(t.discount), 0)            AS total_diskon,
      COALESCE(SUM(t.total), 0)               AS penjualan_bersih,
      COALESCE(SUM(ti.cost_price * ti.quantity), 0) AS hpp
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE date(t.created_at,'localtime') BETWEEN ? AND ?
  `).get(startDate, endDate)

  const expenses = expenseRepository.findAll({ startDate, endDate })
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = sales.penjualan_bersih - sales.hpp
  const netProfit = grossProfit - totalExpenses

  const wb = XLSX.utils.book_new()

  const plSheet = XLSX.utils.json_to_sheet([
    { 'Keterangan': 'LAPORAN LABA RUGI', 'Jumlah': '' },
    { 'Keterangan': `Periode: ${startDate} s/d ${endDate}`, 'Jumlah': '' },
    { 'Keterangan': '', 'Jumlah': '' },
    { 'Keterangan': 'Penjualan Kotor', 'Jumlah': sales.penjualan_kotor },
    { 'Keterangan': 'Diskon', 'Jumlah': -sales.total_diskon },
    { 'Keterangan': 'Penjualan Bersih', 'Jumlah': sales.penjualan_bersih },
    { 'Keterangan': '', 'Jumlah': '' },
    { 'Keterangan': 'HPP (Harga Pokok Penjualan)', 'Jumlah': -sales.hpp },
    { 'Keterangan': 'Laba Kotor', 'Jumlah': grossProfit },
    { 'Keterangan': '', 'Jumlah': '' },
    { 'Keterangan': 'Pengeluaran Operasional', 'Jumlah': -totalExpenses },
    ...expenses.map(e => ({ 'Keterangan': `  ${e.category} - ${e.note || e.date}`, 'Jumlah': -e.amount })),
    { 'Keterangan': '', 'Jumlah': '' },
    { 'Keterangan': 'LABA BERSIH', 'Jumlah': netProfit },
  ])
  XLSX.utils.book_append_sheet(wb, plSheet, 'Laba Rugi')

  const expSheet = XLSX.utils.json_to_sheet(expenses.map(e => ({
    'Tanggal': e.date, 'Kategori': e.category, 'Jumlah': e.amount, 'Keterangan': e.note || '',
  })))
  XLSX.utils.book_append_sheet(wb, expSheet, 'Detail Pengeluaran')

  return saveExcel(wb, `laporan-labarugi-${startDate}-sd-${endDate}.xlsx`)
})
