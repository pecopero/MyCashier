import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'
import { SkeletonTable } from '../components/Skeleton'

const today = new Date().toLocaleDateString('en-CA')
const firstOfMonth = today.slice(0, 8) + '01'

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500']

export default function CashierReport() {
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate]     = useState(today)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [tab, setTab]             = useState('ringkasan')

  const load = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.getCashierReport({ startDate, endDate })
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const maxOmzet = data?.byCashier?.[0]?.total_omzet || 1

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan per Kasir</h1>

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
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
        <button type="button" onClick={() => window.electronAPI.exportCashierReport({ startDate, endDate })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 ml-auto">
          ↓ Export Excel
        </button>
      </form>

      {loading && <SkeletonTable rows={5} cols={4} />}

      {data && !loading && (
        <>
          {/* Tab */}
          <div className="flex gap-2 mb-4">
            {[['ringkasan','Ringkasan'], ['shift','Per Shift'], ['harian','Harian']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Ringkasan */}
          {tab === 'ringkasan' && (
            <div className="space-y-4">
              {data.byCashier.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Tidak ada data transaksi pada periode ini.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {data.byCashier.map((c, i) => (
                      <div key={c.kasir} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${COLORS[i % COLORS.length]}`}>
                              {c.kasir.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{c.kasir}</p>
                              <p className="text-xs text-gray-400">{c.total_transaksi} transaksi</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-700 text-lg">{formatRupiah(c.total_omzet)}</p>
                            {c.total_diskon > 0 && (
                              <p className="text-xs text-orange-500">Diskon: {formatRupiah(c.total_diskon)}</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${COLORS[i % COLORS.length]}`}
                            style={{ width: `${Math.min(100, (c.total_omzet / maxOmzet) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Per Shift */}
          {tab === 'shift' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Kasir', 'Jumlah Shift', 'Total Transaksi', 'Total Penjualan'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.shifts.map(s => (
                    <tr key={s.kasir} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.kasir}</td>
                      <td className="px-4 py-3 text-center">{s.total_shift}</td>
                      <td className="px-4 py-3 text-center">{s.total_tx}</td>
                      <td className="px-4 py-3 font-medium text-blue-700">{formatRupiah(s.total_sales)}</td>
                    </tr>
                  ))}
                  {data.shifts.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Tidak ada data shift.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Harian */}
          {tab === 'harian' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Tanggal', 'Kasir', 'Transaksi', 'Omzet'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.hari}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{d.kasir}</td>
                      <td className="px-4 py-3 text-center">{d.transaksi}</td>
                      <td className="px-4 py-3 font-medium text-blue-700">{formatRupiah(d.omzet)}</td>
                    </tr>
                  ))}
                  {data.daily.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
