const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  getProductByBarcode: (barcode) => ipcRenderer.invoke('products:getByBarcode', barcode),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // Import
  importPreviewProducts: () => ipcRenderer.invoke('import:previewProducts'),
  importExecuteProducts: (rows) => ipcRenderer.invoke('import:executeProducts', rows),
  importDownloadTemplate: () => ipcRenderer.invoke('import:downloadTemplate'),

  // Returns
  createReturn: (data) => ipcRenderer.invoke('returns:create', data),
  getReturns: (filters) => ipcRenderer.invoke('returns:getAll', filters),
  getReturnById: (id) => ipcRenderer.invoke('returns:getById', id),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  loginUser: (id, pin) => ipcRenderer.invoke('users:login', id, pin),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  createCategory: (name) => ipcRenderer.invoke('categories:create', name),
  updateCategory: (id, name) => ipcRenderer.invoke('categories:update', id, name),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),

  // Suppliers
  getSuppliers: () => ipcRenderer.invoke('suppliers:getAll'),
  createSupplier: (data) => ipcRenderer.invoke('suppliers:create', data),
  updateSupplier: (id, data) => ipcRenderer.invoke('suppliers:update', id, data),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),

  // Purchases
  createPurchase: (data) => ipcRenderer.invoke('purchases:create', data),
  getPurchases: (filters) => ipcRenderer.invoke('purchases:getAll', filters),
  getPurchaseById: (id) => ipcRenderer.invoke('purchases:getById', id),
  getUnpaidPurchases: () => ipcRenderer.invoke('purchases:getUnpaid'),
  addPurchasePayment: (id, amount, note) => ipcRenderer.invoke('purchases:addPayment', id, amount, note),
  extendPurchaseDueDate: (id, newDate) => ipcRenderer.invoke('purchases:extendDueDate', id, newDate),
  getPurchasesDueSoon: () => ipcRenderer.invoke('purchases:getDueSoon'),
  getOverduePurchases: () => ipcRenderer.invoke('purchases:getOverdue'),

  // Receivables (Piutang)
  createReceivable: (data) => ipcRenderer.invoke('receivables:create', data),
  getReceivables: (filters) => ipcRenderer.invoke('receivables:getAll', filters),
  getUnpaidReceivables: () => ipcRenderer.invoke('receivables:getUnpaid'),
  addReceivablePayment: (id, amount, note) => ipcRenderer.invoke('receivables:addPayment', id, amount, note),
  extendReceivableDueDate: (id, newDate) => ipcRenderer.invoke('receivables:extendDueDate', id, newDate),
  getReceivablesDueSoon: () => ipcRenderer.invoke('receivables:getDueSoon'),
  getReceivablesSummary: () => ipcRenderer.invoke('receivables:getSummary'),

  // Cash Closing (Tutup Kas)
  getCashClosingByDate: (date) => ipcRenderer.invoke('cashClosing:getByDate', date),
  saveCashClosing: (data) => ipcRenderer.invoke('cashClosing:upsert', data),
  getCashClosings: (filters) => ipcRenderer.invoke('cashClosing:getAll', filters),
  getCashDailySummary: (date) => ipcRenderer.invoke('cashClosing:getDailySummary', date),

  // Transactions
  createTransaction: (data) => ipcRenderer.invoke('transactions:create', data),
  getTransactions: (filters) => ipcRenderer.invoke('transactions:getAll', filters),
  getTransactionById: (id) => ipcRenderer.invoke('transactions:getById', id),

  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('expenses:getAll', filters),
  createExpense: (data) => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  saveSettings: (obj) => ipcRenderer.invoke('settings:setMany', obj),

  // Backup & Restore
  backupDatabase: () => ipcRenderer.invoke('backup:save'),
  restoreDatabase: () => ipcRenderer.invoke('backup:restore'),

  // Print
  printReceipt: (tx) => ipcRenderer.invoke('print:receipt', tx),
  previewReceipt: (tx) => ipcRenderer.invoke('print:preview', tx),

  // Export Excel
  exportSales: (filters) => ipcRenderer.invoke('export:sales', filters),
  exportExpenses: (filters) => ipcRenderer.invoke('export:expenses', filters),
  exportProfitLoss: (filters) => ipcRenderer.invoke('export:profitLoss', filters),

  // Reports
  getSalesReport: (filters) => ipcRenderer.invoke('reports:sales', filters),
  getProfitLossReport: (filters) => ipcRenderer.invoke('reports:profitLoss', filters),
  getDashboardData: () => ipcRenderer.invoke('reports:dashboard'),
  getLowStockReport: () => ipcRenderer.invoke('reports:lowStock'),
})
