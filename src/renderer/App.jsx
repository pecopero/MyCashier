import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
import Shifts from './pages/Shifts'
import ActivityLog from './pages/ActivityLog'
import CashierReport from './pages/CashierReport'
import ProductLabels from './pages/ProductLabels'
import CashFlow from './pages/CashFlow'

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
      { to: '/products',       label: 'Produk' },
      { to: '/product-labels', label: 'Label Produk' },
      { to: '/promos',         label: 'Promo' },
      { to: '/stock-opname',   label: 'Stock Opname' },
      { to: '/stock-report',   label: 'Lap. Stok' },
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
      { to: '/cash-flow',       label: 'Arus Kas' },
      { to: '/tutup-kas',       label: 'Tutup Kas' },
    ],
  },
  {
    title: 'MANAJEMEN',
    items: [
      { to: '/customers',     label: 'Pelanggan' },
      { to: '/suppliers',     label: 'Supplier' },
      { to: '/cashier-report', label: 'Lap. Kasir' },
      { to: '/shifts',         label: 'Riwayat Shift' },
      { to: '/activity-log',   label: 'Log Aktivitas' },
      { to: '/reports',        label: 'Laporan' },
      { to: '/settings',      label: 'Pengaturan' },
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

function fmtRp(n) {
  return 'Rp ' + Math.round(n ?? 0).toLocaleString('id-ID')
}
function fmtDueDate(s) {
  if (!s) return '-'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function NotifPanel({ counts, onClose, onNavigate }) {
  const empty = !counts || counts.total === 0
  const hutangItems  = counts?.hutangItems  ?? []
  const piutangItems = counts?.piutangItems ?? []

  return (
    <div className="absolute bottom-16 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col max-h-[420px]">
      <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center shrink-0">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tagihan Jatuh Tempo</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      {empty ? (
        <p className="text-sm text-gray-400 text-center py-6">Tidak ada tagihan jatuh tempo</p>
      ) : (
        <div className="overflow-y-auto flex-1">
          {hutangItems.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-red-50 sticky top-0">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                  Hutang — {counts.hutang} tagihan
                </span>
              </div>
              {hutangItems.map((item, i) => (
                <button key={i} onClick={() => onNavigate('/hutang')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${item.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {item.is_overdue && '⚠ '}{item.supplier_name}
                    </p>
                    <p className="text-[10px] text-gray-400">{item.is_overdue ? 'Lewat: ' : 'Jatuh tempo: '}{fmtDueDate(item.due_date)}</p>
                  </div>
                  <p className="text-xs font-semibold text-red-500 shrink-0 mt-0.5">{fmtRp(item.sisa)}</p>
                </button>
              ))}
              {counts.hutang > hutangItems.length && (
                <button onClick={() => onNavigate('/hutang')}
                  className="w-full text-center px-4 py-1.5 text-[10px] text-blue-500 hover:bg-gray-50 border-b border-gray-100">
                  +{counts.hutang - hutangItems.length} hutang lainnya →
                </button>
              )}
            </>
          )}
          {piutangItems.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-orange-50 sticky top-0">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">
                  Piutang — {counts.piutang} tagihan
                </span>
              </div>
              {piutangItems.map((item, i) => (
                <button key={i} onClick={() => onNavigate('/piutang')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${item.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {item.is_overdue && '⚠ '}{item.customer_name}
                    </p>
                    <p className="text-[10px] text-gray-400">{item.is_overdue ? 'Lewat: ' : 'Jatuh tempo: '}{fmtDueDate(item.due_date)}</p>
                  </div>
                  <p className="text-xs font-semibold text-orange-500 shrink-0 mt-0.5">{fmtRp(item.sisa)}</p>
                </button>
              ))}
              {counts.piutang > piutangItems.length && (
                <button onClick={() => onNavigate('/piutang')}
                  className="w-full text-center px-4 py-1.5 text-[10px] text-blue-500 hover:bg-gray-50">
                  +{counts.piutang - piutangItems.length} piutang lainnya →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const navLinkClass = ({ isActive }) =>
  `flex items-center px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  }`

function Sidebar({ groups, currentUser, onLogout }) {
  const [notifCounts, setNotifCounts] = useState(null)
  const [showNotif, setShowNotif] = useState(false)
  const [search, setSearch] = useState('')
  const [openGroups, setOpenGroups] = useState({})
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetch = () => window.electronAPI.getNotificationCounts().then(setNotifCounts)
    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-open the group that contains the current active route
  useEffect(() => {
    const updates = {}
    groups.forEach((group, gi) => {
      if (!group.title) return
      const hasActive = group.items.some(({ to }) =>
        to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
      )
      if (hasActive) updates[gi] = true
    })
    if (Object.keys(updates).length) setOpenGroups(prev => ({ ...prev, ...updates }))
  }, [location.pathname])

  const toggleGroup = (gi) => setOpenGroups(prev => ({ ...prev, [gi]: !prev[gi] }))

  const handleNavigate = (path) => { navigate(path); setShowNotif(false) }

  const searchLower = search.toLowerCase().trim()
  const searchResults = searchLower
    ? groups.flatMap(g => g.items).filter(({ label }) => label.toLowerCase().includes(searchLower))
    : null

  return (
    <aside className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen relative">
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-base font-bold text-blue-600">Kasir App</h1>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari menu..."
            className="w-full pl-7 pr-6 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none">
              ×
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {searchResults ? (
          searchResults.length === 0
            ? <p className="px-4 py-6 text-xs text-gray-400 text-center">Menu tidak ditemukan.</p>
            : searchResults.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setSearch('')}
                  className={navLinkClass}>
                  {label}
                </NavLink>
              ))
        ) : (
          groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {group.title ? (
                <button onClick={() => toggleGroup(gi)}
                  className="w-full flex items-center justify-between px-4 pt-3 pb-1 group">
                  <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase group-hover:text-gray-600 transition-colors">
                    {group.title}
                  </span>
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${openGroups[gi] ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : null}
              {(!group.title || openGroups[gi]) && group.items.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))
        )}
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
            <Route path="/cash-flow"       element={<CashFlow />} />
            <Route path="/returns"         element={<Returns />} />
            <Route path="/tutup-kas"       element={<TutupKas />} />
            <Route path="/customers"     element={<Customers />} />
            <Route path="/suppliers"     element={<Suppliers />} />
            <Route path="/cashier-report"  element={<CashierReport />} />
            <Route path="/product-labels" element={<ProductLabels />} />
            <Route path="/shifts"         element={<Shifts />} />
            <Route path="/activity-log"   element={<ActivityLog />} />
            <Route path="/reports"       element={<Reports />} />
            <Route path="/settings"      element={<Settings />} />
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
