import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'

const today = new Date().toLocaleDateString('en-CA')
const firstOfMonth = today.slice(0, 8) + '01'

function statusBadge(status) {
  if (status === 'paid')    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Lunas</span>
  if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Cicil</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Belum Bayar</span>
}

export default function PurchaseReport() {
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.electronAPI.getSuppliers().then(setSuppliers)
    loadReport()
  }, [])

  const loadReport = async () => {
    setLoading(true)
    const result = await window.electronAPI.getPurchaseReport({
      startDate, endDate, supplierId: supplierId ? parseInt(supplierId) : null
    })
    setData(result)
    setLoading(false)
  }

  const handleFilter = (e) => {
    e.preventDefault()
    loadReport()
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan Pembelian</h1>

      {/* Filter */}
      <form onSubmit={handleFilter} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sampai</label>
          <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Semua Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
      </form>

      {loading && <p className="text-center text-gray-400">Memuat...</p>}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Transaksi', value: data.summary.total_purchases, fmt: false },
              { label: 'Total Pembelian', value: data.summary.total_amount, fmt: true },
              { label: 'Sudah Dibayar',   value: data.summary.total_paid,    fmt: true, green: true },
              { label: 'Sisa Hutang',     value: data.summary.total_remaining, fmt: true, red: true },
            ].map(({ label, value, fmt, green, red }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-bold ${green ? 'text-green-600' : red ? 'text-red-600' : 'text-gray-800'}`}>
                  {fmt ? formatRupiah(value) : value}
                </p>
              </div>
            ))}
          </div>

          {/* Per Supplier */}
          {data.bySupplier.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">Per Supplier</h2>
              <div className="space-y-2">
                {data.bySupplier.map(s => (
                  <div key={s.supplier} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 truncate">{s.supplier}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (s.total / data.summary.total_amount) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-32 text-right">{formatRupiah(s.total)}</span>
                    <span className="text-xs text-gray-400 w-16 text-right">{s.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tanggal', 'Supplier', 'Total', 'Dibayar', 'Jatuh Tempo', 'Status', 'Catatan'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.purchases.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">{p.supplier_name || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 font-medium">{formatRupiah(p.total)}</td>
                    <td className="px-4 py-3 text-green-600">
                      {p.payment_type === 'cash' ? <span className="text-gray-400">Tunai</span>
                        : `${formatRupiah(p.paid_amount)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.due_date || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.note || '—'}</td>
                  </tr>
                ))}
                {data.purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Tidak ada data pembelian pada periode ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
