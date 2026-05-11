import { useState, useEffect, useCallback } from 'react'
import { formatRupiah, formatDate } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

function dayLabel(str, days) {
  const d = new Date(str + 'T00:00:00')
  if (days <= 7) return DAY_NAMES[d.getDay()]
  const m = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return m
}

function fmtAxis(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}jt`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`
  return String(n)
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name === 'revenue' ? `Omzet: ${formatRupiah(p.value)}` : `Transaksi: ${p.value}`}
        </p>
      ))}
    </div>
  )
}

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [dueSoon, setDueSoon]   = useState({ hutang: [], piutang: [] })
  const [dailyTarget, setDailyTarget] = useState(0)

  // Chart state
  const [chartDays, setChartDays]   = useState(7)
  const [chartData, setChartData]   = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [result, overdue, dueSoonH, piutang, settings] = await Promise.all([
        window.electronAPI.getDashboardData(),
        window.electronAPI.getOverduePurchases().catch(() => []),
        window.electronAPI.getPurchasesDueSoon().catch(() => []),
        window.electronAPI.getReceivablesDueSoon().catch(() => []),
        window.electronAPI.getSettings().catch(() => ({})),
      ])
      if (result) {
        setData(result)
        setChartData(fillChartData(result.chart, 7))
      }
      setDueSoon({ hutang: [...(overdue || []), ...(dueSoonH || [])], piutang: piutang || [] })
      setDailyTarget(parseFloat(settings?.daily_target) || 0)
    } catch (_) {}
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const loadChart = useCallback(async (days) => {
    setChartLoading(true)
    const raw = await window.electronAPI.getSalesChart(days)
    setChartData(fillChartData(raw, days))
    setChartLoading(false)
  }, [])

  useEffect(() => {
    if (!loading) loadChart(chartDays)
  }, [chartDays])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">Memuat dashboard...</div>
  )

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
      <p className="text-lg font-medium">Gagal memuat data dashboard</p>
      <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
        Coba Lagi
      </button>
    </div>
  )

  const { today, yesterday, hourly, top5, lowStock, recentTx } = data
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
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
          ↻ Refresh
        </button>
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
            onClick={() => navigate('/sales')} />
          <StatCard label="Omzet" value={formatRupiah(today.revenue)} color="blue"
            sub={revPct ? `${revPct.up ? '↑' : '↓'} ${revPct.diff}% vs kemarin` : 'total penjualan'}
            onClick={() => navigate('/sales')} />
          <StatCard label="Modal (HPP)" value={formatRupiah(today.cost)} color="orange"
            sub="harga pokok terjual"
            onClick={() => navigate('/reports')} />
          <StatCard label="Laba Kotor" value={formatRupiah(today.profit)} color="green"
            sub={prfPct ? `${prfPct.up ? '↑' : '↓'} ${prfPct.diff}% vs kemarin` : today.revenue > 0 ? `Margin ${(today.profit / today.revenue * 100).toFixed(1)}%` : 'laba hari ini'}
            onClick={() => navigate('/reports')} />
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

      {/* Grafik penjualan + stok menipis */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Tren Penjualan</h2>
            <div className="flex items-center gap-2">
              {chartLoading && <span className="text-xs text-gray-400">Memuat...</span>}
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setChartDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${chartDays === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {d}H
                </button>
              ))}
              <button onClick={() => navigate('/reports')}
                className="text-xs text-blue-600 hover:underline ml-1">Laporan →</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue"
                stroke="#3b82f6" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stok menipis */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Stok Menipis</h2>
            {lowStock.length > 0 && (
              <button onClick={() => navigate('/low-stock')}
                className="text-xs text-blue-600 hover:underline">Lihat semua →</button>
            )}
          </div>
          {lowStock.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm text-green-600 font-medium">Semua stok aman</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStock.slice(0, 7).map(p => (
                <li key={p.id} className="flex justify-between items-center text-sm">
                  <span className="truncate text-gray-700 mr-2">{p.name}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.stock === 0 ? 'Habis' : `Sisa ${p.stock}`}
                  </span>
                </li>
              ))}
              {lowStock.length > 7 && (
                <li className="text-xs text-gray-400 text-center pt-1">+{lowStock.length - 7} produk lainnya</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Penjualan per jam + Top produk */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Penjualan Per Jam (Hari Ini)</h2>
          {hourly.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Belum ada transaksi hari ini.</p>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={buildHourlyData(hourly)} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  interval={3} />
                <Tooltip formatter={(v) => [formatRupiah(v), 'Omzet']}
                  labelFormatter={l => `Jam ${l}:00`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Top Produk ({chartDays} Hari)</h2>
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
          <button onClick={() => navigate('/sales')} className="text-xs text-blue-600 hover:underline">
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
                <tr key={t.id} onClick={() => navigate('/sales')}
                  className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors">
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

// ── Utilities ─────────────────────────────────────────────────────────────────
function fillChartData(raw, days) {
  const map = Object.fromEntries((raw || []).map(r => [r.day, r]))
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toLocaleDateString('en-CA')
    result.push({
      day: key,
      label: dayLabel(key, days),
      revenue: map[key]?.revenue ?? 0,
      transactions: map[key]?.transactions ?? 0,
    })
  }
  return result
}

function buildHourlyData(hourly) {
  return Array.from({ length: 24 }, (_, h) => {
    const hStr = String(h).padStart(2, '0')
    const d = hourly.find(r => r.hour === hStr)
    return { hour: hStr, revenue: d?.revenue ?? 0, count: d?.count ?? 0 }
  })
}
