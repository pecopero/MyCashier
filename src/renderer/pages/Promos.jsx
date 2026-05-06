import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'

const TODAY = new Date().toLocaleDateString('en-CA')

function statusBadge(promo) {
  if (!promo.active) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Nonaktif</span>
  if (promo.end_date < TODAY) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Kadaluarsa</span>
  if (promo.start_date > TODAY) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">Dijadwalkan</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
}

function PromoForm({ initial = {}, products, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '')
  const [type, setType] = useState(initial.type || 'percent')
  const [value, setValue] = useState(initial.value ?? '')
  const [minPurchase, setMinPurchase] = useState(initial.min_purchase ?? 0)
  const [productId, setProductId] = useState(initial.product_id || '')
  const [startDate, setStartDate] = useState(initial.start_date || TODAY)
  const [endDate, setEndDate] = useState(initial.end_date || TODAY)
  const [active, setActive] = useState(initial.active !== undefined ? Boolean(initial.active) : true)

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !value || !startDate || !endDate) return alert('Lengkapi semua field yang wajib diisi.')
    if (endDate < startDate) return alert('Tanggal selesai tidak boleh sebelum tanggal mulai.')
    onSubmit({
      name, type, value: parseFloat(value), minPurchase: parseFloat(minPurchase) || 0,
      productId: productId ? parseInt(productId) : null, startDate, endDate, active
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">{initial.id ? 'Edit Promo' : 'Tambah Promo Baru'}</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Promo <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Contoh: Diskon Akhir Pekan" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku untuk Produk</label>
          <select value={productId} onChange={e => setProductId(e.target.value)} className={inp}>
            <option value="">Semua produk</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button type="button" onClick={() => setType('percent')}
              className={`flex-1 py-2 font-medium transition-colors ${type === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Persen (%)
            </button>
            <button type="button" onClick={() => setType('nominal')}
              className={`flex-1 py-2 font-medium transition-colors ${type === 'nominal' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Nominal (Rp)
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nilai Diskon <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">{type === 'percent' ? '(%)' : '(Rp)'}</span>
          </label>
          <input type="number" min="0" max={type === 'percent' ? 100 : undefined} value={value}
            onChange={e => setValue(e.target.value)} required placeholder={type === 'percent' ? '10' : '5000'}
            className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian (Rp)</label>
          <input type="number" min="0" value={minPurchase} onChange={e => setMinPurchase(e.target.value)}
            placeholder="0 = tidak ada minimum" className={inp} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
          <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inp} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setActive(a => !a)}
              className={`w-10 h-6 rounded-full transition-colors relative ${active ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">{active ? 'Aktif' : 'Nonaktif'}</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          {initial.id ? 'Simpan Perubahan' : 'Tambah Promo'}
        </button>
      </div>
    </form>
  )
}

export default function Promos() {
  const [promos, setPromos] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    const [p, pr] = await Promise.all([window.electronAPI.getPromos(), window.electronAPI.getProducts()])
    setPromos(p)
    setProducts(pr)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (data) => {
    await window.electronAPI.createPromo(data)
    setShowForm(false)
    load()
  }

  const handleEdit = async (data) => {
    await window.electronAPI.updatePromo(editing.id, data)
    setEditing(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus promo ini?')) return
    await window.electronAPI.deletePromo(id)
    load()
  }

  const handleToggle = async (promo) => {
    await window.electronAPI.updatePromo(promo.id, {
      name: promo.name, type: promo.type, value: promo.value,
      minPurchase: promo.min_purchase, productId: promo.product_id,
      startDate: promo.start_date, endDate: promo.end_date,
      active: !promo.active,
    })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Promo & Diskon</h1>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Tambah Promo
          </button>
        )}
      </div>

      {showForm && <PromoForm products={products} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />}
      {editing && <PromoForm initial={editing} products={products} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}

      {loading ? (
        <p className="text-center text-gray-400 mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama Promo', 'Diskon', 'Berlaku untuk', 'Min. Pembelian', 'Periode', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">
                    {p.type === 'percent' ? `${p.value}%` : formatRupiah(p.value)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.product_name || <span className="text-gray-400">Semua produk</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.min_purchase > 0 ? formatRupiah(p.min_purchase) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.start_date} s/d {p.end_date}
                  </td>
                  <td className="px-4 py-3">{statusBadge(p)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleToggle(p)}
                        className={`px-2.5 py-1 text-xs rounded font-medium ${p.active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {p.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={() => { setEditing(p); setShowForm(false) }}
                        className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="px-2.5 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Belum ada promo. Klik "Tambah Promo" untuk membuat diskon terjadwal.
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
