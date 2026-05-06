import { useState } from 'react'

export default function CategoryManager({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await onAdd(newName)
      setNewName('')
      setError('')
    } catch {
      setError('Nama kategori sudah ada.')
    }
  }

  const startEdit = (cat) => {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  const saveEdit = async (id) => {
    if (!editName.trim()) return
    try {
      await onUpdate(id, editName)
      setEditId(null)
      setError('')
    } catch {
      setError('Nama kategori sudah ada.')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus kategori ini? Produk yang menggunakan kategori ini tidak akan terhapus.')) {
      await onDelete(id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Kelola Kategori</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tambah kategori baru */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError('') }}
            placeholder="Nama kategori baru..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Tambah
          </button>
        </form>

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        {/* Daftar kategori */}
        <ul className="space-y-1 max-h-64 overflow-auto">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
              {editId === cat.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditId(null) }}
                    className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                  />
                  <button onClick={() => saveEdit(cat.id)} className="text-blue-600 text-xs font-medium hover:underline">Simpan</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 text-xs hover:underline">Batal</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <button onClick={() => startEdit(cat)} className="text-blue-500 text-xs hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-400 text-xs hover:underline">Hapus</button>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">Belum ada kategori.</p>
          )}
        </ul>
      </div>
    </div>
  )
}
