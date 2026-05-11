const { contextBridge, ipcRenderer } = require('electron')

// Electron 33 sandboxed preload: only require('electron') is allowed.
// fetch() is available as a browser global. ipcRenderer handles all local IPC.

// --- Network config (lazy, non-blocking) ---
// We start fetching config immediately; all invoke() calls await it before routing.
let _cfg = null
let _cfgReady = false
const _cfgQueue = []
ipcRenderer.invoke('network:getConfig').then(cfg => {
  _cfg = cfg || {}
}).catch(() => {
  _cfg = {}
}).finally(() => {
  _cfgReady = true
  _cfgQueue.forEach(resolve => resolve(_cfg))
  _cfgQueue.length = 0
})

function awaitConfig() {
  if (_cfgReady) return Promise.resolve(_cfg)
  return new Promise(resolve => _cfgQueue.push(resolve))
}

// --- Channels that always run locally (file dialogs, printing, session, config) ---
const LOCAL = new Set([
  'print:receipt', 'print:preview', 'print:getInstalledPrinters',
  'labels:print', 'labels:preview',
  'backup:save', 'backup:restore', 'backup:pickFolder',
  'import:previewProducts', 'import:downloadTemplate',
  'export:sales', 'export:expenses', 'export:profitLoss', 'export:stock', 'export:purchases',
  'export:productProfit', 'export:priceHistory', 'export:cashier',
  'session:set', 'session:clear',
  'shell:openExternal',
  'network:getConfig', 'network:setConfig', 'network:getLocalIPs',
])

// --- RPC fetch via browser's native fetch (sandbox-safe) ---
async function rpcFetch(serverUrl, channel, args) {
  const res = await fetch(`${serverUrl}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, args }),
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json()
  if ('error' in data) throw new Error(data.error)
  return data.result
}

// --- Unified invoke: routes to local IPC or remote RPC ---
async function invoke(channel, ...args) {
  const cfg = await awaitConfig()
  const isClient = cfg.mode === 'client' && !!cfg.serverUrl
  if (isClient && !LOCAL.has(channel)) {
    return rpcFetch(cfg.serverUrl, channel, args)
  }
  return ipcRenderer.invoke(channel, ...args)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Products
  getProducts: () => invoke('products:getAll'),
  getProductByBarcode: (barcode) => invoke('products:getByBarcode', barcode),
  createProduct: (data) => invoke('products:create', data),
  updateProduct: (id, data) => invoke('products:update', id, data),
  deleteProduct: (id) => invoke('products:delete', id),

  // Import
  importPreviewProducts: () => ipcRenderer.invoke('import:previewProducts'),
  importExecuteProducts: (rows) => invoke('import:executeProducts', rows),
  importDownloadTemplate: () => ipcRenderer.invoke('import:downloadTemplate'),

  // Returns
  createReturn: (data) => invoke('returns:create', data),
  getReturns: (filters) => invoke('returns:getAll', filters),
  getReturnById: (id) => invoke('returns:getById', id),

  // Users
  getUsers: () => invoke('users:getAll'),
  loginUser: (id, pin) => invoke('users:login', id, pin),
  createUser: (data) => invoke('users:create', data),
  updateUser: (id, data) => invoke('users:update', id, data),
  deleteUser: (id) => invoke('users:delete', id),

  // Product Units (Satuan)
  getProductUnits: (productId) => invoke('productUnits:getByProduct', productId),
  getAllProductUnits: () => invoke('productUnits:getAllGrouped'),
  saveProductUnits: (productId, units) => invoke('productUnits:saveAll', productId, units),

  // Categories
  getCategories: () => invoke('categories:getAll'),
  createCategory: (name) => invoke('categories:create', name),
  updateCategory: (id, name) => invoke('categories:update', id, name),
  deleteCategory: (id) => invoke('categories:delete', id),

  // Suppliers
  getSuppliers: () => invoke('suppliers:getAll'),
  createSupplier: (data) => invoke('suppliers:create', data),
  updateSupplier: (id, data) => invoke('suppliers:update', id, data),
  deleteSupplier: (id) => invoke('suppliers:delete', id),

  // Purchases
  createPurchase: (data) => invoke('purchases:create', data),
  getPurchases: (filters) => invoke('purchases:getAll', filters),
  getPurchaseById: (id) => invoke('purchases:getById', id),
  getUnpaidPurchases: () => invoke('purchases:getUnpaid'),
  addPurchasePayment: (id, amount, note) => invoke('purchases:addPayment', id, amount, note),
  extendPurchaseDueDate: (id, newDate) => invoke('purchases:extendDueDate', id, newDate),
  getPurchasesDueSoon: () => invoke('purchases:getDueSoon'),
  getOverduePurchases: () => invoke('purchases:getOverdue'),

  // Receivables (Piutang)
  createReceivable: (data) => invoke('receivables:create', data),
  getReceivables: (filters) => invoke('receivables:getAll', filters),
  getUnpaidReceivables: () => invoke('receivables:getUnpaid'),
  addReceivablePayment: (id, amount, note) => invoke('receivables:addPayment', id, amount, note),
  extendReceivableDueDate: (id, newDate) => invoke('receivables:extendDueDate', id, newDate),
  getReceivablesDueSoon: () => invoke('receivables:getDueSoon'),
  getReceivablesSummary: () => invoke('receivables:getSummary'),

  // Cash Closing (Tutup Kas)
  getCashClosingByDate: (date) => invoke('cashClosing:getByDate', date),
  saveCashClosing: (data) => invoke('cashClosing:upsert', data),
  getCashClosings: (filters) => invoke('cashClosing:getAll', filters),
  getCashDailySummary: (date) => invoke('cashClosing:getDailySummary', date),

  // Transactions
  createTransaction: (data) => invoke('transactions:create', data),
  getTransactions: (filters) => invoke('transactions:getAll', filters),
  getTransactionById: (id) => invoke('transactions:getById', id),

  // Expenses
  getExpenses: (filters) => invoke('expenses:getAll', filters),
  getCashOut: (filters) => invoke('expenses:getCashOut', filters),
  createExpense: (data) => invoke('expenses:create', data),
  updateExpense: (id, data) => invoke('expenses:update', id, data),
  deleteExpense: (id) => invoke('expenses:delete', id),

  // Settings
  getSettings: () => invoke('settings:getAll'),
  saveSettings: (obj) => invoke('settings:setMany', obj),

  // Backup & Restore (always local)
  backupDatabase: () => ipcRenderer.invoke('backup:save'),
  restoreDatabase: () => ipcRenderer.invoke('backup:restore'),

  // Print (always local)
  printReceipt: (tx) => ipcRenderer.invoke('print:receipt', tx),
  previewReceipt: (tx, settingsOverride) => ipcRenderer.invoke('print:preview', tx, settingsOverride),
  getInstalledPrinters: () => ipcRenderer.invoke('print:getInstalledPrinters'),

  // Export Excel (always local — file dialog)
  exportSales: (filters) => ipcRenderer.invoke('export:sales', filters),
  exportExpenses: (filters) => ipcRenderer.invoke('export:expenses', filters),
  exportProfitLoss: (filters) => ipcRenderer.invoke('export:profitLoss', filters),
  exportStock: () => ipcRenderer.invoke('export:stock'),
  exportPurchases: (filters) => ipcRenderer.invoke('export:purchases', filters),

  // Reports
  getSalesReport: (filters) => invoke('reports:sales', filters),
  getProfitLossReport: (filters) => invoke('reports:profitLoss', filters),
  getPurchaseReport: (filters) => invoke('reports:purchases', filters),
  getStockValueReport: () => invoke('reports:stockValue'),
  getDashboardData: () => invoke('reports:dashboard'),
  getLowStockReport: () => invoke('reports:lowStock'),
  getSalesChart: (days) => invoke('reports:salesChart', { days }),
  getCashierReport: (filters) => invoke('reports:byCashier', filters),

  // Labels (always local)
  printLabels: (items) => ipcRenderer.invoke('labels:print', items),
  previewLabels: (items) => ipcRenderer.invoke('labels:preview', items),

  // Session (always local)
  setSession: (user) => ipcRenderer.invoke('session:set', user),
  clearSession: () => ipcRenderer.invoke('session:clear'),

  // Shifts
  getActiveShift: (userId) => invoke('shifts:getActive', userId),
  getAllShifts: () => invoke('shifts:getAll'),
  openShift: (data) => invoke('shifts:open', data),
  closeShift: (shiftId, data) => invoke('shifts:close', shiftId, data),

  // Activity Log
  addActivityLog: (entry) => invoke('activityLog:add', entry),
  getActivityLog: (filters) => invoke('activityLog:getAll', filters),

  // Auto-backup folder picker (always local)
  pickBackupFolder: () => ipcRenderer.invoke('backup:pickFolder'),

  // Customers
  getCustomers: (search) => invoke('customers:getAll', search),
  createCustomer: (data) => invoke('customers:create', data),
  updateCustomer: (id, data) => invoke('customers:update', id, data),
  deleteCustomer: (id) => invoke('customers:delete', id),

  // Notifications
  getNotificationCounts: () => invoke('notifications:getCounts'),

  // Stock Opname
  getStockOpnames: () => invoke('stockOpname:getAll'),
  getStockOpnameById: (id) => invoke('stockOpname:getById', id),
  createStockOpname: (data) => invoke('stockOpname:create', data),

  // Cash Flow
  getCashFlowReport: (filters) => invoke('reports:cashFlow', filters),

  // Void
  voidTransaction: (txId, pin) => invoke('transactions:void', txId, pin),

  // Monthly / Annual Closing
  previewMonthlyClosing: (year, month) => invoke('monthlyClosing:preview', year, month),
  closeMonth: (year, month, pin, notes) => invoke('monthlyClosing:close', year, month, pin, notes),
  getMonthlyClosing: (year, month) => invoke('monthlyClosing:getByMonth', year, month),
  getAnnualClosing: (year) => invoke('monthlyClosing:annual', year),
  getClosingYears: () => invoke('monthlyClosing:getYears'),

  // Promos
  getPromos: () => invoke('promos:getAll'),
  getActivePromos: (date) => invoke('promos:getActive', date),
  createPromo: (data) => invoke('promos:create', data),
  updatePromo: (id, data) => invoke('promos:update', id, data),
  deletePromo: (id) => invoke('promos:delete', id),

  // Product Reports
  getProductProfitReport: (filters) => invoke('reports:profitByProduct', filters),
  getTopProducts: (period) => invoke('reports:topProducts', { period }),

  // Price History
  getPriceHistoryByProduct: (productId) => invoke('priceHistory:getByProduct', productId),
  getAllPriceHistory: (filters) => invoke('priceHistory:getAll', filters),

  // Open URL in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Extra exports (always local — file dialog)
  exportProductProfit: (filters) => ipcRenderer.invoke('export:productProfit', filters),
  exportPriceHistory: (filters) => ipcRenderer.invoke('export:priceHistory', filters),
  exportCashierReport: (filters) => ipcRenderer.invoke('export:cashier', filters),

  // Network config (always local)
  getNetworkConfig: () => ipcRenderer.invoke('network:getConfig'),
  setNetworkConfig: (cfg) => ipcRenderer.invoke('network:setConfig', cfg),
  getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
  networkPing: () => invoke('network:ping'),

  // Static network mode (read from cached config after first call)
  getNetworkMode: () => awaitConfig().then(cfg => cfg.mode || 'standalone'),
  getNetworkServerUrl: () => awaitConfig().then(cfg => cfg.serverUrl || ''),
})
