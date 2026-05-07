const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const session = require('./session')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // Register all IPC handlers
  require('../ipc/productHandlers')
  require('../ipc/transactionHandlers')
  require('../ipc/categoryHandlers')
  require('../ipc/supplierHandlers')
  require('../ipc/purchaseHandlers')
  require('../ipc/expenseHandlers')
  require('../ipc/reportHandlers')
  require('../ipc/settingsHandlers')
  require('../ipc/printHandlers')
  require('../ipc/exportHandlers')
  require('../ipc/receivableHandlers')
  require('../ipc/cashClosingHandlers')
  require('../ipc/returnHandlers')
  require('../ipc/userHandlers')
  require('../ipc/importHandlers')
  require('../ipc/stockOpnameHandlers')
  require('../ipc/promoHandlers')
  require('../ipc/customerHandlers')
  require('../ipc/notificationHandlers')
  require('../ipc/shiftHandlers')
  require('../ipc/activityLogHandlers')
  require('../ipc/labelHandlers')

  // Session management
  ipcMain.handle('session:set', (_, user) => { session.set(user); return { ok: true } })
  ipcMain.handle('session:clear', () => { session.clear(); return { ok: true } })

  checkDueNotifications()
  runAutoBackup()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function runAutoBackup() {
  try {
    const settingsRepository = require('../database/settingsRepository')
    const settings = settingsRepository.getAll()
    if (!settings.auto_backup_enabled || settings.auto_backup_enabled === '0') return
    const folder = settings.auto_backup_folder
    if (!folder || !fs.existsSync(folder)) return

    const today = new Date().toLocaleDateString('en-CA')
    if (settings.last_auto_backup === today) return

    const dbPath = path.join(app.getPath('userData'), 'kasir.db')
    const dest = path.join(folder, `backup-kasir-${today}.db`)
    fs.copyFileSync(dbPath, dest)
    settingsRepository.set('last_auto_backup', today)
  } catch (_) {}
}

function checkDueNotifications() {
  if (!Notification.isSupported()) return
  try {
    const purchaseRepository = require('../database/purchaseRepository')
    const receivableRepository = require('../database/receivableRepository')
    const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    const dueSoonPurchases = purchaseRepository.getDueSoon()
    for (const p of dueSoonPurchases) {
      const sisa = p.total - p.paid_amount
      new Notification({
        title: `Hutang Jatuh Tempo: ${p.supplier_name || 'Supplier'}`,
        body: `Sisa ${fmt(sisa)} — jatuh tempo ${p.due_date}`,
      }).show()
    }

    const overdue = purchaseRepository.getOverdue()
    for (const p of overdue) {
      const sisa = p.total - p.paid_amount
      new Notification({
        title: `⚠ Hutang Sudah Jatuh Tempo!`,
        body: `${p.supplier_name || 'Supplier'}: ${fmt(sisa)} (jatuh tempo ${p.due_date})`,
      }).show()
    }

    const dueSoonRec = receivableRepository.getDueSoon()
    for (const r of dueSoonRec) {
      const sisa = r.total_amount - r.paid_amount
      new Notification({
        title: `Piutang Jatuh Tempo: ${r.customer_name}`,
        body: `Tagihan ${fmt(sisa)} — jatuh tempo ${r.due_date}`,
      }).show()
    }
  } catch (_) {}
}
