import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatRupiah } from '../utils/format'

function PreviewModal({ html, onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col gap-3 max-h-[90vh] w-[600px]"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Preview Label</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 bg-white">
          <iframe srcDoc={html} title="Preview Label"
            style={{ width: '100%', height: '400px', border: 'none', display: 'block' }} />
        </div>
        <p className="text-xs text-gray-400 text-center">Tampilan perkiraan — hasil cetak bisa berbeda tergantung printer</p>
      </div>
    </div>,
    document.body
  )
}

export default function ProductLabels() {
  const [products, setProducts]     = useState([])
  const [selected, setSelected]     = useState({})
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [printing, setPrinting]     = useState(false)
  const [previewHtml, setPreviewHtml] = useState(null)

  useEffect(() => {
    window.electronAPI.getProducts().then(data => {
      setProducts(data)
      setLoading(false)
    })
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search)) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleSelect = (id) => {
    setSelected(prev => {
      if (prev[id]) { const next = { ...prev }; delete next[id]; return next }
      return { ...prev, [id]: 1 }
    })
  }

  const setQty = (id, qty) => {
    const q = Math.max(1, parseInt(qty) || 1)
    setSelected(prev => ({ ...prev, [id]: q }))
  }

  const selectedProducts = products
    .filter(p => selected[p.id])
    .map(p => ({ name: p.name, price: p.price, barcode: p.barcode || '', qty: selected[p.id] }))

  const totalLabels = selectedProducts.reduce((s, p) => s + p.qty, 0)

  const handlePreview = async () => {
    if (selectedProducts.length === 0) return
    const html = await window.electronAPI.previewLabels(selectedProducts)
    setPreviewHtml(html)
  }

  const handlePrint = async () => {
    if (selectedProducts.length === 0) return
    setPrinting(true)
    await window.electronAPI.printLabels(selectedProducts)
    setPrinting(false)
  }

  const selectAll = () => {
    const next = {}
    filtered.forEach(p => { next[p.id] = selected[p.id] || 1 })
    setSelected(prev => ({ ...prev, ...next }))
  }

  const clearAll = () => setSelected({})

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Cetak Label Produk</h1>

      {previewHtml && <PreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />}

      <div className="flex gap-6">
        {/* Kiri: daftar produk */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk, kategori, atau barcode..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={selectAll} className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              Pilih semua
            </button>
            <button onClick={clearAll} className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              Hapus pilihan
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 mt-8">Memuat...</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Produk</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Harga</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Barcode</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Jumlah Label</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className={`border-b border-gray-100 cursor-pointer transition-colors ${selected[p.id] ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => toggleSelect(p.id)}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={!!selected[p.id]} readOnly
                          className="w-4 h-4 accent-blue-600" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-700">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.barcode || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {selected[p.id] ? (
                          <input type="number" min="1" max="100" value={selected[p.id]}
                            onChange={e => setQty(p.id, e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Produk tidak ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kanan: panel cetak */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
            <h2 className="font-semibold text-gray-800 mb-4">Cetak Label</h2>
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada produk dipilih</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-auto">
                {selectedProducts.map(p => (
                  <div key={p.name} className="flex justify-between items-center text-sm">
                    <span className="truncate text-gray-700 mr-2">{p.name}</span>
                    <span className="shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">×{p.qty}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Label</span>
                <span className="font-bold text-gray-800">{totalLabels}</span>
              </div>
              <button onClick={handlePreview} disabled={selectedProducts.length === 0}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-40">
                Preview
              </button>
              <button onClick={handlePrint} disabled={selectedProducts.length === 0 || printing}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40">
                {printing ? 'Mencetak...' : 'Cetak Label'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
