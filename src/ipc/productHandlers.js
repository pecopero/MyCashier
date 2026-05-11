const { ipcMain } = require('electron')
const productRepository = require('../database/productRepository')
const priceHistoryRepository = require('../database/priceHistoryRepository')
const session = require('../main/session')

ipcMain.handle('products:getAll', () => productRepository.findAll())
ipcMain.handle('products:create', (_, data) => productRepository.create(data))

ipcMain.handle('products:update', (_, id, data) => {
  const old = productRepository.findById(id)
  const updated = productRepository.update(id, data)
  if (old && (old.price !== data.price || old.cost_price !== data.cost_price)) {
    priceHistoryRepository.record({
      productId: id,
      productName: updated.name,
      oldPrice: old.price,
      newPrice: data.price ?? old.price,
      oldCostPrice: old.cost_price,
      newCostPrice: data.cost_price ?? old.cost_price,
      changedBy: session.get()?.name || null,
    })
  }
  return updated
})

ipcMain.handle('products:delete', (_, id) => {
  productRepository.delete(id)
  return { success: true }
})

ipcMain.handle('products:getByBarcode', (_, barcode) => productRepository.findByBarcode(barcode))
