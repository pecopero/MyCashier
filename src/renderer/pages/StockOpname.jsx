import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'

export default function StockOpname() {
  const [products, setProducts] = useState([])
  const [history, setHistory] = useState([])
  const [detail, setDetail] = useState(null)
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [note, setNote] = useState('')
  const [actuals, setActuals] = useState({})
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('form') // 'form' | 'history' | 'detail'

  useEffect(() => {
    window.electronAPI.getProducts().then(setProducts)
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await window.electronAPI.getStockOpnames()
      setHistory(data || [])
    } catch (_) {}
  }

  const handleActualChange = (id, val) => {
    setActuals(prev => ({ ...prev, [id]: val }))
  }

  const changedOnly = products.filter(p => {
    const actual = actuals[p.id]
    return actual !== undefined && actual !== '' && parseInt(actual, 10) !== p.stock
  })

  const hasChanges = changedOnly.length > 0

  const handleSubmit = async () => {
    if (!hasChanges) return alert('Tidak ada perubahan stok untuk disimpan.')
    if (!confirm(`Simpan opname ini? Stok ${changedOnly.length} produk akan disesuaikan.`)) return

    setLoading(true)
    try {
      const items = changedOnly.map(p => ({
        productId: p.id,
        productName: p.name,
        systemStock: p.stock,
        actualStock: parseInt(actuals[p.id], 10),
      }))
      await window.electronAPI.createStockOpname({ date, note, items })
    } finally {
      setLoading(false)
    }

    // Reset
    setActuals({})
    setNote('')
    const fresh = await window.electronAPI.getProducts()
    setProducts(fresh)
    loadHistory()
    setView('history')
  }

  const handleViewDetail = async (id) => {
    const data = await window.electronAPI.getStockOpnameById(id)
    setDetail(data)
    setView('detail')
  }

  const inp = 'w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (view === 'detail' && detail) {
    const gains = detail.items.filter(i => i.difference > 0).reduce((s, i) => s + i.difference, 0)
    const losses = detail.items.filter(i => i.difference < 0).reduce((s, i) => s + i.difference, 0)
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('history')} className="text-blue-600 hover:underline text-sm">← Riwayat</button>
          <h1 className="text-xl font-bold text-gray-800">Detail Opname — {detail.date}</h1>
        </div>
        {detail.note && <p className="text-sm text-gray-500 mb-4">Catatan: {detail.note}</p>}
        <div className="flex gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-green-700 font-medium">Selisih lebih: +{gains}</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-red-700 font-medium">Selisih kurang: {losses}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-700 font-medium">Total item diubah: {detail.items.length}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Produk', 'Stok Sistem', 'Stok Aktual', 'Selisih'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.items.map(item => (
                <tr key={item.id} className={`border-b border-gray-100 ${item.difference !== 0 ? '' : ''}`}>
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.system_stock}</td>
                  <td className="px-4 py-3 font-medium">{item.actual_stock}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">Stock Opname</h1>
          <button onClick={() => setView('form')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Opname Baru
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Tanggal', 'Item Diubah', 'Catatan', 'Dibuat'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetail(h.id)}>
                  <td className="px-4 py-3 font-medium text-blue-600 hover:underline">{h.date}</td>
                  <td className="px-4 py-3 text-gray-600">—</td>
                  <td className="px-4 py-3 text-gray-500">{h.note || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(h.created_at)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">Belum ada riwayat stock opname.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Form view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Stock Opname Baru</h1>
        <button onClick={() => setView('history')} className="text-sm text-gray-500 hover:text-gray-700">
          Lihat Riwayat →
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Opname</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            max={new Date().toLocaleDateString('en-CA')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <p className="text-xs text-gray-400 self-end pb-2">
          Isi kolom "Stok Aktual" hanya untuk produk yang stoknya berbeda. <br />
          Produk tanpa isian tidak akan diubah.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Produk</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Kategori</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Stok Sistem</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Stok Aktual</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const actual = actuals[p.id]
              const hasVal = actual !== undefined && actual !== ''
              const diff = hasVal ? parseInt(actual, 10) - p.stock : null
              return (
                <tr key={p.id} className={`border-b border-gray-100 ${hasVal && diff !== 0 ? 'bg-yellow-50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{p.stock}</td>
                  <td className="px-4 py-2.5 text-center">
                    <input type="number" min="0" value={actual ?? ''} placeholder={String(p.stock)}
                      onChange={e => handleActualChange(p.id, e.target.value)}
                      className={inp} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {diff !== null && diff !== 0 ? (
                      <span className={`font-semibold text-sm ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {hasChanges ? (
            <span className="text-orange-600 font-medium">{changedOnly.length} produk akan disesuaikan stoknya</span>
          ) : (
            'Belum ada perubahan'
          )}
        </p>
        <button onClick={handleSubmit} disabled={!hasChanges || loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-40">
          {loading ? 'Menyimpan...' : 'Simpan & Sesuaikan Stok'}
        </button>
      </div>
    </div>
  )
}
