const { ipcMain } = require('electron')
const stockOpnameRepository = require('../database/stockOpnameRepository')

ipcMain.handle('stockOpname:getAll', () => stockOpnameRepository.findAll())
ipcMain.handle('stockOpname:getById', (_, id) => stockOpnameRepository.findById(id))
ipcMain.handle('stockOpname:create', (_, data) => stockOpnameRepository.create(data))
