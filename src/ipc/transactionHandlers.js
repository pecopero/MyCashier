const { ipcMain } = require('electron')
const transactionRepository = require('../database/transactionRepository')

ipcMain.handle('transactions:create', (_, data) => {
  return transactionRepository.create(data)
})

ipcMain.handle('transactions:getAll', (_, filters) => {
  return transactionRepository.findAll(filters)
})

ipcMain.handle('transactions:getById', (_, id) => {
  return transactionRepository.findById(id)
})

ipcMain.handle('transactions:void', (_, txId, pin) => {
  return transactionRepository.voidTransaction(txId, pin)
})
