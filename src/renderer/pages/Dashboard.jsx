import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'
import { useNavigate } from 'react-router-dom'

function StatCard({ label, value, sub, color, onClick }) {
  const styles = {
    blue:   { wrap: 'bg-blue-600',   text: 'text-white', sub: 'text-blue-100' },
    green:  { wrap: 'bg-green-600',  text: 'text-white', sub: 'text-green-100' },
    orange: { wrap: 'bg-orange-500', text: 'text-white', sub: 'text-orange-100' },
    gray:   { wrap: 'bg-white border border-gray-200', text: 'text-gray-800', sub: 'text-gray-400' },
  }
  const s = styles[color] ?? styles.gray
  return (
    <div onClick={onClick} className={`rounded-xl p-5 ${s.wrap} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
      <p className={`text-xs font-medium ${s.sub} mb-1`}>{label}</p>
      <p className={`text-2xl font-bold ${s.text}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${s.sub}`}>{sub}</p>}
    </div>
  )
}

function BarChart({ data }) {
  if (!data || data.length === 0) return (
    <p className="text-gray-400 text-sm text-center py-8">Belum ada data penjualan.</p>
  )

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  // Isi 7 hari terakhir meski tidak ada transaksi
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA')
    const found = data.find(r => r.day === key)
    days.push({ day: key, revenue: found?.revenue ?? 0, transactions: found?.transactions ?? 0 })
  }

  const dayLabel = (str) => {
    const names = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
    return names[new Date(str + 'T00:00:00').getDay()]
  }

  return (
    <div className="flex items-end gap-2 h-40 px-2">
      {days.map((d, i) => {
        const pct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
        const isToday = d.day === new Date().toLocaleDateString('en-CA')
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {formatRupiah(d.revenue)}
            </div>
            <div className="w-full flex items-end" style={{ height: '120px' }}>
              <div
                className={`w-full rounded-t-md transition-all ${isToday ? 'bg-blue-600' : 'bg-blue-200 group-hover:bg-blue-400'}`}
                style={{ height: `${Math.max(pct, d.revenue > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              {dayLabel(d.day)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dueSoon, setDueSoon] = useState({ hutang: [], piutang: [] })
  const [dailyTarget, setDailyTarget] = useState(0)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    const [result, hutang, piutang, settings] = await Promise.all([
      window.electronAPI.getDashboardData(),
      window.electronAPI.getOverduePurchases().then(o =>
        window.electronAPI.getPurchasesDueSoon().then(s => [...o, ...s])),
      window.electronAPI.getReceivablesDueSoon(),
      window.electronAPI.getSettings(),
    ])
    setData(result)
    setDueSoon({ hutang, piutang })
    setDailyTarget(parseFloat(settings.daily_target) || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">Memuat dashboard...</div>
  )

  const { today, yesterday, chart, hourly, top5, lowStock, recentTx } = data
  const alertCount = dueSoon.hutang.length + dueSoon.piutang.length

  const pct = (curr, prev) => {
    if (!prev) return null
    const diff = ((curr - prev) / prev) * 100
    return { diff: Math.abs(diff).toFixed(0), up: diff >= 0 }
  }
  const revPct = pct(today.revenue, yesterday?.revenue)
  const txPct  = pct(today.transactions, yesterday?.transactions)
  const prfPct = pct(today.profit, yesterday?.profit)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {/* Alert jatuh tempo */}
      {alertCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-red-700 text-sm">Perhatian — Jatuh Tempo</p>
          {dueSoon.hutang.map(h => {
            const sisa = h.total - h.paid_amount
            const lewat = h.due_date < new Date().toLocaleDateString('en-CA')
            return (
              <div key={h.id} className="flex justify-between items-center text-sm">
                <span className="text-red-700">
                  {lewat ? '⚠ Lewat!' : '⏰'} Hutang ke <strong>{h.supplier_name || 'Supplier'}</strong> — sisa {formatRupiah(sisa)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{h.due_date}</span>
                  <button onClick={() => navigate('/hutang')}
                    className="text-xs text-red-600 hover:underline font-medium">Bayar →</button>
                </div>
              </div>
            )
          })}
          {dueSoon.piutang.map(r => {
            const sisa = r.total_amount - r.paid_amount
            return (
              <div key={r.id} className="flex justify-between items-center text-sm">
                <span className="text-orange-700">
                  ⏰ Piutang dari <strong>{r.customer_name}</strong> — {formatRupiah(sisa)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-500">{r.due_date}</span>
                  <button onClick={() => navigate('/piutang')}
                    className="text-xs text-orange-600 hover:underline font-medium">Tagih →</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Kartu ringkasan hari ini */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Hari Ini</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Transaksi" value={today.transactions} color="blue"
            sub={txPct ? `${txPct.up ? '↑' : '↓'} ${txPct.diff}% vs kemarin` : 'transaksi selesai'}
            onClick={() => navigate('/reports')} />
          <StatCard label="Omzet" value={formatRupiah(today.revenue)} color="blue"
            sub={revPct ? `${revPct.up ? '↑' : '↓'} ${revPct.diff}% vs kemarin` : 'total penjualan'} />
          <StatCard label="Modal (HPP)" value={formatRupiah(today.cost)} color="orange"
            sub="harga pokok terjual" />
          <StatCard label="Laba Kotor" value={formatRupiah(today.profit)} color="green"
            sub={prfPct ? `${prfPct.up ? '↑' : '↓'} ${prfPct.diff}% vs kemarin` : today.revenue > 0 ? `Margin ${(today.profit / today.revenue * 100).toFixed(1)}%` : 'laba hari ini'} />
        </div>
      </div>

      {/* Target penjualan harian */}
      {dailyTarget > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-gray-700">Target Penjualan Hari Ini</p>
            <span className={`text-sm font-bold ${today.revenue >= dailyTarget ? 'text-green-600' : 'text-blue-600'}`}>
              {Math.min(100, Math.round(today.revenue / dailyTarget * 100))}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${today.revenue >= dailyTarget ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (today.revenue / dailyTarget) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{formatRupiah(today.revenue)}</span>
            <span>Target: {formatRupiah(dailyTarget)}</span>
          </div>
          {today.revenue >= dailyTarget && (
            <p className="text-xs text-green-600 font-medium mt-1">Target tercapai!</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Grafik 7 hari */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Penjualan 7 Hari Terakhir</h2>
            <button onClick={() => navigate('/reports')}
              className="text-xs text-blue-600 hover:underline">Lihat laporan →</button>
          </div>
          <BarChart data={chart} />
        </div>

        {/* Alert stok menipis */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Stok Menipis</h2>
            {lowStock.length > 0 && (
              <button onClick={() => navigate('/purchases')}
                className="text-xs text-blue-600 hover:underline">Beli stok →</button>
            )}
          </div>
          {lowStock.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm text-green-600 font-medium">Semua stok aman</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStock.slice(0, 6).map(p => (
                <li key={p.id} className="flex justify-between items-center text-sm">
                  <span className="truncate text-gray-700 mr-2">{p.name}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.stock === 0 ? 'Habis' : `Sisa ${p.stock}`}
                  </span>
                </li>
              ))}
              {lowStock.length > 6 && (
                <li className="text-xs text-gray-400 text-center pt-1">
                  +{lowStock.length - 6} produk lainnya
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Grafik per jam + Top produk */}
      <div className="grid grid-cols-2 gap-6">
        {/* Penjualan per jam hari ini */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Penjualan Per Jam (Hari Ini)</h2>
          {hourly.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Belum ada transaksi hari ini.</p>
          ) : (
            <div className="flex items-end gap-1 h-28">
              {Array.from({ length: 24 }, (_, h) => {
                const hStr = String(h).padStart(2, '0')
                const d = hourly.find(r => r.hour === hStr)
                const maxRev = Math.max(...hourly.map(r => r.revenue), 1)
                const pct = d ? (d.revenue / maxRev) * 100 : 0
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    {d && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                        {formatRupiah(d.revenue)}
                      </div>
                    )}
                    <div className="w-full flex items-end" style={{ height: '80px' }}>
                      <div className={`w-full rounded-t transition-all ${d ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-100'}`}
                        style={{ height: `${Math.max(pct, d ? 4 : 0)}%` }} />
                    </div>
                    {h % 4 === 0 && <span className="text-[9px] text-gray-400">{hStr}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top 5 produk 7 hari */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Top Produk (7 Hari)</h2>
          {top5.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Belum ada data.</p>
          ) : (
            <div className="space-y-3">
              {top5.map((p, i) => {
                const maxQty = top5[0].total_qty
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{p.product_name}</span>
                      <span className="text-gray-500 shrink-0">{p.total_qty} pcs</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(p.total_qty / maxQty) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaksi terbaru */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Transaksi Terbaru</h2>
          <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:underline">
            Lihat semua →
          </button>
        </div>
        {recentTx.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada transaksi hari ini.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Waktu','Total','Bayar','Kembalian'].map(h => (
                <th key={h} className="text-left px-5 py-2.5 font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {recentTx.map(t => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(t.created_at)}</td>
                  <td className="px-5 py-3 font-medium">{formatRupiah(t.total)}</td>
                  <td className="px-5 py-3">{formatRupiah(t.payment)}</td>
                  <td className="px-5 py-3">{formatRupiah(t.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
