const { ipcMain } = require('electron')
const cashFlowRepository = require('../database/cashFlowRepository')

ipcMain.handle('reports:cashFlow', (_, filters) => cashFlowRepository.getReport(filters))
