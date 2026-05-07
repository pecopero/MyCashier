import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'

const FILTERS = ['Semua', 'Stok Tipis', 'Stok Habis']

function statusBadge(product) {
  if (product.stock === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Habis</span>
  if (product.stock <= product.min_stock)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Tipis</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
}

export default function StockReport() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Semua')
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.electronAPI.getStockValueReport().then(data => {
      setProducts(data)
      setLoading(false)
    })
  }, [])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'Stok Habis') return p.stock === 0
    if (filter === 'Stok Tipis') return p.stock > 0 && p.stock <= p.min_stock
    return true
  })

  const totalValue = filtered.reduce((s, p) => s + p.stock_value, 0)
  const totalStock = filtered.reduce((s, p) => s + p.stock, 0)
  const outOfStock = products.filter(p => p.stock === 0).length
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan Stok</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Produk</p>
          <p className="text-2xl font-bold text-gray-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Nilai Inventori</p>
          <p className="text-lg font-bold text-blue-600">{formatRupiah(products.reduce((s, p) => s + p.stock_value, 0))}</p>
          <p className="text-xs text-gray-400 mt-0.5">stok × HPP</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4">
          <p className="text-xs text-orange-500 mb-1">Stok Tipis</p>
          <p className="text-2xl font-bold text-orange-600">{lowStock}</p>
          <p className="text-xs text-gray-400 mt-0.5">produk</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4">
          <p className="text-xs text-red-500 mb-1">Stok Habis</p>
          <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
          <p className="text-xs text-gray-400 mt-0.5">produk</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari produk atau kategori..."
          className="flex-1 max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <p className="text-center text-gray-400 mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Produk', 'Kategori', 'Stok', 'Min Stok', 'HPP', 'Harga Jual', 'Nilai Stok', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${p.stock === 0 ? 'bg-red-50/30' : p.stock <= p.min_stock ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className={`px-4 py-3 font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= p.min_stock ? 'text-orange-600' : 'text-gray-800'}`}>
                    {p.stock}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.min_stock}</td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiah(p.cost_price)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiah(p.price)}</td>
                  <td className="px-4 py-3 font-medium text-blue-700">{formatRupiah(p.stock_value)}</td>
                  <td className="px-4 py-3">{statusBadge(p)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Tidak ada produk ditemukan.</td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700" colSpan={2}>Total ({filtered.length} produk)</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{totalStock}</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-3 font-bold text-blue-700">{formatRupiah(totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
