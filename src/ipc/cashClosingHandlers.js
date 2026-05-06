const { ipcMain } = require('electron')
const cashClosingRepository = require('../database/cashClosingRepository')

ipcMain.handle('cashClosing:getByDate', (_, date) => cashClosingRepository.getByDate(date))
ipcMain.handle('cashClosing:upsert', (_, data) => cashClosingRepository.upsert(data))
ipcMain.handle('cashClosing:getAll', (_, filters) => cashClosingRepository.findAll(filters))
ipcMain.handle('cashClosing:getDailySummary', (_, date) => cashClosingRepository.getDailySummary(date))
