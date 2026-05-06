const { ipcMain } = require('electron')
const productRepository = require('../database/productRepository')

ipcMain.handle('products:getAll', () => {
  return productRepository.findAll()
})

ipcMain.handle('products:create', (_, data) => {
  return productRepository.create(data)
})

ipcMain.handle('products:update', (_, id, data) => {
  return productRepository.update(id, data)
})

ipcMain.handle('products:delete', (_, id) => {
  productRepository.delete(id)
  return { success: true }
})

ipcMain.handle('products:getByBarcode', (_, barcode) => productRepository.findByBarcode(barcode))
