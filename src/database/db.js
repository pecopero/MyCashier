const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const DB_PATH = path.join(app.getPath('userData'), 'kasir.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
    migrate()
  }
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO categories (name) VALUES ('Umum'), ('Makanan'), ('Minuman');

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('store_name',    'Toko Saya'),
      ('store_address', ''),
      ('store_phone',   ''),
      ('receipt_note',  'Terima kasih atas kunjungan Anda!'),
      ('tax_percent',   '0');

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      category TEXT DEFAULT 'Umum',
      barcode TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      supplier_name TEXT,
      total REAL NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL DEFAULT 'cash',
      due_date TEXT,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'paid',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS receivables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'unpaid',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS receivable_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receivable_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receivable_id) REFERENCES receivables(id)
    );

    CREATE TABLE IF NOT EXISTS cash_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      opening_cash REAL NOT NULL DEFAULT 0,
      expected_cash REAL NOT NULL DEFAULT 0,
      actual_cash REAL NOT NULL DEFAULT 0,
      difference REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      total_refund REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES returns(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'kasir',
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO users (id, name, pin, role) VALUES (1, 'Owner', '123456', 'owner');

    CREATE TABLE IF NOT EXISTS stock_opnames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_opname_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opname_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      system_stock INTEGER NOT NULL,
      actual_stock INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      FOREIGN KEY (opname_id) REFERENCES stock_opnames(id)
    );

    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'percent',
      value REAL NOT NULL DEFAULT 0,
      min_purchase REAL NOT NULL DEFAULT 0,
      product_id INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'Lain-lain',
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL DEFAULT (date('now','localtime')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'nominal',
      total REAL NOT NULL,
      payment REAL NOT NULL,
      change REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
  `)
}

// Migrasi kolom baru untuk database yang sudah ada sebelumnya
function migrate() {
  const migrations = [
    `ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 5`,
    `ALTER TABLE transaction_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN subtotal REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN discount REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'nominal'`,
    `ALTER TABLE purchases ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'cash'`,
    `ALTER TABLE purchases ADD COLUMN due_date TEXT`,
    `ALTER TABLE purchases ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE purchases ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'`,
    `ALTER TABLE transactions ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'cash'`,
    `ALTER TABLE transactions ADD COLUMN customer_name TEXT`,
    `ALTER TABLE transactions ADD COLUMN customer_phone TEXT`,
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch { /* kolom sudah ada, skip */ }
  }
}

module.exports = { getDb }
