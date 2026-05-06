const { ipcMain } = require('electron')
const categoryRepository = require('../database/categoryRepository')

ipcMain.handle('categories:getAll', () => categoryRepository.findAll())
ipcMain.handle('categories:create', (_, name) => categoryRepository.create(name))
ipcMain.handle('categories:update', (_, id, name) => categoryRepository.update(id, name))
ipcMain.handle('categories:delete', (_, id) => {
  categoryRepository.delete(id)
  return { success: true }
})
