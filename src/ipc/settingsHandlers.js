const { ipcMain, app } = require('electron')
const { dialog, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const settingsRepository = require('../database/settingsRepository')

ipcMain.handle('settings:getAll', () => settingsRepository.getAll())
ipcMain.handle('settings:setMany', (_, obj) => { settingsRepository.setMany(obj); return { success: true } })

// ── Backup ──────────────────────────────────────────────────────────────────
ipcMain.handle('backup:save', async () => {
  const dbPath = path.join(app.getPath('userData'), 'kasir.db')
  const now = new Date().toISOString().slice(0, 10)
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Simpan Backup Database',
    defaultPath: `backup-kasir-${now}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { success: false }
  fs.copyFileSync(dbPath, filePath)
  return { success: true, filePath }
})

ipcMain.handle('backup:pickFolder', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Pilih Folder Auto-Backup',
    properties: ['openDirectory'],
  })
  if (canceled || !filePaths.length) return { success: false }
  return { success: true, folder: filePaths[0] }
})

ipcMain.handle('backup:restore', async () => {
  const dbPath = path.join(app.getPath('userData'), 'kasir.db')
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Pilih File Backup',
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths.length) return { success: false }

  fs.copyFileSync(filePaths[0], dbPath)
  return { success: true, restart: true }
})
