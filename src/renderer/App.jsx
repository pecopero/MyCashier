import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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
import StockOpname from './pages/StockOpname'
import Promos from './pages/Promos'

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
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      { to: '/purchases',  label: 'Pembelian' },
      { to: '/hutang',     label: 'Hutang' },
      { to: '/piutang',    label: 'Piutang' },
      { to: '/expenses',   label: 'Pengeluaran' },
      { to: '/tutup-kas',  label: 'Tutup Kas' },
    ],
  },
  {
    title: 'MANAJEMEN',
    items: [
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

function Sidebar({ groups, currentUser, onLogout }) {
  return (
    <aside className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen">
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
                  `flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-none ${
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

      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-xs font-medium text-gray-700 truncate mb-2">{currentUser.name}</p>
        <p className="text-[10px] text-gray-400 mb-2 capitalize">{currentUser.role === 'owner' ? 'Pemilik' : 'Kasir'}</p>
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
            <Route path="/products"     element={<Products />} />
            <Route path="/promos"       element={<Promos />} />
            <Route path="/stock-opname" element={<StockOpname />} />
            <Route path="/purchases"    element={<Purchases />} />
            <Route path="/hutang"       element={<Hutang />} />
            <Route path="/sales"        element={<Sales />} />
            <Route path="/piutang"      element={<Piutang />} />
            <Route path="/expenses"     element={<Expenses />} />
            <Route path="/returns"      element={<Returns />} />
            <Route path="/tutup-kas"    element={<TutupKas />} />
            <Route path="/suppliers"    element={<Suppliers />} />
            <Route path="/reports"      element={<Reports />} />
            <Route path="/settings"     element={<Settings />} />
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
