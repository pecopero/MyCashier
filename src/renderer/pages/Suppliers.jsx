import { useState, useEffect } from 'react'

function SupplierForm({ initial = {}, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [address, setAddress] = useState(initial.address || '')

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, phone, address }) }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">
        {initial.id ? 'Edit Supplier' : 'Tambah Supplier Baru'}
      </h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Supplier <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Nama toko / perusahaan" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08..." className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat opsional" className={inp} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          {initial.id ? 'Simpan Perubahan' : 'Tambah Supplier'}
        </button>
      </div>
    </form>
  )
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    setSuppliers(await window.electronAPI.getSuppliers())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (data) => {
    await window.electronAPI.createSupplier(data)
    setShowForm(false)
    load()
  }

  const handleEdit = async (data) => {
    await window.electronAPI.updateSupplier(editing.id, data)
    setEditing(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus supplier ini? Riwayat pembelian yang sudah ada tidak akan terpengaruh.')) return
    await window.electronAPI.deleteSupplier(id)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Manajemen Supplier</h1>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Tambah Supplier
          </button>
        )}
      </div>

      {showForm && (
        <SupplierForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
      )}
      {editing && (
        <SupplierForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <p className="text-center text-gray-400 mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama Supplier', 'Telepon', 'Alamat', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{s.address || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(s); setShowForm(false) }}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    Belum ada supplier. Klik "Tambah Supplier" untuk memulai.
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
