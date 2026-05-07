const { ipcMain } = require('electron')
const activityLogRepository = require('../database/activityLogRepository')

ipcMain.handle('activityLog:add', (_, entry) => activityLogRepository.add(entry))
ipcMain.handle('activityLog:getAll', (_, filters) => activityLogRepository.findAll(filters || {}))
