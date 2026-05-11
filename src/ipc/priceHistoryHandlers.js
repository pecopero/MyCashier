const { ipcMain } = require('electron')
const priceHistoryRepository = require('../database/priceHistoryRepository')

ipcMain.handle('priceHistory:getByProduct', (_, productId) => priceHistoryRepository.getByProduct(productId))
ipcMain.handle('priceHistory:getAll', (_, filters) => priceHistoryRepository.getAll(filters || {}))
