import { useState, useEffect, useCallback } from 'react'
import { formatRupiah } from '../utils/format'

const CATEGORIES = ['Listrik', 'Air', 'Gaji', 'Sewa', 'Transport', 'Bahan Baku', 'Lain-lain']

function today() {
  return new Date().toLocaleDateString('en-CA')
}

const EMPTY_FORM = { category: 'Lain-lain', amount: '', note: '', date: today() }

const SOURCE_BADGE = {
  expense:          { label: 'Operasional',          color: 'bg-orange-100 text-orange-700' },
  purchase:         { label: 'Pembelian Tunai',       color: 'bg-blue-100 text-blue-700' },
  purchase_payment: { label: 'Bayar Hutang',          color: 'bg-purple-100 text-purple-700' },
}

function monthRange(filterMonth) {
  const [y, m] = filterMonth.split('-')
  const startDate = `${y}-${m}-01`
  const lastDay   = new Date(y, m, 0).getDate()
  const endDate   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

export default function Expenses() {
  const [tab, setTab]               = useState('operational') // 'operational' | 'all'
  const [expenses, setExpenses]     = useState([])
  const [cashOut, setCashOut]       = useState({ items: [], total: 0 })
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editId, setEditId]         = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7))
  const [loading, setLoading]       = useState(false)

  const loadOperational = useCallback(async () => {
    const { startDate, endDate } = monthRange(filterMonth)
    const data = await window.electronAPI.getExpenses({ startDate, endDate })
    setExpenses(data)
  }, [filterMonth])

  const loadCashOut = useCallback(async () => {
    const { startDate, endDate } = monthRange(filterMonth)
    const data = await window.electronAPI.getCashOut({ startDate, endDate })
    setCashOut(data)
  }, [filterMonth])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadOperational(), loadCashOut()]).finally(() => setLoading(false))
  }, [filterMonth])

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false) }

  const openEdit = (exp) => {
    setForm({ category: exp.category, amount: String(exp.amount), note: exp.note ?? '', date: exp.date })
    setEditId(exp.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount) }
    if (editId) {
      await window.electronAPI.updateExpense(editId, data)
    } else {
      await window.electronAPI.createExpense(data)
    }
    resetForm()
    loadOperational()
    loadCashOut()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengeluaran ini?')) return
    await window.electronAPI.deleteExpense(id)
    setExpenses(prev => prev.filter(ex => ex.id !== id))
    loadCashOut()
  }

  const totalOperational = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map(cat => ({
    category: cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  // Summary untuk tab Semua Kas Keluar
  const bySource = [
    { label: 'Operasional',    color: 'text-orange-600', total: cashOut.items.filter(r => r.source === 'expense').reduce((s, r) => s + r.amount, 0) },
    { label: 'Pembelian Tunai', color: 'text-blue-600',  total: cashOut.items.filter(r => r.source === 'purchase').reduce((s, r) => s + r.amount, 0) },
    { label: 'Bayar Hutang',   color: 'text-purple-600', total: cashOut.items.filter(r => r.source === 'purchase_payment').reduce((s, r) => s + r.amount, 0) },
  ].filter(s => s.total > 0)

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Pengeluaran</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tab === 'operational'
              ? <>Total operasional: <span className="font-semibold text-red-600">{formatRupiah(totalOperational)}</span></>
              : <>Total kas keluar: <span className="font-semibold text-red-600">{formatRupiah(cashOut.total)}</span></>
            }
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {tab === 'operational' && (
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
              + Tambah
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          ['operational', 'Pengeluaran Operasional'],
          ['all',         'Semua Kas Keluar'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Pengeluaran Operasional ─────────────────────────────────────── */}
      {tab === 'operational' && (
        <>
          {byCategory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {byCategory.map(c => (
                <div key={c.category} className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{c.category}</p>
                  <p className="font-bold text-red-600 text-sm">{formatRupiah(c.total)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tanggal', 'Kategori', 'Jumlah', 'Keterangan', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada pengeluaran bulan ini.</td></tr>
                ) : expenses.map(ex => (
                  <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{ex.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{ex.category}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">{formatRupiah(ex.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{ex.note || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(ex)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => handleDelete(ex.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB: Semua Kas Keluar ────────────────────────────────────────────── */}
      {tab === 'all' && (
        <>
          {/* Ringkasan per sumber */}
          {bySource.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {bySource.map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`font-bold text-sm ${s.color}`}>{formatRupiah(s.total)}</p>
                </div>
              ))}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Total Kas Keluar</p>
                <p className="font-bold text-sm text-red-600">{formatRupiah(cashOut.total)}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tanggal', 'Jenis', 'Keterangan', 'Jumlah'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                ) : cashOut.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Tidak ada kas keluar bulan ini.</td></tr>
                ) : cashOut.items.map((row, i) => {
                  const badge = SOURCE_BADGE[row.source] ?? SOURCE_BADGE.expense
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        {row.source === 'expense' && (
                          <span className="ml-1.5 text-xs text-gray-400">{row.category}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.note || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-red-600 whitespace-nowrap">
                        − {formatRupiah(row.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {cashOut.items.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-right">{cashOut.items.length} transaksi kas keluar</p>
          )}
        </>
      )}

      {/* Modal tambah / edit pengeluaran */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className={`${input} bg-white`}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                <input type="number" min="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Opsional..." className={input} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                  {editId ? 'Simpan' : 'Tambah'}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
