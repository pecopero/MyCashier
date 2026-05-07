const { ipcMain } = require('electron')
const customerRepository = require('../database/customerRepository')

ipcMain.handle('customers:getAll', (_, search) => customerRepository.findAll(search || ''))
ipcMain.handle('customers:create', (_, data) => customerRepository.create(data))
ipcMain.handle('customers:update', (_, id, data) => customerRepository.update(id, data))
ipcMain.handle('customers:delete', (_, id) => {
  customerRepository.delete(id)
  return { success: true }
})
