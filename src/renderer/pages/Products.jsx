import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import CategorySelect from '../components/CategorySelect'
import { formatRupiah } from '../utils/format'

function ImportModal({ onClose, onDone }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handlePreview = async () => {
    setLoading(true)
    const res = await window.electronAPI.importPreviewProducts()
    setLoading(false)
    if (!res.canceled) setRows(res.rows)
  }

  const handleExecute = async () => {
    setLoading(true)
    const res = await window.electronAPI.importExecuteProducts(rows)
    setResult(res)
    setLoading(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Import Produk dari Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {!rows && !result && (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600 text-sm">File Excel harus memiliki kolom:<br />
                <strong>Nama Produk, Harga Jual, Harga Pokok, Stok, Stok Min, Kategori, Barcode</strong>
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => window.electronAPI.importDownloadTemplate()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  Unduh Template Excel
                </button>
                <button onClick={handlePreview} disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                  {loading ? 'Membaca...' : 'Pilih File Excel'}
                </button>
              </div>
            </div>
          )}

          {rows && !result && (
            <>
              <p className="text-sm text-gray-600 mb-3">{rows.length} produk ditemukan — periksa sebelum import:</p>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{['Nama', 'Harga Jual', 'HPP', 'Stok', 'Kategori'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2">{formatRupiah(r.price)}</td>
                      <td className="px-3 py-2">{formatRupiah(r.cost_price)}</td>
                      <td className="px-3 py-2">{r.stock}</td>
                      <td className="px-3 py-2">{r.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {result && (
            <div className="text-center py-10">
              <p className="text-2xl mb-3">✓</p>
              <p className="font-bold text-green-600 text-lg">{result.imported} produk berhasil diimport</p>
              {result.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{result.skipped} produk dilewati (duplikat nama)</p>}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
            {result ? 'Tutup' : 'Batal'}
          </button>
          {rows && !result && (
            <button onClick={handleExecute} disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50">
              {loading ? 'Mengimport...' : `Import ${rows.length} Produk`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const COMMON_UNITS = [
  { group: 'Umum',    list: ['pcs','buah','biji','unit','set','pasang'] },
  { group: 'Berat',   list: ['gram','ons','kg','kwintal','ton'] },
  { group: 'Volume',  list: ['ml','cl','dl','liter','cc'] },
  { group: 'Kemasan', list: ['pak','bungkus','sachet','botol','kaleng','dus','karton','koli','sak','bal','slop','jerigen','galon'] },
  { group: 'Panjang', list: ['cm','meter','yard','roll','gulung','lembar','helai','rim'] },
  { group: 'Hitungan',list: ['lusin','kodi','gross'] },
]
const ALL_UNITS = COMMON_UNITS.flatMap(g => g.list)

const EMPTY_FORM = { name: '', price: '', cost_price: '', stock: '', min_stock: '5', unit: 'pcs', category: '', barcode: '', wholesale_price: '', wholesale_min_qty: '' }
const EMPTY_UNIT = () => ({ unit_name: '', conversion: '', price: '', is_default: false })

function UnitManager({ baseUnit, units, onChange }) {
  const inp = 'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const add = () => onChange([...units, EMPTY_UNIT()])

  const update = (i, field, val) => {
    const next = units.map((u, idx) => idx === i ? { ...u, [field]: val } : u)
    onChange(next)
  }

  const setDefault = (i) => onChange(units.map((u, idx) => ({ ...u, is_default: idx === i })))

  const remove = (i) => onChange(units.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {units.length === 0 && (
        <p className="text-xs text-gray-400 italic">Belum ada satuan tambahan — produk dijual per satuan dasar ({baseUnit || 'pcs'}).</p>
      )}
      {units.map((u, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-2.5 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Nama Satuan</label>
              <input list="unit-suggestions" value={u.unit_name} placeholder="mis. lusin, bal, kg"
                onChange={e => update(i, 'unit_name', e.target.value)}
                className={`w-full ${inp}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">= berapa {baseUnit || 'pcs'}?</label>
              <input type="number" min="0.001" step="any" value={u.conversion} placeholder="mis. 12"
                onChange={e => update(i, 'conversion', e.target.value)}
                className={`w-full ${inp}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Harga Jual (Rp)</label>
              <input type="number" min="0" value={u.price} placeholder="mis. 48000"
                onChange={e => update(i, 'price', e.target.value)}
                className={`w-full ${inp}`} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="radio" name="default-unit" checked={!!u.is_default} onChange={() => setDefault(i)}
                className="accent-blue-600" />
              Tampilkan sebagai default di kasir
            </label>
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full py-2 border border-dashed border-blue-300 text-blue-600 text-xs rounded-lg hover:bg-blue-50 transition-colors">
        + Tambah Satuan
      </button>
      <datalist id="unit-suggestions">
        {ALL_UNITS.map(u => <option key={u} value={u} />)}
      </datalist>
    </div>
  )
}

function MarginBadge({ price, costPrice }) {
  if (!costPrice || costPrice <= 0) return null
  const margin = ((price - costPrice) / price * 100).toFixed(1)
  const color = margin >= 20 ? 'bg-green-100 text-green-700' : margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{margin}%</span>
}

function StockBadge({ stock, minStock }) {
  const isLow = stock <= minStock
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
      {stock} {isLow && '⚠'}
    </span>
  )
}

export default function Products() {
  const { products, loading, createProduct, updateProduct, deleteProduct, reload } = useProducts()
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories()
  const [form, setForm] = useState(EMPTY_FORM)
  const [units, setUnits] = useState([])
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('all') // 'all' | 'low' | 'ok'

  const resetForm = () => { setForm(EMPTY_FORM); setUnits([]); setEditId(null); setShowForm(false) }

  const openEdit = async (product) => {
    setForm({
      name: product.name,
      price: String(product.price),
      cost_price: String(product.cost_price ?? 0),
      stock: String(product.stock),
      min_stock: String(product.min_stock ?? 5),
      unit: product.unit ?? 'pcs',
      category: product.category ?? '',
      barcode: product.barcode ?? '',
      wholesale_price: product.wholesale_price > 0 ? String(product.wholesale_price) : '',
      wholesale_min_qty: product.wholesale_min_qty > 0 ? String(product.wholesale_min_qty) : '',
    })
    const existingUnits = await window.electronAPI.getProductUnits(product.id)
    setUnits(existingUnits.map(u => ({
      unit_name: u.unit_name, conversion: String(u.conversion),
      price: String(u.price), is_default: !!u.is_default,
    })))
    setEditId(product.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock: parseFloat(form.stock) || 0,
      min_stock: parseFloat(form.min_stock) || 5,
      unit: form.unit || 'pcs',
      category: form.category,
      barcode: form.barcode,
      wholesale_price: parseFloat(form.wholesale_price) || 0,
      wholesale_min_qty: parseFloat(form.wholesale_min_qty) || 0,
    }
    let savedId = editId
    if (editId) await updateProduct(editId, data)
    else { const p = await createProduct(data); savedId = p.id }
    const validUnits = units.filter(u => u.unit_name.trim() && parseFloat(u.conversion) > 0)
    if (savedId) await window.electronAPI.saveProductUnits(savedId, validUnits)
    resetForm()
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus produk ini?')) await deleteProduct(id)
  }

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const lowStockCount = products.filter(p => p.stock <= (p.min_stock ?? 5)).length

  const q = search.toLowerCase().trim()
  const filtered = products.filter(p => {
    if (q && !p.name.toLowerCase().includes(q) && !(p.barcode || '').includes(q) && !(p.category || '').toLowerCase().includes(q)) return false
    if (filterCategory && p.category !== filterCategory) return false
    if (filterStock === 'low' && p.stock > (p.min_stock ?? 5)) return false
    if (filterStock === 'ok'  && p.stock <= (p.min_stock ?? 5)) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">Manajemen Produk</h1>
          {lowStockCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {lowStockCount} stok menipis
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm">
            Import Excel
          </button>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, barcode, atau kategori..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
          )}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-36">
          <option value="">Semua Kategori</option>
          {[...new Set(products.map(p => p.category).filter(Boolean))].sort().map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filterStock} onChange={e => setFilterStock(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">Semua Stok</option>
          <option value="low">Stok Menipis</option>
          <option value="ok">Stok Aman</option>
        </select>
        {(search || filterCategory || filterStock !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterStock('all') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Reset
          </button>
        )}
        <span className="self-center text-xs text-gray-400">
          {filtered.length} / {products.length} produk
        </span>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { reload(); setShowImport(false) }} />}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                <input type="text" value={form.name} onChange={e => setField('name')(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Pokok (HPP)</label>
                  <input type="number" value={form.cost_price} onChange={e => setField('cost_price')(e.target.value)} min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual *</label>
                  <input type="number" value={form.price} onChange={e => setField('price')(e.target.value)} required min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              {/* Preview margin */}
              {form.price > 0 && form.cost_price > 0 && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex justify-between">
                  <span>Margin: <strong>{formatRupiah(form.price - form.cost_price)}</strong></span>
                  <span>({((form.price - form.cost_price) / form.price * 100).toFixed(1)}%)</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok *</label>
                  <input type="number" value={form.stock} onChange={e => setField('stock')(e.target.value)} required min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok Minimum</label>
                  <input type="number" value={form.min_stock} onChange={e => setField('min_stock')(e.target.value)} min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <CategorySelect value={form.category} onChange={setField('category')}
                  categories={categories} onAdd={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Dasar</label>
                  <input list="unit-suggestions" value={form.unit}
                    onChange={e => setField('unit')(e.target.value)}
                    placeholder="pcs / kg / liter / gram…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <datalist id="unit-suggestions">
                    {ALL_UNITS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input type="text" value={form.barcode} onChange={e => setField('barcode')(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>

              <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Harga Grosir
                  <span className="ml-1 font-normal text-gray-400 normal-case">(opsional — aktif otomatis saat beli ≥ jumlah minimum)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Harga Grosir (Rp)</label>
                    <input type="number" min="0" value={form.wholesale_price}
                      onChange={e => setField('wholesale_price')(e.target.value)}
                      placeholder="mis. 8500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Min. Qty Grosir</label>
                    <input type="number" min="1" step="1" value={form.wholesale_min_qty}
                      onChange={e => setField('wholesale_min_qty')(e.target.value)}
                      placeholder="mis. 12 (lusin)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
                {form.wholesale_price > 0 && form.price > 0 && (
                  <p className="text-xs text-blue-600">
                    Selisih eceran–grosir: {formatRupiah(parseFloat(form.price) - parseFloat(form.wholesale_price))} per {form.unit || 'pcs'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Satuan Tambahan
                  <span className="ml-1 text-xs font-normal text-gray-400">(opsional — untuk jual per lusin, karton, dll)</span>
                </label>
                <UnitManager baseUnit={form.unit} units={units} onChange={setUnits} />
              </div>

              <div className="flex gap-3 pt-2">
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

      {loading ? (
        <p className="text-gray-400 text-center mt-12">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama', 'HPP', 'Harga Jual', 'Margin', 'Stok', 'Satuan', 'Kategori', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${p.stock <= (p.min_stock ?? 5) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.cost_price > 0 ? formatRupiah(p.cost_price) : '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatRupiah(p.price)}</td>
                  <td className="px-4 py-3"><MarginBadge price={p.price} costPrice={p.cost_price} /></td>
                  <td className="px-4 py-3"><StockBadge stock={p.stock} minStock={p.min_stock ?? 5} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.unit || 'pcs'}</td>
                  <td className="px-4 py-3">
                    {p.category ? <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{p.category}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {products.length === 0 ? 'Belum ada produk.' : 'Tidak ada produk yang cocok dengan filter.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
