const { ipcMain } = require('electron')
const shiftRepository = require('../database/shiftRepository')
const activityLogRepository = require('../database/activityLogRepository')
const session = require('../main/session')

ipcMain.handle('shifts:getActive', (_, userId) => shiftRepository.getActive(userId))
ipcMain.handle('shifts:getAll', () => shiftRepository.findAll())
ipcMain.handle('shifts:open', (_, data) => {
  const shift = shiftRepository.open(data)
  const user = session.get()
  activityLogRepository.add({
    userId: user?.id, userName: user?.name,
    action: 'Buka Shift', entity: 'shift',
    details: `Shift #${shift.id} dibuka, kas awal Rp ${data.openingCash.toLocaleString('id-ID')}`,
  })
  return shift
})
ipcMain.handle('shifts:close', (_, shiftId, data) => {
  const shift = shiftRepository.close(shiftId, data)
  const user = session.get()
  activityLogRepository.add({
    userId: user?.id, userName: user?.name,
    action: 'Tutup Shift', entity: 'shift',
    details: `Shift #${shiftId} ditutup, ${shift.total_transactions} transaksi, penjualan Rp ${shift.total_sales.toLocaleString('id-ID')}`,
  })
  return shift
})
