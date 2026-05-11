import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'
import { useSortable } from '../hooks/useSortable'
import { usePagination } from '../hooks/usePagination'
import { SkeletonTable } from '../components/Skeleton'

const today = new Date().toLocaleDateString('en-CA')
const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toLocaleDateString('en-CA')

function PriceArrow({ oldVal, newVal }) {
  if (newVal > oldVal) {
    return <span className="inline-flex items-center gap-0.5 text-green-600 font-semibold text-xs">&#8593;</span>
  }
  if (newVal < oldVal) {
    return <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold text-xs">&#8595;</span>
  }
  return <span className="text-gray-400 text-xs">&#8212;</span>
}

function PriceCell({ oldVal, newVal }) {
  const changed = oldVal !== newVal
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${changed ? 'line-through text-gray-400' : 'text-gray-700'} text-sm`}>
        {formatRupiah(oldVal)}
      </span>
      {changed && (
        <>
          <PriceArrow oldVal={oldVal} newVal={newVal} />
          <span className={`text-sm font-semibold ${newVal > oldVal ? 'text-green-600' : 'text-red-600'}`}>
            {formatRupiah(newVal)}
          </span>
        </>
      )}
    </div>
  )
}

function fmtDatetime(s) {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function PriceHistory() {
  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate]     = useState(today)
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.getAllPriceHistory({ startDate, endDate })
      setData(result || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const { sorted, Th } = useSortable(data, 'changed_at', 'desc')
  const { paged, Pager } = usePagination(sorted, 50)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Riwayat Perubahan Harga</h1>

      {/* Filter */}
      <form onSubmit={e => { e.preventDefault(); load() }}
        className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3 items-end flex-wrap">
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
        <button type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
      </form>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Tidak ada perubahan harga pada periode ini.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {data.length} perubahan harga ditemukan
            </p>
            <button onClick={() => window.electronAPI.exportPriceHistory({ startDate, endDate })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100">
              ↓ Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <Th col="product_name" className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produk</Th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Harga Jual</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">HPP (Harga Beli)</th>
                  <Th col="changed_by"   className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Diubah Oleh</Th>
                  <Th col="changed_at"   className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tanggal</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.product_name}</td>
                    <td className="px-4 py-3">
                      <PriceCell oldVal={row.old_price} newVal={row.new_price} />
                    </td>
                    <td className="px-4 py-3">
                      <PriceCell oldVal={row.old_cost_price} newVal={row.new_cost_price} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.changed_by || <span className="text-gray-300 italic">Sistem</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtDatetime(row.changed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager />
        </div>
      )}
    </div>
  )
}
