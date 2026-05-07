const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')

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

  checkDueNotifications()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

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
