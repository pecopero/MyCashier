import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'

function CustomerForm({ initial = {}, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [address, setAddress] = useState(initial.address || '')
  const [notes, setNotes] = useState(initial.notes || '')

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, phone, address, notes }) }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">
        {initial.id ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
      </h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Nama pelanggan" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08..." className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Opsional" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional" className={inp} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          {initial.id ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
        </button>
      </div>
    </form>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async (q = '') => {
    setLoading(true)
    try {
      setCustomers((await window.electronAPI.getCustomers(q)) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    load(e.target.value)
  }

  const handleAdd = async (data) => {
    await window.electronAPI.createCustomer(data)
    setShowForm(false)
    load(search)
  }

  const handleEdit = async (data) => {
    await window.electronAPI.updateCustomer(editing.id, data)
    setEditing(null)
    load(search)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus pelanggan ini? Data piutang yang sudah ada tidak terpengaruh.')) return
    await window.electronAPI.deleteCustomer(id)
    load(search)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Database Pelanggan</h1>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Tambah Pelanggan
          </button>
        )}
      </div>

      {showForm && <CustomerForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />}
      {editing && <CustomerForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}

      <div className="mb-4">
        <input value={search} onChange={handleSearch}
          placeholder="Cari nama atau nomor telepon..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <p className="text-center text-gray-400 mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama', 'Telepon', 'Alamat', 'Catatan', 'Terdaftar', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{c.address || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.notes || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(c); setShowForm(false) }}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">Edit</button>
                      <button onClick={() => handleDelete(c.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    {search ? 'Pelanggan tidak ditemukan.' : 'Belum ada data pelanggan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
