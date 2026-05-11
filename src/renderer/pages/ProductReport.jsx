import { useState, useEffect } from 'react'
import { formatRupiah } from '../utils/format'
import { useSortable } from '../hooks/useSortable'
import { usePagination } from '../hooks/usePagination'
import { SkeletonTable, SkeletonCards } from '../components/Skeleton'

const today = new Date().toLocaleDateString('en-CA')
const firstOfMonth = today.slice(0, 8) + '01'

const PRESETS = [
  { label: 'Hari ini',  start: today,       end: today },
  { label: '7 hari',   start: new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-CA'), end: today },
  { label: 'Bulan ini', start: firstOfMonth, end: today },
  { label: '30 hari',  start: new Date(Date.now() - 29 * 86400000).toLocaleDateString('en-CA'), end: today },
]

const PERIODS = [
  { key: 'daily',   label: 'Harian' },
  { key: 'monthly', label: 'Bulanan' },
  { key: 'yearly',  label: 'Tahunan' },
  { key: 'all',     label: 'All Time' },
]

function MarginBadge({ pct }) {
  const val = Number(pct ?? 0)
  let cls = 'bg-red-100 text-red-700'
  if (val >= 30) cls = 'bg-green-100 text-green-700'
  else if (val >= 10) cls = 'bg-yellow-100 text-yellow-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {val.toFixed(1)}%
    </span>
  )
}

export default function ProductReport() {
  const [tab, setTab] = useState('laba')

  // --- Laba per Produk state ---
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate]     = useState(today)
  const [labaData, setLabaData]   = useState([])
  const [labaLoading, setLabaLoading] = useState(false)

  // --- Top 10 state ---
  const [period, setPeriod]       = useState('monthly')
  const [topData, setTopData]     = useState([])
  const [topLoading, setTopLoading] = useState(false)

  const loadLaba = async () => {
    setLabaLoading(true)
    try {
      const result = await window.electronAPI.getProductProfitReport({ startDate, endDate })
      setLabaData(result || [])
    } finally {
      setLabaLoading(false)
    }
  }

  const loadTop = async (p) => {
    setTopLoading(true)
    try {
      const result = await window.electronAPI.getTopProducts(p || period)
      setTopData(result || [])
    } finally {
      setTopLoading(false)
    }
  }

  useEffect(() => { loadLaba() }, [])
  useEffect(() => { loadTop(period) }, [period])

  // Summary cards
  const totalQty     = labaData.reduce((s, r) => s + (r.total_qty || 0), 0)
  const totalOmzet   = labaData.reduce((s, r) => s + (r.total_revenue || 0), 0)
  const totalHPP     = labaData.reduce((s, r) => s + (r.total_cost || 0), 0)
  const totalLaba    = labaData.reduce((s, r) => s + (r.gross_profit || 0), 0)

  const maxQty = topData[0]?.total_qty || 1

  const { sorted: sortedLaba, Th: ThLaba } = useSortable(labaData, 'gross_profit', 'desc')
  const { paged: pagedLaba, Pager: LabaPages } = usePagination(sortedLaba, 50)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan Produk</h1>

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        {[['laba','Laba per Produk'], ['top','Top 10 Produk']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Laba per Produk ═══ */}
      {tab === 'laba' && (
        <>
          {/* Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setStartDate(p.start); setEndDate(p.end) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    startDate === p.start && endDate === p.end
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); loadLaba() }}
              className="flex gap-3 items-end flex-wrap">
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
          </div>

          {labaLoading ? (
            <>
              <SkeletonCards count={4} />
              <div className="mt-6"><SkeletonTable rows={8} cols={7} /></div>
            </>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Produk Terjual', value: totalQty.toLocaleString('id-ID') + ' item', color: 'bg-blue-50 text-blue-700' },
                  { label: 'Total Omzet',          value: formatRupiah(totalOmzet),                    color: 'bg-green-50 text-green-700' },
                  { label: 'Total HPP',             value: formatRupiah(totalHPP),                     color: 'bg-orange-50 text-orange-700' },
                  { label: 'Total Laba Kotor',      value: formatRupiah(totalLaba),                    color: 'bg-purple-50 text-purple-700' },
                ].map(card => (
                  <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
                    <p className="text-xs font-medium mb-1 opacity-75">{card.label}</p>
                    <p className="text-lg font-bold">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              {labaData.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                  Tidak ada data pada periode ini.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
                    <button onClick={() => window.electronAPI.exportProductProfit({ startDate, endDate })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100">
                      ↓ Export Excel
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                          <ThLaba col="product_name" className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produk</ThLaba>
                          <ThLaba col="total_qty"    className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Qty Terjual</ThLaba>
                          <ThLaba col="total_revenue" className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Omzet</ThLaba>
                          <ThLaba col="total_cost"   className="text-right px-4 py-3 text-xs font-semibold text-gray-600">HPP</ThLaba>
                          <ThLaba col="gross_profit" className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Laba Kotor</ThLaba>
                          <ThLaba col="margin_pct"   className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Margin</ThLaba>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pagedLaba.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{row.product_name}</td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {Number(row.total_qty || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(row.total_revenue)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{formatRupiah(row.total_cost)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${row.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatRupiah(row.gross_profit)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <MarginBadge pct={row.margin_pct} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <LabaPages />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ Tab: Top 10 Produk ═══ */}
      {tab === 'top' && (
        <>
          {/* Period selector */}
          <div className="flex gap-2 mb-6">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  period === p.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {topLoading ? (
            <p className="text-center text-gray-400 py-12">Memuat...</p>
          ) : topData.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Belum ada data transaksi pada periode ini.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 w-12">Rank</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produk</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Qty Terjual</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Omzet</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Transaksi</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-40">Proporsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topData.map((row, i) => {
                      const pct = Math.round((row.total_qty / maxQty) * 100)
                      const MEDAL = ['🥇','🥈','🥉']
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center">
                            {i < 3 ? (
                              <span className="text-lg">{MEDAL[i]}</span>
                            ) : (
                              <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                {i + 1}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{row.product_name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">
                            {Number(row.total_qty || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(row.total_revenue)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {Number(row.total_transactions || 0).toLocaleString('id-ID')} transaksi
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-blue-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
