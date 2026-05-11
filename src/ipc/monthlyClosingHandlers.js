const { ipcMain } = require('electron')
const monthlyClosingRepository = require('../database/monthlyClosingRepository')

ipcMain.handle('monthlyClosing:preview', (_, year, month) => {
  return monthlyClosingRepository.computeMonth(year, month)
})

ipcMain.handle('monthlyClosing:close', (_, year, month, pin, notes) => {
  return monthlyClosingRepository.closeMonth(year, month, pin, notes)
})

ipcMain.handle('monthlyClosing:getByMonth', (_, year, month) => {
  return monthlyClosingRepository.findByMonth(year, month)
})

ipcMain.handle('monthlyClosing:annual', (_, year) => {
  return monthlyClosingRepository.getAnnual(year)
})

ipcMain.handle('monthlyClosing:getYears', () => {
  return monthlyClosingRepository.getAvailableYears()
})
