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

function NavItem({ to, label }) {
  return (
    <NavLink to={to} end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label}
    </NavLink>
  )
}

const OWNER_NAV = [
  { to: '/',           label: 'Dashboard' },
  { to: '/kasir',      label: 'Kasir' },
  { to: '/products',   label: 'Produk' },
  { to: '/purchases',  label: 'Pembelian' },
  { to: '/hutang',     label: 'Hutang' },
  { to: '/sales',      label: 'Penjualan' },
  { to: '/piutang',    label: 'Piutang' },
  { to: '/expenses',   label: 'Pengeluaran' },
  { to: '/returns',    label: 'Retur' },
  { to: '/tutup-kas',  label: 'Tutup Kas' },
  { to: '/reports',    label: 'Laporan' },
  { to: '/settings',   label: 'Pengaturan' },
]

const KASIR_NAV = [
  { to: '/',      label: 'Dashboard' },
  { to: '/kasir', label: 'Kasir' },
]

function AppShell() {
  const { currentUser, logout, checking } = useAuth()

  if (checking) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>
  if (!currentUser) return <Login />

  const isOwner = currentUser.role === 'owner'
  const navItems = isOwner ? OWNER_NAV : KASIR_NAV

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 shadow-sm">
        <h1 className="text-base font-bold text-blue-600 mr-2 shrink-0">Kasir App</h1>
        <nav className="flex gap-0.5 flex-wrap flex-1 overflow-hidden">
          {navItems.map(({ to, label }) => <NavItem key={to} to={to} label={label} />)}
        </nav>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-xs text-gray-500">{currentUser.name}</span>
          <button onClick={logout}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
            Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/kasir"      element={<Kasir />} />
          {isOwner && <>
            <Route path="/products"   element={<Products />} />
            <Route path="/purchases"  element={<Purchases />} />
            <Route path="/hutang"     element={<Hutang />} />
            <Route path="/sales"      element={<Sales />} />
            <Route path="/piutang"    element={<Piutang />} />
            <Route path="/expenses"   element={<Expenses />} />
            <Route path="/returns"    element={<Returns />} />
            <Route path="/tutup-kas"  element={<TutupKas />} />
            <Route path="/reports"    element={<Reports />} />
            <Route path="/settings"   element={<Settings />} />
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
