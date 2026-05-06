const { ipcMain } = require('electron')
const supplierRepository = require('../database/supplierRepository')

ipcMain.handle('suppliers:getAll', () => supplierRepository.findAll())
ipcMain.handle('suppliers:create', (_, data) => supplierRepository.create(data))
ipcMain.handle('suppliers:update', (_, id, data) => supplierRepository.update(id, data))
ipcMain.handle('suppliers:delete', (_, id) => {
  supplierRepository.delete(id)
  return { success: true }
})
