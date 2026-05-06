import { useState } from 'react'

export default function SupplierManager({ suppliers, onAdd, onUpdate, onDelete, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  const resetForm = () => { setForm({ name: '', phone: '', address: '' }); setEditId(null); setError('') }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await onAdd({ name: form.name, phone: form.phone, address: form.address })
      resetForm()
    } catch {
      setError('Nama supplier sudah ada.')
    }
  }

  const startEdit = (s) => {
    setEditId(s.id)
    setForm({ name: s.name, phone: s.phone ?? '', address: s.address ?? '' })
    setError('')
  }

  const saveEdit = async () => {
    if (!form.name.trim()) return
    try {
      await onUpdate(editId, { name: form.name, phone: form.phone, address: form.address })
      resetForm()
    } catch {
      setError('Nama supplier sudah ada.')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus supplier ini?')) await onDelete(id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Kelola Supplier</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Form tambah / edit */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-3">{editId ? 'Edit Supplier' : 'Tambah Supplier Baru'}</p>
          <div className="space-y-2">
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }}
              placeholder="Nama supplier *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="No. telepon (opsional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Alamat (opsional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            {editId ? (
              <>
                <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Simpan</button>
                <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Batal</button>
              </>
            ) : (
              <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Tambah</button>
            )}
          </div>
        </div>

        {/* Daftar supplier */}
        <ul className="space-y-1 max-h-56 overflow-auto">
          {suppliers.map(s => (
            <li key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 ${editId === s.id ? 'bg-blue-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {(s.phone || s.address) && (
                  <p className="text-xs text-gray-400 truncate">{[s.phone, s.address].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <button onClick={() => startEdit(s)} className="text-blue-500 text-xs hover:underline shrink-0">Edit</button>
              <button onClick={() => handleDelete(s.id)} className="text-red-400 text-xs hover:underline shrink-0">Hapus</button>
            </li>
          ))}
          {suppliers.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">Belum ada supplier.</p>
          )}
        </ul>
      </div>
    </div>
  )
}
