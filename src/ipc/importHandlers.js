const { ipcMain, dialog } = require('electron')
const XLSX = require('xlsx')
const productRepository = require('../database/productRepository')

ipcMain.handle('import:previewProducts', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Pilih File Excel Produk',
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths.length) return { canceled: true }

  const wb = XLSX.readFile(filePaths[0])
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const preview = rows.map(row => ({
    name:       String(row['Nama Produk'] || row['name'] || row['nama'] || '').trim(),
    price:      parseFloat(row['Harga Jual'] || row['price'] || row['harga_jual'] || 0),
    cost_price: parseFloat(row['Harga Pokok'] || row['cost_price'] || row['hpp'] || 0),
    stock:      parseInt(row['Stok'] || row['stock'] || 0, 10),
    min_stock:  parseInt(row['Stok Min'] || row['min_stock'] || 5, 10),
    category:   String(row['Kategori'] || row['category'] || 'Umum').trim(),
    barcode:    String(row['Barcode'] || row['barcode'] || '').trim(),
  })).filter(r => r.name)

  return { canceled: false, rows: preview }
})

ipcMain.handle('import:executeProducts', (_, rows) => {
  let imported = 0, skipped = 0
  for (const row of rows) {
    try {
      productRepository.create(row)
      imported++
    } catch {
      skipped++
    }
  }
  return { imported, skipped }
})

ipcMain.handle('import:downloadTemplate', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Simpan Template Excel',
    defaultPath: 'template_produk.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return { success: false }

  const ws = XLSX.utils.aoa_to_sheet([
    ['Nama Produk', 'Harga Jual', 'Harga Pokok', 'Stok', 'Stok Min', 'Kategori', 'Barcode'],
    ['Contoh Produk A', 10000, 7000, 50, 5, 'Makanan', ''],
    ['Contoh Produk B', 5000, 3000, 100, 10, 'Minuman', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produk')
  XLSX.writeFile(wb, filePath)
  return { success: true }
})
