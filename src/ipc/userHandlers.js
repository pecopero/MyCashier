const { ipcMain } = require('electron')
const userRepository = require('../database/userRepository')

ipcMain.handle('users:getAll', () => userRepository.findAll())
ipcMain.handle('users:login', (_, id, pin) => userRepository.loginById(id, pin))
ipcMain.handle('users:create', (_, data) => userRepository.create(data))
ipcMain.handle('users:update', (_, id, data) => userRepository.update(id, data))
ipcMain.handle('users:delete', (_, id) => { userRepository.delete(id); return { success: true } })
