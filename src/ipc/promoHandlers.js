const { ipcMain } = require('electron')
const promoRepository = require('../database/promoRepository')

ipcMain.handle('promos:getAll', () => promoRepository.findAll())
ipcMain.handle('promos:getActive', (_, date) => promoRepository.findActive(date))
ipcMain.handle('promos:create', (_, data) => promoRepository.create(data))
ipcMain.handle('promos:update', (_, id, data) => promoRepository.update(id, data))
ipcMain.handle('promos:delete', (_, id) => {
  promoRepository.delete(id)
  return { success: true }
})
