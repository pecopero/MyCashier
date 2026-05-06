# Kasir App

> 🇮🇩 [Bahasa Indonesia](#bahasa-indonesia) &nbsp;|&nbsp; 🇬🇧 [English](#english)

---

## Bahasa Indonesia

Aplikasi kasir desktop lengkap untuk toko kecil hingga menengah, dibangun dengan **Electron + React + SQLite**. Berjalan sepenuhnya offline tanpa koneksi internet — data tersimpan lokal di komputer.

### Fitur Utama

**Kasir & Transaksi**
- Antarmuka kasir yang cepat dengan grid produk dan keranjang belanja
- **Barcode scanner** — scan barcode, produk langsung masuk keranjang
- **Multi metode pembayaran** — Tunai, Transfer, QRIS, atau split (campuran)
- Diskon nominal maupun persen per transaksi
- **Catat piutang pelanggan** langsung dari kasir (bayar sebagian / full kredit)
- Preview & print struk thermal 58mm

**Manajemen Produk**
- CRUD produk: harga jual, HPP, stok, stok minimum, kategori, barcode
- Indikator margin keuntungan per produk
- Alert stok menipis / habis secara visual
- **Import produk massal dari Excel** (dengan template unduhan)

**Pembelian & Hutang Supplier**
- Catat pembelian dengan pilihan **bayar tunai atau kredit (jatuh tempo)**
- Bayar hutang bertahap (cicil) atau lunas sekaligus
- **Perpanjang jatuh tempo** jika negosiasi ulang dengan supplier
- **Notifikasi native OS** otomatis H-2 dan H-1 sebelum jatuh tempo

**Piutang Pelanggan**
- Lacak siapa yang berhutang, berapa, dan kapan jatuh tempo
- Terima pembayaran sebagian atau lunas
- Alert jatuh tempo di dashboard

**Laporan & Analitik**
- Laporan Penjualan — omzet, diskon, HPP, laba kotor, produk terlaris
- Laporan Laba Rugi — penjualan bersih → HPP → laba kotor → pengeluaran → laba bersih
- Dashboard dengan grafik 7 hari & alert hutang/piutang jatuh tempo
- Export laporan ke Excel

**Tutup Kas Harian**
- Input kas awal & kas fisik aktual di akhir hari
- Hitung otomatis selisih kas (lebih/kurang)

**Retur / Refund**
- Pilih item & jumlah yang diretur dari transaksi manapun
- Stok dikembalikan otomatis ke sistem

**Multi User & Login**
- Login dengan PIN 6 digit
- Role **Pemilik** (akses penuh) & **Kasir** (hanya kasir & dashboard)

**Lain-lain**
- Backup & Restore database satu klik
- Pengaturan toko (nama, alamat, telepon, catatan struk, pajak)
- 100% offline, data tersimpan lokal

### Menjalankan di Mode Development

**Prasyarat:** Node.js 20+

```bash
git clone https://github.com/pecopero/MyCashier.git
cd MyCashier
npm install
npm run dev
```

### Build Installer

```bash
npm run build:win   # Windows (.exe)
npm run build:mac   # macOS (.dmg)
```

Output tersimpan di folder `dist-electron/`. Build Windows bisa dilakukan otomatis via **GitHub Actions** — buka tab Actions dan jalankan workflow *Build Windows Installer*.

---

## English

A full-featured desktop cashier (POS) application for small to medium businesses, built with **Electron + React + SQLite**. Works entirely offline — all data is stored locally on the machine.

### Key Features

**Cashier & Transactions**
- Fast cashier interface with product grid and shopping cart
- **Barcode scanner support** — scan a barcode and it's instantly added to the cart
- **Multiple payment methods** — Cash, Bank Transfer, QRIS, or split payment
- Per-transaction discounts (flat amount or percentage)
- **Record customer credit (receivables)** directly at checkout
- Preview & print 58mm thermal receipts

**Product Management**
- Full CRUD: selling price, cost price, stock, minimum stock, category, barcode
- Profit margin indicator per product
- Visual low stock / out-of-stock alerts
- **Bulk product import from Excel** (with downloadable template)

**Purchases & Supplier Debt**
- Record stock purchases with **cash or credit (due date)** payment options
- Pay supplier debt in installments or in full
- **Extend due dates** if renegotiated with suppliers
- **Native OS notifications** automatically at 2 days and 1 day before due date

**Customer Receivables**
- Track who owes money, how much, and when it's due
- Accept partial or full payments
- Due date alerts on the dashboard

**Reports & Analytics**
- Sales Report — revenue, discounts, COGS, gross profit, top products
- Profit & Loss — gross sales → discounts → COGS → gross profit → expenses → net profit
- Dashboard with 7-day chart & debt/receivable due date alerts
- Export reports to Excel

**Daily Cash Reconciliation**
- Input opening cash & actual physical cash at end of day
- Auto-calculate expected vs. actual cash with difference

**Returns / Refunds**
- Select items and quantities to return from any past transaction
- Stock is automatically restored to inventory

**Multi-User & Login**
- 6-digit PIN login per user
- **Owner** role (full access) & **Cashier** role (cashier & dashboard only)

**Other**
- One-click database Backup & Restore
- Store settings (name, address, phone, receipt note, tax)
- 100% offline — no internet required

### Running in Development

**Requirements:** Node.js 20+

```bash
git clone https://github.com/pecopero/MyCashier.git
cd MyCashier
npm install
npm run dev
```

### Building the Installer

```bash
npm run build:win   # Windows (.exe installer)
npm run build:mac   # macOS (.dmg)
```

Output is saved to `dist-electron/`. Windows builds can also be triggered automatically via **GitHub Actions** — go to the Actions tab and run the *Build Windows Installer* workflow.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Electron](https://electronjs.org) | Cross-platform desktop framework |
| [React 18](https://react.dev) | UI library |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Local SQLite database |
| [SheetJS (xlsx)](https://sheetjs.com) | Excel export & import |

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.js    # Entry point & OS notifications
│   └── preload.js  # IPC bridge renderer ↔ main
├── ipc/            # Feature handlers (products, transactions, etc.)
├── database/       # Repository pattern per entity + SQLite schema
└── renderer/       # React application
    ├── pages/      # Main pages (Kasir, Products, Reports, etc.)
    ├── components/ # Reusable components
    ├── hooks/      # Custom React hooks
    ├── context/    # Auth context
    └── utils/      # Currency & date formatters
```

---

## License

Copyright © 2025 pecopero. All Rights Reserved.

This code is published for portfolio purposes only. Copying, modifying, or distributing this code without explicit written permission from the author is not permitted.
