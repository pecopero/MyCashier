const { ipcMain } = require('electron')
const returnRepository = require('../database/returnRepository')

ipcMain.handle('returns:create', (_, data) => returnRepository.create(data))
ipcMain.handle('returns:getAll', (_, filters) => returnRepository.findAll(filters))
ipcMain.handle('returns:getById', (_, id) => returnRepository.findById(id))
