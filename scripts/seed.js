#!/usr/bin/env node
/**
 * Data dummy seeder untuk Kasir App
 * Jalankan: node scripts/seed.js
 * Reset ulang: node scripts/seed.js --force
 */

const path = require('path')
const os   = require('os')
const fs   = require('fs')

// ─── Cari path database ─────────────────────────────────────────────────────
function getDbPath() {
  const app = 'cashier-app'
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', app, 'kasir.db')
    case 'win32':
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app, 'kasir.db')
    default:
      return path.join(os.homedir(), '.config', app, 'kasir.db')
  }
}

const dbPath = getDbPath()
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database tidak ditemukan:', dbPath)
  console.error('   Jalankan app minimal sekali terlebih dahulu agar database dibuat.')
  process.exit(1)
}

const Database = require('better-sqlite3')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Pastikan kolom-kolom baru (dari migrasi) sudah ada
;[
  `ALTER TABLE products ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN wholesale_min_qty REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE transactions ADD COLUMN is_void INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE transaction_items ADD COLUMN unit_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE transaction_items ADD COLUMN conversion REAL NOT NULL DEFAULT 1`,
  `ALTER TABLE transaction_items ADD COLUMN item_discount REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE transaction_items ADD COLUMN item_discount_type TEXT NOT NULL DEFAULT 'nominal'`,
  `ALTER TABLE transactions ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'cash'`,
  `ALTER TABLE transactions ADD COLUMN customer_name TEXT`,
  `ALTER TABLE transactions ADD COLUMN customer_phone TEXT`,
  `ALTER TABLE transactions ADD COLUMN shift_id INTEGER`,
  `ALTER TABLE transactions ADD COLUMN user_id INTEGER`,
  `ALTER TABLE transactions ADD COLUMN user_name TEXT`,
  `CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    old_price REAL NOT NULL DEFAULT 0,
    new_price REAL NOT NULL DEFAULT 0,
    old_cost_price REAL NOT NULL DEFAULT 0,
    new_cost_price REAL NOT NULL DEFAULT 0,
    changed_by TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`,
].forEach(sql => { try { db.exec(sql) } catch {} })

// Cek sudah di-seed atau belum
const seeded = db.prepare("SELECT value FROM settings WHERE key = 'dummy_seeded'").get()
if (seeded && !process.argv.includes('--force')) {
  console.log('ℹ  Data dummy sudah ada. Gunakan --force untuk seed ulang (data lama akan DIHAPUS).')
  process.exit(0)
}

// ─── Helper ─────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick  = arr => arr[Math.floor(Math.random() * arr.length)]
const pad2  = n => String(n).padStart(2, '0')

function localTs(daysBack = 0, hour = null) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  d.setHours(hour ?? rand(8, 20), rand(0, 59), rand(0, 59), 0)
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function localDate(daysBack = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
}

// Tanggal N hari setelah suatu hari-lalu  (bisa negatif = mundur lebih jauh)
function dateAfter(daysBack, plusDays) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack + plusDays)
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
}

// ─── Hapus data lama jika --force ───────────────────────────────────────────
if (process.argv.includes('--force')) {
  console.log('🗑  Menghapus data lama...')
  db.exec(`
    DELETE FROM activity_logs;
    DELETE FROM stock_opname_items;
    DELETE FROM stock_opnames;
    DELETE FROM cash_closings;
    DELETE FROM receivable_payments;
    DELETE FROM receivables;
    DELETE FROM transaction_payments;
    DELETE FROM transaction_items;
    DELETE FROM transactions;
    DELETE FROM purchase_payments;
    DELETE FROM purchase_items;
    DELETE FROM purchases;
    DELETE FROM product_units;
    DELETE FROM promos;
    DELETE FROM shifts;
    DELETE FROM expenses;
    DELETE FROM customers;
    DELETE FROM suppliers;
    DELETE FROM products WHERE id > 0;
    DELETE FROM categories WHERE name NOT IN ('Umum','Makanan','Minuman');
    DELETE FROM users WHERE id > 1;
    DELETE FROM price_history;
    DELETE FROM settings WHERE key = 'dummy_seeded';
  `)
}

console.log('🌱 Mulai seeding data dummy...\n')

// ═══════════════════════════════════════════════════════════════════════════
// 1. KATEGORI
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORIES = ['Bahan Dasar','Lemak & Minyak','Susu & Produk Susu','Pengembang',
  'Coklat & Perisa','Isian & Topping','Plastik Kemasan','Kemasan Kue','Alat Bantu']
const insCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)')
CATEGORIES.forEach(c => insCategory.run(c))
console.log(`✓ ${CATEGORIES.length} kategori`)

// ═══════════════════════════════════════════════════════════════════════════
// 2. USERS (kasir tambahan)
// ═══════════════════════════════════════════════════════════════════════════
;[
  ['Budi Santoso', '111111', 'kasir'],
  ['Siti Aminah',  '222222', 'kasir'],
  ['Rudi Hartono', '333333', 'kasir'],
].forEach(([name, pin, role]) =>
  db.prepare('INSERT OR IGNORE INTO users (name,pin,role,active) VALUES (?,?,?,1)').run(name, pin, role)
)
const ALL_USERS    = db.prepare('SELECT id,name,role FROM users WHERE active=1').all()
const KASIR_USERS  = ALL_USERS.filter(u => u.role === 'kasir')
const ALL_OP_USERS = ALL_USERS  // untuk shift
console.log(`✓ ${ALL_USERS.length} users`)

// ═══════════════════════════════════════════════════════════════════════════
// 3. SUPPLIER
// ═══════════════════════════════════════════════════════════════════════════
const SUPPLIERS_DATA = [
  ['PT. Indomarco Adi Prima',   '021-55123456', 'Jakarta Barat'],
  ['CV. Sumber Rejeki',         '024-76543210', 'Semarang'],
  ['UD. Berkah Jaya Makmur',    '031-87654321', 'Surabaya'],
  ['PT. Wings Food Indonesia',  '021-65432109', 'Jakarta Timur'],
  ['CV. Maju Bersama Sejahtera','022-54321098', 'Bandung'],
  ['UD. Sari Rasa Nusantara',   '0274-4321098', 'Yogyakarta'],
  ['PT. Mayora Indah Tbk',      '021-76543219', 'Tangerang'],
  ['CV. Rejeki Berlimpah',      '0341-321098',  'Malang'],
  ['UD. Karya Mandiri',         '0361-234567',  'Bali'],
  ['PT. Sinar Mas Agro',        '021-87654320', 'Jakarta Selatan'],
]
const insSup = db.prepare('INSERT OR IGNORE INTO suppliers (name,phone,address) VALUES (?,?,?)')
SUPPLIERS_DATA.forEach(s => insSup.run(...s))
const SUPPLIERS = db.prepare('SELECT id,name FROM suppliers').all()
console.log(`✓ ${SUPPLIERS.length} supplier`)

// ═══════════════════════════════════════════════════════════════════════════
// 4. PELANGGAN
// ═══════════════════════════════════════════════════════════════════════════
const CUST_NAMES = [
  'Hendra Gunawan','Sri Wahyuni','Andi Pratama','Dewi Rahayu','Joko Susilo',
  'Ratna Sari','Bambang Hermawan','Yuni Astuti','Agus Salim','Lestari Indah',
  'Doni Firmansyah','Mega Wati','Rizki Ramadhan','Nini Kurniawati','Farid Hidayat',
  'Suci Pertiwi','Wahyu Nugroho','Rina Marlina','Dian Kusuma','Tono Santoso',
  'Fitri Handayani','Sigit Pramono','Wulan Dari','Beny Setiawan','Lina Novita',
  'Agung Prasetyo','Endah Sulistyowati','Hary Wijaya','Nurul Hidayah','Imam Santoso',
]
const CUST_PHONES = Array.from({length: 30}, (_, i) => `0812${String(i).padStart(8,'0')}`)
const insCust = db.prepare('INSERT OR IGNORE INTO customers (name,phone) VALUES (?,?)')
CUST_NAMES.forEach((name, i) => insCust.run(name, CUST_PHONES[i]))
const CUSTOMERS = db.prepare('SELECT id,name,phone FROM customers').all()
console.log(`✓ ${CUSTOMERS.length} pelanggan`)

// ═══════════════════════════════════════════════════════════════════════════
// 5. PRODUK  (tema: toko bahan roti & plastik kemasan)
// ═══════════════════════════════════════════════════════════════════════════
// [name, price, cost, stock, min_stock, unit, category, barcode, wholesale_price, wholesale_min_qty]
const PRODUCTS_DATA = [
  // ── Tepung & Bahan Dasar ────────────────────────────────────────────────
  ['Tepung Terigu Cakra Kembar 1kg',    14000, 11500, 200, 50, 'kg',     'Bahan Dasar',  '8991201001', 13000, 25],
  ['Tepung Terigu Segitiga Biru 1kg',   13000, 10500, 200, 50, 'kg',     'Bahan Dasar',  '8991201002', 12000, 25],
  ['Tepung Terigu Kunci Biru 1kg',      12500, 10000, 150, 40, 'kg',     'Bahan Dasar',  '8991201003', 11500, 25],
  ['Tepung Maizena Rose Brand 500g',    12000,  9500,  80, 20, 'bungkus','Bahan Dasar',  '8991201004',     0,  0],
  ['Tepung Beras Rose Brand 500g',       9000,  7200,  60, 15, 'bungkus','Bahan Dasar',  '8991201005',     0,  0],
  ['Tepung Panir/Roti 500g',            14000, 11000,  50, 12, 'bungkus','Bahan Dasar',  '8991201006',     0,  0],
  ['Tepung Ketan 500g',                 10000,  7800,  50, 12, 'bungkus','Bahan Dasar',  '8991201007',     0,  0],
  ['Gula Pasir 1kg',                    16500, 14000, 300, 60, 'kg',     'Bahan Dasar',  '8991201008', 15500, 25],
  ['Gula Halus 500g',                   12000,  9500,  80, 20, 'bungkus','Bahan Dasar',  '8991201009', 11000, 10],
  ['Gula Merah/Aren 500g',              14000, 11000,  60, 15, 'bungkus','Bahan Dasar',  '8991201010',     0,  0],
  ['Gula Palm/Jawa 250g',               10000,  8000,  50, 12, 'bungkus','Bahan Dasar',  '8991201011',     0,  0],

  // ── Lemak & Minyak ─────────────────────────────────────────────────────
  ['Margarin Blueband 200g',            16000, 13000,  80, 20, 'pcs',    'Lemak & Minyak','8991202001', 15000, 12],
  ['Margarin Blueband 1kg',             62000, 52000,  40, 10, 'pcs',    'Lemak & Minyak','8991202002', 59000,  5],
  ['Mentega Anchor 227g',               49000, 42000,  30, 10, 'pcs',    'Lemak & Minyak','8991202003',     0,  0],
  ['Mentega Wijsman Unsalted 227g',     55000, 47000,  24,  8, 'pcs',    'Lemak & Minyak','8991202004',     0,  0],
  ['Shortening Palmia 500g',            25000, 20000,  40, 10, 'pcs',    'Lemak & Minyak','8991202005', 23000, 10],
  ['Minyak Goreng Bimoli 2L',           35000, 30000,  80, 20, 'botol',  'Lemak & Minyak','8991202006', 33000, 12],
  ['Mentega Putih / Crisco 500g',       28000, 23000,  30, 10, 'pcs',    'Lemak & Minyak','8991202007',     0,  0],

  // ── Susu & Produk Susu ─────────────────────────────────────────────────
  ['Susu Kental Manis Frisian 370g',    18000, 14500, 100, 24, 'kaleng', 'Susu & Produk Susu','8991203001', 16500, 24],
  ['Susu Full Cream Indomilk 400g',     62000, 53000,  40, 10, 'bungkus','Susu & Produk Susu','8991203002', 58000,  5],
  ['Susu Evaporasi Carnation 380g',     22000, 18000,  50, 12, 'kaleng', 'Susu & Produk Susu','8991203003',     0,  0],
  ['Heavy Cream Elle & Vire 200ml',     35000, 29000,  30, 10, 'pcs',    'Susu & Produk Susu','8991203004',     0,  0],
  ['Whipping Cream Anchor 1L',          95000, 80000,  20,  5, 'pcs',    'Susu & Produk Susu','8991203005',     0,  0],
  ['Cream Cheese Anchor 250g',          75000, 63000,  24,  8, 'pcs',    'Susu & Produk Susu','8991203006',     0,  0],
  ['Keju Cheddar Kraft 165g',           42000, 35000,  40, 10, 'pcs',    'Susu & Produk Susu','8991203007', 39000, 12],
  ['Susu Full Cream UHT Ultra 1L',      20000, 16000,  60, 15, 'kotak',  'Susu & Produk Susu','8991203008', 18500, 12],

  // ── Pengembang & Emulsifier ─────────────────────────────────────────────
  ['Ragi Instan Fermipan 11g',           4500,  3200, 200, 50, 'sachet', 'Pengembang',   '8991204001',  4000, 20],
  ['Ragi Instan SAF Gold 11g',           5000,  3800, 150, 40, 'sachet', 'Pengembang',   '8991204002',  4500, 20],
  ['Baking Powder Koepoe 14g',           5000,  3500,  80, 20, 'pcs',    'Pengembang',   '8991204003',     0,  0],
  ['Baking Soda/Soda Kue 100g',          6000,  4500,  60, 15, 'pcs',    'Pengembang',   '8991204004',     0,  0],
  ['SP / Ovalet / Emulsifier 100g',     12000,  9000,  60, 15, 'pcs',    'Pengembang',   '8991204005', 11000, 10],
  ['Cream of Tartar 100g',               8000,  6000,  40, 10, 'pcs',    'Pengembang',   '8991204006',     0,  0],
  ['Gelatin Swallow Globe 10g',         10000,  7500,  50, 12, 'pcs',    'Pengembang',   '8991204007',     0,  0],
  ['Agar-Agar Swallow Globe 7g',         4000,  2800, 120, 30, 'sachet', 'Pengembang',   '8991204008',  3500, 24],

  // ── Coklat & Perisa ────────────────────────────────────────────────────
  ['Coklat DCC Compound 1kg',           65000, 55000,  30,  8, 'kg',     'Coklat & Perisa','8991205001', 62000,  5],
  ['Coklat Milk Compound 1kg',          60000, 50000,  30,  8, 'kg',     'Coklat & Perisa','8991205002', 57000,  5],
  ['Coklat White Compound 1kg',         62000, 52000,  24,  6, 'kg',     'Coklat & Perisa','8991205003',     0,  0],
  ['Cocoa Powder Van Houten 200g',      45000, 37000,  40, 10, 'pcs',    'Coklat & Perisa','8991205004',     0,  0],
  ['Choco Chips 250g',                  22000, 17000,  50, 12, 'bungkus','Coklat & Perisa','8991205005', 20000, 10],
  ['Pasta Pandan Koepoe 30ml',          10000,  7500,  60, 15, 'botol',  'Coklat & Perisa','8991205006',  9000, 12],
  ['Pasta Strawberry Koepoe 30ml',      10000,  7500,  50, 12, 'botol',  'Coklat & Perisa','8991205007',     0,  0],
  ['Pasta Coklat Koepoe 30ml',          10000,  7500,  50, 12, 'botol',  'Coklat & Perisa','8991205008',     0,  0],
  ['Vanili Bubuk 100g',                 12000,  9000,  60, 15, 'pcs',    'Coklat & Perisa','8991205009',     0,  0],
  ['Essens Rum 30ml',                   10000,  7500,  40, 10, 'botol',  'Coklat & Perisa','8991205010',     0,  0],
  ['Food Coloring Set 8 warna',         25000, 20000,  30,  8, 'set',    'Coklat & Perisa','8991205011',     0,  0],
  ['Meses Coklat 250g',                 12000,  9000,  80, 20, 'bungkus','Coklat & Perisa','8991205012', 11000, 10],

  // ── Isian & Topping ────────────────────────────────────────────────────
  ['Selai Strawberry Morin 200g',       18000, 14500,  60, 15, 'pcs',    'Isian & Topping','8991206001',     0,  0],
  ['Selai Kacang Skippy Creamy 340g',   38000, 31000,  30, 10, 'pcs',    'Isian & Topping','8991206002',     0,  0],
  ['Selai Nanas 200g',                  16000, 12500,  50, 12, 'pcs',    'Isian & Topping','8991206003',     0,  0],
  ['Kismis 250g',                       18000, 14000,  50, 12, 'bungkus','Isian & Topping','8991206004',     0,  0],
  ['Kacang Kenari 250g',                35000, 29000,  30,  8, 'bungkus','Isian & Topping','8991206005',     0,  0],
  ['Almond Slice 250g',                 45000, 37000,  24,  6, 'bungkus','Isian & Topping','8991206006',     0,  0],
  ['Kelapa Parut Kering 200g',          14000, 11000,  40, 10, 'bungkus','Isian & Topping','8991206007',     0,  0],
  ['Wijen Sangrai 100g',                 8000,  6000,  60, 15, 'bungkus','Isian & Topping','8991206008',     0,  0],
  ['Gula Pasir Kasar / Dekor 500g',     15000, 12000,  40, 10, 'bungkus','Isian & Topping','8991206009',     0,  0],
  ['Madu Asli 300ml',                   55000, 45000,  24,  6, 'botol',  'Isian & Topping','8991206010',     0,  0],

  // ── Plastik Kemasan ────────────────────────────────────────────────────
  ['Plastik OPP 20x30cm 1pak',          15000, 11500, 100, 20, 'pak',    'Plastik Kemasan','8991207001', 13500, 10],
  ['Plastik OPP 30x40cm 1pak',          20000, 15500,  80, 15, 'pak',    'Plastik Kemasan','8991207002', 18000, 10],
  ['Plastik Mika Roll 30cm 50m',        55000, 45000,  30,  8, 'roll',   'Plastik Kemasan','8991207003', 52000,  5],
  ['Plastik PP 1/4kg (100 lembar)',      8000,  6000, 150, 30, 'pak',    'Plastik Kemasan','8991207004',  7000, 20],
  ['Plastik PP 1/2kg (100 lembar)',     10000,  7500, 120, 25, 'pak',    'Plastik Kemasan','8991207005',  9000, 20],
  ['Plastik PP 1kg (100 lembar)',       12000,  9000, 100, 20, 'pak',    'Plastik Kemasan','8991207006', 11000, 20],
  ['Plastik Ziplock 17x25cm 50pcs',     18000, 14000,  60, 15, 'pak',    'Plastik Kemasan','8991207007', 16500, 10],
  ['Plastik Ziplock 25x35cm 50pcs',     25000, 19500,  50, 12, 'pak',    'Plastik Kemasan','8991207008', 23000, 10],
  ['Cling Wrap Sania 30cm 50m',         28000, 22000,  40, 10, 'roll',   'Plastik Kemasan','8991207009',     0,  0],
  ['Aluminium Foil Houseware 30cm 10m', 22000, 17000,  40, 10, 'roll',   'Plastik Kemasan','8991207010',     0,  0],

  // ── Kemasan Kue & Kotak ────────────────────────────────────────────────
  ['Kotak Mika Donat isi 4 (10pcs)',    15000, 11500,  80, 20, 'pak',    'Kemasan Kue',  '8991208001', 13500, 10],
  ['Kotak Mika Kue Slice 10x10 (10pcs)',14000, 10500,  80, 20, 'pak',    'Kemasan Kue',  '8991208002', 12500, 10],
  ['Box Cake Ulang Tahun 20x20',         8000,  6000,  50, 12, 'pcs',    'Kemasan Kue',  '8991208003',  7000, 10],
  ['Box Cake Ulang Tahun 25x25',        10000,  7500,  40, 10, 'pcs',    'Kemasan Kue',  '8991208004',  9000, 10],
  ['Box Roti Tawar 1pak (50pcs)',        35000, 28000,  30,  8, 'pak',    'Kemasan Kue',  '8991208005', 32000,  5],
  ['Paper Bag Coklat 24x10x30 1pak',    28000, 22000,  50, 10, 'pak',    'Kemasan Kue',  '8991208006', 25000,  5],
  ['Cup Mika Pudding 150ml (50pcs)',     22000, 17000,  60, 12, 'pak',    'Kemasan Kue',  '8991208007', 20000, 10],
  ['Standing Pouch Bening 14x21 50pcs', 30000, 24000,  40, 10, 'pak',    'Kemasan Kue',  '8991208008', 27000,  5],
  ['Stiker Label Bulat 4cm (100pcs)',    12000,  9000,  80, 20, 'pak',    'Kemasan Kue',  '8991208009', 10500, 10],
  ['Pita Satin 1cm 25m',                15000, 11500,  50, 12, 'roll',   'Kemasan Kue',  '8991208010',     0,  0],

  // ── Alat Bantu ─────────────────────────────────────────────────────────
  ['Kertas Roti / Parchment 50x70 100L',45000, 37000,  30,  8, 'pak',    'Alat Bantu',   '8991209001', 42000,  5],
  ['Cup Cake Liner Polos 50pcs',         8000,  6000, 100, 20, 'pak',    'Alat Bantu',   '8991209002',  7000, 10],
  ['Cup Cake Liner Motif 50pcs',        10000,  7500,  80, 20, 'pak',    'Alat Bantu',   '8991209003',  9000, 10],
  ['Loyang Brownies 22x10',             25000, 19000,  20,  5, 'pcs',    'Alat Bantu',   '8991209004',     0,  0],
  ['Loyang Bundt/Tulban 22cm',          35000, 27000,  15,  4, 'pcs',    'Alat Bantu',   '8991209005',     0,  0],
  ['Loyang Chiffon 22cm',               40000, 32000,  12,  4, 'pcs',    'Alat Bantu',   '8991209006',     0, 0],
  ['Lilin Angka 1 set (0-9)',           18000, 14000,  40, 10, 'set',    'Alat Bantu',   '8991209007',     0,  0],
  ['Sedotan Kertas Warna 25pcs',         8000,  6000,  60, 15, 'pak',    'Alat Bantu',   '8991209008',  7000, 10],
  ['Tusuk Sate / Bambu 25cm 100pcs',     7000,  5000,  80, 20, 'pak',    'Alat Bantu',   '8991209009',  6000, 10],
  ['Lakban Bening 2 inch 40m',          12000,  9000,  60, 15, 'roll',   'Alat Bantu',   '8991209010', 10500, 10],
]

const insProd = db.prepare(`
  INSERT OR IGNORE INTO products (name,price,cost_price,stock,min_stock,unit,category,barcode,wholesale_price,wholesale_min_qty)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`)
PRODUCTS_DATA.forEach(p => insProd.run(...p))
const PRODUCTS = db.prepare('SELECT * FROM products').all()
console.log(`✓ ${PRODUCTS.length} produk`)

// ═══════════════════════════════════════════════════════════════════════════
// 6. SATUAN TAMBAHAN (product_units)
// ═══════════════════════════════════════════════════════════════════════════
const insUnit = db.prepare('INSERT OR IGNORE INTO product_units (product_id,unit_name,conversion,price,is_default) VALUES (?,?,?,?,?)')
const UNIT_MAPPINGS = [
  { name: 'Tepung Terigu Cakra Kembar 1kg',   units: [{ u:'sak',    c:25,  p:325000, d:0 }, { u:'karung', c:50,  p:640000, d:1 }] },
  { name: 'Tepung Terigu Segitiga Biru 1kg',  units: [{ u:'sak',    c:25,  p:300000, d:1 }] },
  { name: 'Tepung Terigu Kunci Biru 1kg',     units: [{ u:'sak',    c:25,  p:285000, d:1 }] },
  { name: 'Gula Pasir 1kg',                   units: [{ u:'karung', c:50,  p:775000, d:1 }] },
  { name: 'Ragi Instan Fermipan 11g',         units: [{ u:'pak',    c:10,  p:40000,  d:1 }] },
  { name: 'Ragi Instan SAF Gold 11g',         units: [{ u:'pak',    c:10,  p:45000,  d:1 }] },
  { name: 'Agar-Agar Swallow Globe 7g',       units: [{ u:'pak',    c:10,  p:35000,  d:1 }] },
  { name: 'Margarin Blueband 200g',           units: [{ u:'karton', c:24,  p:360000, d:1 }] },
  { name: 'Margarin Blueband 1kg',            units: [{ u:'karton', c:6,   p:354000, d:1 }] },
  { name: 'Minyak Goreng Bimoli 2L',          units: [{ u:'karton', c:6,   p:198000, d:1 }] },
  { name: 'Susu Kental Manis Frisian 370g',   units: [{ u:'karton', c:24,  p:396000, d:1 }] },
  { name: 'Susu Full Cream UHT Ultra 1L',     units: [{ u:'karton', c:12,  p:222000, d:1 }] },
  { name: 'Coklat DCC Compound 1kg',          units: [{ u:'karton', c:10,  p:620000, d:1 }] },
  { name: 'Coklat Milk Compound 1kg',         units: [{ u:'karton', c:10,  p:570000, d:1 }] },
  { name: 'Choco Chips 250g',                 units: [{ u:'pak',    c:5,   p:100000, d:1 }] },
  { name: 'Plastik OPP 20x30cm 1pak',         units: [{ u:'karton', c:10,  p:135000, d:1 }] },
  { name: 'Plastik OPP 30x40cm 1pak',         units: [{ u:'karton', c:10,  p:180000, d:1 }] },
  { name: 'Plastik PP 1/4kg (100 lembar)',    units: [{ u:'karton', c:10,  p:70000,  d:1 }] },
  { name: 'Plastik PP 1kg (100 lembar)',      units: [{ u:'karton', c:10,  p:110000, d:1 }] },
  { name: 'Cup Cake Liner Polos 50pcs',       units: [{ u:'karton', c:10,  p:70000,  d:1 }] },
  { name: 'Cup Cake Liner Motif 50pcs',       units: [{ u:'karton', c:10,  p:90000,  d:1 }] },
  { name: 'Kertas Roti / Parchment 50x70 100L', units: [{ u:'karton', c:5, p:210000, d:1 }] },
]
UNIT_MAPPINGS.forEach(({ name, units }) => {
  const prod = PRODUCTS.find(p => p.name === name)
  if (!prod) return
  units.forEach(({ u, c, p, d }) => insUnit.run(prod.id, u, c, p, d))
})
console.log(`✓ Satuan tambahan produk`)

// ═══════════════════════════════════════════════════════════════════════════
// 7. PROMO
// ═══════════════════════════════════════════════════════════════════════════
;[
  ['Diskon Akhir Bulan 5%',       'percent', 5,  100000, localDate(15), localDate(0),   1],
  ['Promo Belanja 10% Min 200rb', 'percent', 10, 200000, localDate(7),  localDate(-14), 1],
  ['Diskon Rp 5.000 Min 50rb',   'nominal', 5000, 50000, localDate(30), localDate(-15), 1],
  ['Promo Lebaran 15%',          'percent', 15,  150000, localDate(90), localDate(60),  0],
  ['Flash Sale Weekend 20%',     'percent', 20,  100000, localDate(14), localDate(8),   0],
].forEach(row =>
  db.prepare('INSERT OR IGNORE INTO promos (name,type,value,min_purchase,start_date,end_date,active) VALUES (?,?,?,?,?,?,?)').run(...row)
)
console.log(`✓ Promo`)

// ═══════════════════════════════════════════════════════════════════════════
// 8. SHIFT (90 hari)
// ═══════════════════════════════════════════════════════════════════════════
const insShift2 = db.prepare(`
  INSERT INTO shifts (user_id,user_name,opened_at,closed_at,opening_cash,closing_cash,total_sales,total_transactions,note,status)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`)
const SHIFT_IDS = {}
for (let day = 89; day >= 0; day--) {
  const user     = pick(ALL_OP_USERS)
  const openH    = rand(7, 9)
  const closeH   = rand(17, 21)
  const openCash = pick([500000, 1000000, 2000000])
  const sales    = rand(800000, 8000000)
  const txCount  = rand(10, 30)
  const res = insShift2.run(
    user.id, user.name,
    localTs(day, openH), localTs(day, closeH),
    openCash, openCash + sales * 0.7,
    sales, txCount, '', 'closed'
  )
  SHIFT_IDS[day] = { id: res.lastInsertRowid, userId: user.id, userName: user.name }
}
console.log(`✓ 90 shift`)

// ═══════════════════════════════════════════════════════════════════════════
// 9. PEMBELIAN (70 pembelian, 90 hari)
// ═══════════════════════════════════════════════════════════════════════════
const insPurchase = db.prepare(`
  INSERT INTO purchases (supplier_id,supplier_name,total,payment_type,due_date,paid_amount,status,note,created_at)
  VALUES (?,?,?,?,?,?,?,?,?)
`)
const insPurchItem = db.prepare(`
  INSERT INTO purchase_items (purchase_id,product_id,product_name,quantity,cost_price,subtotal) VALUES (?,?,?,?,?,?)
`)
const insPurchPay = db.prepare(`
  INSERT INTO purchase_payments (purchase_id,amount,note,created_at) VALUES (?,?,?,?)
`)

const seedPurchases = db.transaction(() => {
  for (let i = 0; i < 70; i++) {
    const day      = rand(0, 89)
    const supplier = pick(SUPPLIERS)
    const numItems = rand(3, 10)
    let total = 0
    const items = []
    for (let j = 0; j < numItems; j++) {
      const prod    = pick(PRODUCTS)
      const qty     = rand(10, 100)
      const sub     = prod.cost_price * qty
      total += sub
      items.push({ prod, qty, sub })
    }
    total = Math.round(total)

    const payType   = Math.random() < 0.55 ? 'cash' : 'credit'
    const paidInit  = payType === 'cash' ? total : (Math.random() < 0.4 ? 0 : Math.round(total * rand(20,60)/100))
    const status    = paidInit >= total ? 'paid' : paidInit > 0 ? 'partial' : 'unpaid'
    const dueDate   = payType === 'credit' ? dateAfter(day, -rand(14, 45)) : null
    const created   = localTs(day, rand(8, 16))

    const res = insPurchase.run(supplier.id, supplier.name, total, payType, dueDate, paidInit, status, '', created)
    const pid = res.lastInsertRowid
    items.forEach(({ prod, qty, sub }) => insPurchItem.run(pid, prod.id, prod.name, qty, prod.cost_price, sub))

    if (paidInit > 0) insPurchPay.run(pid, paidInit, 'Pembayaran awal', created)

    // Tambah pelunasan untuk partial
    if (status === 'partial' && day > 7 && Math.random() < 0.5) {
      const sisa    = total - paidInit
      const payDay  = rand(0, day - 1)
      const payTime = localTs(payDay, rand(9, 16))
      insPurchPay.run(pid, sisa, 'Pelunasan', payTime)
      db.prepare('UPDATE purchases SET paid_amount=?, status=? WHERE id=?').run(total, 'paid', pid)
    }
  }
})
seedPurchases()
console.log(`✓ 70 pembelian`)

// ═══════════════════════════════════════════════════════════════════════════
// 10. TRANSAKSI PENJUALAN (90 hari × 8-22 tx/hari ≈ 1.300+ transaksi)
// ═══════════════════════════════════════════════════════════════════════════
const insTx = db.prepare(`
  INSERT INTO transactions
    (subtotal,discount,discount_type,total,payment,change,note,payment_type,
     customer_name,customer_phone,shift_id,user_id,user_name,is_void,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
`)
const insTxItem = db.prepare(`
  INSERT INTO transaction_items
    (transaction_id,product_id,product_name,price,cost_price,quantity,subtotal,
     item_discount,item_discount_type,unit_name,conversion)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
`)
const insTxPay = db.prepare(`INSERT INTO transaction_payments (transaction_id,method,amount) VALUES (?,?,?)`)
const insRec   = db.prepare(`
  INSERT INTO receivables (transaction_id,customer_name,customer_phone,total_amount,paid_amount,due_date,status,note,created_at)
  VALUES (?,?,?,?,?,?,?,?,?)
`)
const insRecPay = db.prepare(`INSERT INTO receivable_payments (receivable_id,amount,note,created_at) VALUES (?,?,?,?)`)

const PAY_METHODS = ['cash','cash','cash','cash','transfer','transfer','qris','cash']
const DENOMINATIONS = [5000,10000,20000,50000,100000,100000,200000,500000]

let totalTx = 0

const seedTx = db.transaction(() => {
  for (let day = 89; day >= 0; day--) {
    const shift   = SHIFT_IDS[day]
    const numTx   = rand(8, 22)

    for (let t = 0; t < numTx; t++) {
      const numItems = rand(1, 6)
      let subtotal   = 0
      const txItems  = []

      for (let i = 0; i < numItems; i++) {
        const prod  = pick(PRODUCTS)
        const qty   = rand(1, 5)
        const price = prod.price
        const sub   = price * qty
        subtotal   += sub
        txItems.push({ prod, qty, price, sub })
      }

      // Diskon sesekali
      let discount = 0, discType = 'nominal'
      if (Math.random() < 0.12) {
        discType = 'percent'; discount = pick([5, 10, 15])
      } else if (Math.random() < 0.08) {
        discount = pick([1000, 2000, 5000])
      }
      const discAmt = discType === 'percent' ? Math.round(subtotal * discount / 100) : discount
      const total   = Math.max(0, subtotal - discAmt)

      // Pembayaran
      const isCredit  = Math.random() < 0.05
      const payMethod = isCredit ? 'credit' : pick(PAY_METHODS)
      let payment = total, change = 0
      let custName = '', custPhone = ''

      if (!isCredit) {
        const denom = DENOMINATIONS.find(d => d >= total) || Math.ceil(total / 50000) * 50000
        payment = denom
        change  = denom - total
      } else {
        const cust = pick(CUSTOMERS)
        custName   = cust.name
        custPhone  = cust.phone || ''
        payment    = 0
      }

      const hour    = rand(8, 20)
      const created = localTs(day, hour)
      const user    = shift || pick(ALL_OP_USERS)

      const res  = insTx.run(subtotal, discount, discType, total, payment, change, '',
        payMethod, custName, custPhone, shift?.id || null, user.userId || user.id, user.userName || user.name, created)
      const txId = res.lastInsertRowid

      txItems.forEach(({ prod, qty, price, sub }) => {
        const itemDisc     = Math.random() < 0.05 ? rand(100, 500) * 10 : 0
        const finalSub     = Math.max(0, sub - itemDisc)
        insTxItem.run(txId, prod.id, prod.name, price, prod.cost_price, qty, finalSub,
          itemDisc, 'nominal', prod.unit || 'pcs', 1)
      })

      if (!isCredit) {
        insTxPay.run(txId, payMethod, payment)
      } else {
        const dueDate = dateAfter(day, -rand(7, 30))
        const isPaid  = day > 10 && Math.random() < 0.65
        const recRes  = insRec.run(txId, custName, custPhone, total, 0,
          dueDate, isPaid ? 'paid' : 'unpaid', '', created)
        if (isPaid) {
          const payDay  = Math.max(0, day - rand(1, 10))
          const payTime = localTs(payDay, rand(9, 17))
          insRecPay.run(recRes.lastInsertRowid, total, 'Pelunasan', payTime)
          db.prepare('UPDATE receivables SET paid_amount=?,status=? WHERE id=?').run(total, 'paid', recRes.lastInsertRowid)
        }
      }

      totalTx++
    }
  }
})
seedTx()
console.log(`✓ ${totalTx} transaksi penjualan (90 hari)`)

// ═══════════════════════════════════════════════════════════════════════════
// 11. PENGELUARAN / BIAYA
// ═══════════════════════════════════════════════════════════════════════════
const insExp = db.prepare('INSERT INTO expenses (category,amount,note,date,created_at) VALUES (?,?,?,?,?)')

const DAILY_EXPENSES = [
  ['Operasional', [25000,50000], ['Kantong Plastik','Kertas Struk','Tisu Kasir','Karbon/Nota']],
  ['Lain-lain',   [15000,75000], ['Bensin Motor','Parkir','Konsumsi Kasir','Biaya Kirim']],
]
const MONTHLY_EXPENSES = [
  ['Sewa',        [3500000, 5000000], ['Sewa Tempat Usaha']],
  ['Gaji & Upah', [1500000, 4500000], ['Gaji Karyawan Bulanan']],
  ['Listrik & Air',[300000, 700000],  ['Tagihan Listrik PLN','Tagihan PDAM']],
  ['Internet',    [200000, 350000],   ['Tagihan Internet Indihome']],
]

const seedExp = db.transaction(() => {
  for (let day = 89; day >= 0; day--) {
    // Pengeluaran harian (70% hari ada biaya kecil)
    if (Math.random() < 0.70) {
      const ec  = pick(DAILY_EXPENSES)
      const amt = rand(ec[1][0], ec[1][1])
      const note= pick(ec[2])
      insExp.run(ec[0], amt, note, localDate(day), localTs(day, rand(8,18)))
    }

    // Pengeluaran bulanan (sekitar tgl 1-3)
    const dom = new Date(); dom.setDate(dom.getDate() - day)
    if (dom.getDate() <= 3) {
      MONTHLY_EXPENSES.forEach(([cat, [lo, hi], notes]) => {
        if (Math.random() < 0.85) {
          insExp.run(cat, rand(lo, hi), pick(notes), localDate(day), localTs(day, rand(8,12)))
        }
      })
    }

    // Tagihan listrik sekitar tgl 15
    if (dom.getDate() === 15 || dom.getDate() === 16) {
      insExp.run('Listrik & Air', rand(350000, 650000), 'Tagihan Listrik PLN', localDate(day), localTs(day, 9))
    }
  }
})
seedExp()
console.log(`✓ Pengeluaran / biaya`)

// ═══════════════════════════════════════════════════════════════════════════
// 12. TUTUP KAS (90 hari)
// ═══════════════════════════════════════════════════════════════════════════
const insClose = db.prepare(`
  INSERT OR IGNORE INTO cash_closings (date,opening_cash,expected_cash,actual_cash,difference,note,created_at)
  VALUES (?,?,?,?,?,?,?)
`)
for (let day = 89; day >= 1; day--) {
  const openCash = pick([500000, 1000000, 2000000])
  const expected = openCash + rand(600000, 6000000)
  const diff     = pick([-50000,-20000,-10000,-5000,0,0,0,0,5000,10000,20000])
  const actual   = expected + diff
  insClose.run(localDate(day), openCash, expected, actual, diff,
    diff !== 0 ? (diff < 0 ? 'Selisih kurang kas' : 'Kelebihan kas') : '',
    localTs(day, rand(20, 22)))
}
console.log(`✓ 89 tutup kas`)

// ═══════════════════════════════════════════════════════════════════════════
// 13. STOCK OPNAME (4 kali)
// ═══════════════════════════════════════════════════════════════════════════
const insOpname = db.prepare('INSERT INTO stock_opnames (date,note,created_at) VALUES (?,?,?)')
const insOpItem = db.prepare(`
  INSERT INTO stock_opname_items (opname_id,product_id,product_name,system_stock,actual_stock,difference)
  VALUES (?,?,?,?,?,?)
`)
;[80, 55, 28, 5].forEach(day => {
  const res = insOpname.run(localDate(day), 'Stock opname rutin bulanan', localTs(day, 8))
  PRODUCTS.forEach(p => {
    const diff = pick([-5,-3,-2,-1,-1,0,0,0,0,1,2])
    insOpItem.run(res.lastInsertRowid, p.id, p.name, p.stock, p.stock + diff, diff)
  })
})
console.log(`✓ 4 stock opname`)

// ═══════════════════════════════════════════════════════════════════════════
// 14. ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════
const insLog = db.prepare(`
  INSERT INTO activity_logs (user_id,user_name,action,entity,details,created_at) VALUES (?,?,?,?,?,?)
`)
const LOG_ACTIONS = [
  ['Tambah Produk','products'],['Edit Produk','products'],['Hapus Produk','products'],
  ['Import Produk','products'],['Cetak Label','products'],
  ['Buat Pembelian','purchases'],['Bayar Hutang','purchases'],
  ['Edit Pengaturan','settings'],['Backup Database','settings'],
  ['Export Laporan','reports'],['Cetak Struk','transactions'],
  ['Void Transaksi','transactions'],['Buat Promo','promos'],['Edit Promo','promos'],
  ['Tambah Pelanggan','customers'],['Tambah Supplier','suppliers'],
]
const seedLog = db.transaction(() => {
  for (let i = 0; i < 300; i++) {
    const day  = rand(0, 89)
    const user = pick(ALL_USERS)
    const [action, entity] = pick(LOG_ACTIONS)
    insLog.run(user.id, user.name, action, entity, JSON.stringify({ ref: rand(1,200) }), localTs(day))
  }
})
seedLog()
console.log(`✓ 300 activity log`)

// ═══════════════════════════════════════════════════════════════════════════
// 15. RIWAYAT PERUBAHAN HARGA
// ═══════════════════════════════════════════════════════════════════════════
const insPriceHistory = db.prepare(`
  INSERT INTO price_history (product_id,product_name,old_price,new_price,old_cost_price,new_cost_price,changed_by,changed_at)
  VALUES (?,?,?,?,?,?,?,?)
`)

// Simulasi ~30 perubahan harga selama 90 hari terakhir
const PRICE_CHANGE_SCENARIOS = [
  // produk yang sering berubah harganya (bahan pokok)
  { name: 'Tepung Terigu Cakra Kembar 1kg',  changes: [
    { daysBack: 85, oldP: 13000, newP: 14000, oldC: 10500, newC: 11500 },
    { daysBack: 42, oldP: 14000, newP: 13500, oldC: 11500, newC: 11000 },
    { daysBack: 12, oldP: 13500, newP: 14000, oldC: 11000, newC: 11500 },
  ]},
  { name: 'Gula Pasir 1kg', changes: [
    { daysBack: 75, oldP: 15000, newP: 16000, oldC: 12500, newC: 13500 },
    { daysBack: 30, oldP: 16000, newP: 16500, oldC: 13500, newC: 14000 },
  ]},
  { name: 'Minyak Goreng Bimoli 2L', changes: [
    { daysBack: 88, oldP: 32000, newP: 35000, oldC: 27000, newC: 30000 },
    { daysBack: 60, oldP: 35000, newP: 33000, oldC: 30000, newC: 28500 },
    { daysBack: 20, oldP: 33000, newP: 35000, oldC: 28500, newC: 30000 },
  ]},
  { name: 'Margarin Blueband 200g', changes: [
    { daysBack: 70, oldP: 14500, newP: 16000, oldC: 12000, newC: 13000 },
    { daysBack: 25, oldP: 16000, newP: 15500, oldC: 13000, newC: 12500 },
  ]},
  { name: 'Susu Kental Manis Frisian 370g', changes: [
    { daysBack: 80, oldP: 17000, newP: 18000, oldC: 13500, newC: 14500 },
  ]},
  { name: 'Coklat DCC Compound 1kg', changes: [
    { daysBack: 65, oldP: 60000, newP: 65000, oldC: 50000, newC: 55000 },
    { daysBack: 18, oldP: 65000, newP: 62000, oldC: 55000, newC: 52000 },
  ]},
  { name: 'Ragi Instan Fermipan 11g', changes: [
    { daysBack: 55, oldP: 4000, newP: 4500, oldC: 3000, newC: 3200 },
  ]},
  { name: 'Cream Cheese Anchor 250g', changes: [
    { daysBack: 50, oldP: 70000, newP: 75000, oldC: 58000, newC: 63000 },
  ]},
  { name: 'Whipping Cream Anchor 1L', changes: [
    { daysBack: 45, oldP: 88000, newP: 95000, oldC: 74000, newC: 80000 },
  ]},
  { name: 'Keju Cheddar Kraft 165g', changes: [
    { daysBack: 72, oldP: 38000, newP: 42000, oldC: 32000, newC: 35000 },
    { daysBack: 15, oldP: 42000, newP: 40000, oldC: 35000, newC: 33000 },
  ]},
  { name: 'Plastik OPP 20x30cm 1pak', changes: [
    { daysBack: 40, oldP: 13500, newP: 15000, oldC: 10500, newC: 11500 },
  ]},
  { name: 'Tepung Terigu Segitiga Biru 1kg', changes: [
    { daysBack: 78, oldP: 12000, newP: 13000, oldC: 9500, newC: 10500 },
  ]},
  { name: 'Mentega Anchor 227g', changes: [
    { daysBack: 33, oldP: 46000, newP: 49000, oldC: 39000, newC: 42000 },
  ]},
  { name: 'Cocoa Powder Van Houten 200g', changes: [
    { daysBack: 58, oldP: 42000, newP: 45000, oldC: 34000, newC: 37000 },
  ]},
]

const insPH = db.transaction(() => {
  PRICE_CHANGE_SCENARIOS.forEach(({ name, changes }) => {
    const prod = PRODUCTS.find(p => p.name === name)
    if (!prod) return
    changes.forEach(({ daysBack, oldP, newP, oldC, newC }) => {
      const user = pick(ALL_USERS)
      insPriceHistory.run(
        prod.id, prod.name,
        oldP, newP, oldC, newC,
        user.name,
        localTs(daysBack, rand(9, 17))
      )
    })
  })
})
insPH()

const phCount = PRICE_CHANGE_SCENARIOS.reduce((s, x) => s + x.changes.length, 0)
console.log(`✓ ${phCount} riwayat perubahan harga`)

// ═══════════════════════════════════════════════════════════════════════════
// SELESAI
// ═══════════════════════════════════════════════════════════════════════════
db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('dummy_seeded','1')").run()
db.close()

console.log(`
╔══════════════════════════════════════════════════════╗
║            ✅  DATA DUMMY BERHASIL DIBUAT            ║
╠══════════════════════════════════════════════════════╣
║  Produk        : ${String(PRODUCTS.length).padEnd(35)}║
║  Supplier      : ${String(SUPPLIERS.length).padEnd(35)}║
║  Pelanggan     : ${String(CUSTOMERS.length).padEnd(35)}║
║  Transaksi     : ~${String(totalTx).padEnd(34)}║
║  Pembelian     : 70                                  ║
║  Pengeluaran   : ±90–120 entri                       ║
║  Tutup Kas     : 89 hari                             ║
║  Stock Opname  : 4 kali                              ║
║  Activity Log  : 300 entri                           ║
║  Riwayat Harga : ~30 perubahan harga                 ║
║  Periode data  : 90 hari terakhir                    ║
╠══════════════════════════════════════════════════════╣
║  Restart app agar data tampil!                       ║
╚══════════════════════════════════════════════════════╝
`)
