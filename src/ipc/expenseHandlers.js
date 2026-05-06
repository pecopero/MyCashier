const { ipcMain } = require('electron')
const expenseRepository = require('../database/expenseRepository')

ipcMain.handle('expenses:getAll', (_, filters) => expenseRepository.findAll(filters))
ipcMain.handle('expenses:create', (_, data) => expenseRepository.create(data))
ipcMain.handle('expenses:update', (_, id, data) => expenseRepository.update(id, data))
ipcMain.handle('expenses:delete', (_, id) => {
  expenseRepository.delete(id)
  return { success: true }
})
