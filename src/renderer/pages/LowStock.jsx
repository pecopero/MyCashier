import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRupiah } from '../utils/format'

export default function LowStock() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all') // 'all' | 'empty' | 'low'
  const navigate = useNavigate()

  useEffect(() => {
    window.electronAPI.getLowStockReport()
      .then(data => { setProducts(data); setLoading(false) })
  }, [])

  const filtered = products.filter(p => {
    if (filter === 'empty') return p.stock === 0
    if (filter === 'low')   return p.stock > 0 && p.stock <= p.min_stock
    return true
  })

  const emptyCount = products.filter(p => p.stock === 0).length
  const lowCount   = products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Stok Menipis</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {emptyCount > 0 && <span className="text-red-600 font-medium">{emptyCount} habis</span>}
            {emptyCount > 0 && lowCount > 0 && <span className="text-gray-400 mx-1">·</span>}
            {lowCount > 0 && <span className="text-yellow-600 font-medium">{lowCount} menipis</span>}
            {products.length === 0 && !loading && <span className="text-green-600 font-medium">Semua stok aman</span>}
          </p>
        </div>
        <button onClick={() => navigate('/purchases')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Buat Pembelian
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          ['all',   `Semua (${products.length})`],
          ['empty', `Habis (${emptyCount})`],
          ['low',   `Menipis (${lowCount})`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === val
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-gray-500 font-medium">Tidak ada produk dalam kategori ini</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Produk','Kategori','Stok Saat Ini','Stok Min','Harga Pokok','Estimasi Nilai'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isEmpty = p.stock === 0
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isEmpty ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isEmpty ? '⚠ Habis' : `${p.stock} ${p.unit}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.min_stock} {p.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{formatRupiah(p.cost_price)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.stock > 0 ? formatRupiah(p.cost_price * p.stock) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {filtered.length} produk ditampilkan
        </p>
      )}
    </div>
  )
}
