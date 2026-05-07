import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Kasir from './pages/Kasir'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Hutang from './pages/Hutang'
import Piutang from './pages/Piutang'
import TutupKas from './pages/TutupKas'
import Returns from './pages/Returns'
import Login from './pages/Login'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import StockOpname from './pages/StockOpname'
import StockReport from './pages/StockReport'
import Promos from './pages/Promos'
import PurchaseReport from './pages/PurchaseReport'

const OWNER_GROUPS = [
  {
    items: [{ to: '/', label: 'Dashboard' }],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { to: '/kasir',   label: 'Kasir' },
      { to: '/sales',   label: 'Penjualan' },
      { to: '/returns', label: 'Retur' },
    ],
  },
  {
    title: 'INVENTORI',
    items: [
      { to: '/products',      label: 'Produk' },
      { to: '/promos',        label: 'Promo' },
      { to: '/stock-opname',  label: 'Stock Opname' },
      { to: '/stock-report',  label: 'Lap. Stok' },
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      { to: '/purchases',       label: 'Pembelian' },
      { to: '/purchase-report', label: 'Lap. Pembelian' },
      { to: '/hutang',          label: 'Hutang' },
      { to: '/piutang',         label: 'Piutang' },
      { to: '/expenses',        label: 'Pengeluaran' },
      { to: '/tutup-kas',       label: 'Tutup Kas' },
    ],
  },
  {
    title: 'MANAJEMEN',
    items: [
      { to: '/customers', label: 'Pelanggan' },
      { to: '/suppliers', label: 'Supplier' },
      { to: '/reports',   label: 'Laporan' },
      { to: '/settings',  label: 'Pengaturan' },
    ],
  },
]

const KASIR_GROUPS = [
  {
    items: [
      { to: '/',      label: 'Dashboard' },
      { to: '/kasir', label: 'Kasir' },
    ],
  },
]

function BellIcon({ counts, onClick }) {
  const total = counts?.total ?? 0
  return (
    <button onClick={onClick} title="Notifikasi jatuh tempo"
      className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {total > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  )
}

function NotifPanel({ counts, onClose, onNavigate }) {
  if (!counts || counts.total === 0) return (
    <div className="absolute bottom-16 left-2 right-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
      <p className="text-sm text-gray-400 text-center">Tidak ada tagihan jatuh tempo</p>
    </div>
  )
  return (
    <div className="absolute bottom-16 left-2 right-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Perhatian</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>
      {counts.hutang > 0 && (
        <button onClick={() => onNavigate('/hutang')}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-medium text-red-600">{counts.hutang} hutang jatuh tempo</p>
          {counts.overdueHutang > 0 && <p className="text-xs text-gray-500">{counts.overdueHutang} sudah lewat jatuh tempo</p>}
        </button>
      )}
      {counts.piutang > 0 && (
        <button onClick={() => onNavigate('/piutang')}
          className="w-full text-left px-4 py-3 hover:bg-gray-50">
          <p className="text-sm font-medium text-orange-600">{counts.piutang} piutang jatuh tempo</p>
          {counts.overduepiutang > 0 && <p className="text-xs text-gray-500">{counts.overduepiutang} sudah lewat jatuh tempo</p>}
        </button>
      )}
    </div>
  )
}

function Sidebar({ groups, currentUser, onLogout }) {
  const [notifCounts, setNotifCounts] = useState(null)
  const [showNotif, setShowNotif] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = () => window.electronAPI.getNotificationCounts().then(setNotifCounts)
    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleNavigate = (path) => {
    navigate(path)
    setShowNotif(false)
  }

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen relative">
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-base font-bold text-blue-600">Kasir App</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {group.title && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {group.title}
              </p>
            )}
            {group.items.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {showNotif && (
        <NotifPanel counts={notifCounts} onClose={() => setShowNotif(false)} onNavigate={handleNavigate} />
      )}

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-gray-400">{currentUser.role === 'owner' ? 'Pemilik' : 'Kasir'}</p>
          </div>
          <BellIcon counts={notifCounts} onClick={() => setShowNotif(s => !s)} />
        </div>
        <button onClick={onLogout}
          className="w-full py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors">
          Keluar
        </button>
      </div>
    </aside>
  )
}

function AppShell() {
  const { currentUser, logout, checking } = useAuth()

  if (checking) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>
  if (!currentUser) return <Login />

  const isOwner = currentUser.role === 'owner'
  const groups = isOwner ? OWNER_GROUPS : KASIR_GROUPS

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar groups={groups} currentUser={currentUser} onLogout={logout} />

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/kasir"     element={<Kasir />} />
          {isOwner && <>
            <Route path="/products"        element={<Products />} />
            <Route path="/promos"          element={<Promos />} />
            <Route path="/stock-opname"    element={<StockOpname />} />
            <Route path="/stock-report"    element={<StockReport />} />
            <Route path="/purchases"       element={<Purchases />} />
            <Route path="/purchase-report" element={<PurchaseReport />} />
            <Route path="/hutang"          element={<Hutang />} />
            <Route path="/sales"           element={<Sales />} />
            <Route path="/piutang"         element={<Piutang />} />
            <Route path="/expenses"        element={<Expenses />} />
            <Route path="/returns"         element={<Returns />} />
            <Route path="/tutup-kas"       element={<TutupKas />} />
            <Route path="/customers"       element={<Customers />} />
            <Route path="/suppliers"       element={<Suppliers />} />
            <Route path="/reports"         element={<Reports />} />
            <Route path="/settings"        element={<Settings />} />
          </>}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
