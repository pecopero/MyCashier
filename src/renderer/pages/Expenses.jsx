import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'

const CATEGORIES = ['Listrik', 'Air', 'Gaji', 'Sewa', 'Transport', 'Bahan Baku', 'Lain-lain']

function today() {
  return new Date().toLocaleDateString('en-CA')
}

const EMPTY_FORM = { category: 'Lain-lain', amount: '', note: '', date: today() }

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7))

  const load = async () => {
    const [y, m] = filterMonth.split('-')
    const startDate = `${y}-${m}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${y}-${m}-${lastDay}`
    const data = await window.electronAPI.getExpenses({ startDate, endDate })
    setExpenses(data)
  }

  useEffect(() => { load() }, [filterMonth])

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
      const updated = await window.electronAPI.updateExpense(editId, data)
      setExpenses(prev => prev.map(ex => ex.id === editId ? updated : ex))
    } else {
      const created = await window.electronAPI.createExpense(data)
      setExpenses(prev => [created, ...prev])
    }
    resetForm()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengeluaran ini?')) return
    await window.electronAPI.deleteExpense(id)
    setExpenses(prev => prev.filter(ex => ex.id !== id))
  }

  const totalMonth = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map(cat => ({
    category: cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Pengeluaran</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total bulan ini: <span className="font-semibold text-red-600">{formatRupiah(totalMonth)}</span></p>
        </div>
        <div className="flex gap-3 items-center">
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Tambah
          </button>
        </div>
      </div>

      {/* Ringkasan per kategori */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {byCategory.map(c => (
            <div key={c.category} className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">{c.category}</p>
              <p className="font-bold text-red-600 text-sm">{formatRupiah(c.total)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form tambah/edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Opsional..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      {/* Tabel pengeluaran */}
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
            {expenses.map(ex => (
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
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada pengeluaran bulan ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
