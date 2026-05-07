const { ipcMain } = require('electron')
const productUnitRepository = require('../database/productUnitRepository')

ipcMain.handle('productUnits:getByProduct', (_, productId) =>
  productUnitRepository.findByProduct(productId))

ipcMain.handle('productUnits:getAllGrouped', () =>
  productUnitRepository.findAllGrouped())

ipcMain.handle('productUnits:saveAll', (_, productId, units) =>
  productUnitRepository.saveAll(productId, units))
