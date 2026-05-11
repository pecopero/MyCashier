import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatRupiah, formatDate } from '../utils/format'

function TransactionDetail({ txId, onClose }) {
  const [tx, setTx] = useState(null)

  useEffect(() => {
    window.electronAPI.getTransactionById(txId).then(setTx)
  }, [txId])

  if (!tx) return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-gray-400">Memuat...</div>
    </div>,
    document.body
  )

  const hasDiscount = tx.discount > 0

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Detail Transaksi</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">×</button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 font-semibold text-gray-600">Produk</th>
                <th className="text-center pb-2 font-semibold text-gray-600 w-16">Qty</th>
                <th className="text-right pb-2 font-semibold text-gray-600 w-24">Harga</th>
                <th className="text-right pb-2 font-semibold text-gray-600 w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-800">{item.product_name}</td>
                  <td className="py-2.5 text-center text-gray-500">{item.quantity}</td>
                  <td className="py-2.5 text-right text-gray-500">{formatRupiah(item.price)}</td>
                  <td className="py-2.5 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan pembayaran */}
        <div className="px-6 py-4 border-t border-gray-200 space-y-2 bg-gray-50 rounded-b-xl">
          {hasDiscount && (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatRupiah(tx.subtotal || tx.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-orange-600">
                <span>Diskon {tx.discount_type === 'percent' ? '(%)' : ''}</span>
                <span>− {formatRupiah(tx.discount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span className="text-blue-600">{formatRupiah(tx.total)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Bayar</span>
            <span>{formatRupiah(tx.payment)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-green-600">
            <span>Kembalian</span>
            <span>{formatRupiah(tx.change)}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function today() { return new Date().toLocaleDateString('en-CA') }

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50   text-blue-700   border-blue-200',
    green:  'bg-green-50  text-green-700  border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red:    'bg-red-50    text-red-700    border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function PLRow({ label, value, indent = false, bold = false, color = 'gray' }) {
  const textColor = color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-600' : 'text-gray-800'
  return (
    <div className={`flex justify-between py-2.5 border-b border-gray-100 ${indent ? 'pl-6' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold' : 'text-gray-600'} ${indent ? 'text-gray-500' : ''}`}>{label}</span>
      <span className={`text-sm font-semibold ${textColor}`}>{value}</span>
    </div>
  )
}

export default function Reports() {
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate]     = useState(today())
  const [activeTab, setActiveTab] = useState('sales')
  const [salesData, setSalesData]   = useState(null)
  const [plData, setPlData]         = useState(null)
  const [lowStock, setLowStock]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [selectedTxId, setSelectedTxId] = useState(null)

  const loadSales = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getSalesReport({ startDate, endDate })
      setSalesData(data)
    } finally {
      setLoading(false)
    }
  }

  const loadPL = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getProfitLossReport({ startDate, endDate })
      setPlData(data)
    } finally {
      setLoading(false)
    }
  }

  const loadLowStock = async () => {
    try {
      const data = await window.electronAPI.getLowStockReport()
      setLowStock(data || [])
    } catch (_) {}
  }

  useEffect(() => { loadSales(); loadLowStock() }, [])

  const handleLoad = () => {
    if (activeTab === 'sales') loadSales()
    else if (activeTab === 'pl') loadPL()
  }

  useEffect(() => {
    if (activeTab === 'pl' && !plData) loadPL()
  }, [activeTab])

  const setPreset = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    setStartDate(start.toLocaleDateString('en-CA'))
    setEndDate(end.toLocaleDateString('en-CA'))
  }

  const setPresetMonth = () => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    setStartDate(new Date(y, m, 1).toLocaleDateString('en-CA'))
    setEndDate(new Date(y, m + 1, 0).toLocaleDateString('en-CA'))
  }

  const tabs = [
    { key: 'sales', label: 'Penjualan' },
    { key: 'pl',    label: 'Laba Rugi' },
    { key: 'stock', label: 'Stok Menipis', badge: lowStock.length },
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan</h1>

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter tanggal (Penjualan & L/R) */}
      {activeTab !== 'stock' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dari</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[['Hari ini', () => { setStartDate(today()); setEndDate(today()) }],
              ['7 hari',   () => setPreset(7)],
              ['Bulan ini',() => setPresetMonth()],
              ['30 hari',  () => setPreset(30)],
            ].map(([label, fn]) => (
              <button key={label} onClick={fn}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">{label}</button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleLoad}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Tampilkan
            </button>
            {activeTab === 'sales' && (
              <button onClick={() => window.electronAPI.exportSales({ startDate, endDate })}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Export Excel
              </button>
            )}
            {activeTab === 'pl' && (
              <button onClick={() => window.electronAPI.exportProfitLoss({ startDate, endDate })}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Export Excel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB PENJUALAN ── */}
      {activeTab === 'sales' && (
        loading ? <p className="text-gray-400 text-center mt-8">Memuat...</p> :
        salesData ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Transaksi" value={salesData.summary.total_transactions} color="blue" />
              <StatCard label="Omzet"           value={formatRupiah(salesData.summary.total_revenue)} color="blue" />
              <StatCard label="Total Diskon"    value={formatRupiah(salesData.summary.total_discount)} color="orange" />
              <StatCard label="HPP (Modal)"     value={formatRupiah(salesData.summary.total_cost)} color="orange" />
              <StatCard label="Laba Kotor"
                value={formatRupiah(salesData.summary.gross_profit)}
                sub={salesData.summary.total_revenue > 0 ? `Margin ${(salesData.summary.gross_profit / salesData.summary.total_revenue * 100).toFixed(1)}%` : ''}
                color="green" />
            </div>

            {salesData.topProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Produk Terlaris</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#','Produk','Qty Terjual','Omzet'].map(h => (
                        <th key={h} className="text-left px-4 py-2 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.topProducts.map((p, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{p.product_name}</td>
                        <td className="px-4 py-2">{p.total_qty}</td>
                        <td className="px-4 py-2">{formatRupiah(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Riwayat Transaksi</span>
                <span className="text-xs text-gray-400">Klik baris untuk lihat detail</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Waktu','Subtotal','Diskon','Total','Bayar','Kembalian'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-semibold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {salesData.transactions.map(t => (
                    <tr key={t.id} onClick={() => setSelectedTxId(t.id)}
                      className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
                      <td className="px-4 py-2.5">{formatRupiah(t.subtotal || t.total)}</td>
                      <td className="px-4 py-2.5 text-orange-600">{t.discount > 0 ? `− ${formatRupiah(t.discount)}` : '—'}</td>
                      <td className="px-4 py-2.5 font-medium">{formatRupiah(t.total)}</td>
                      <td className="px-4 py-2.5">{formatRupiah(t.payment)}</td>
                      <td className="px-4 py-2.5">{formatRupiah(t.change)}</td>
                    </tr>
                  ))}
                  {salesData.transactions.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada transaksi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedTxId && (
              <TransactionDetail txId={selectedTxId} onClose={() => setSelectedTxId(null)} />
            )}
          </>
        ) : null
      )}

      {/* ── TAB LABA RUGI ── */}
      {activeTab === 'pl' && (
        loading ? <p className="text-gray-400 text-center mt-8">Memuat...</p> :
        plData ? (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Laporan Laba Rugi</h3>
                <p className="text-xs text-gray-500">{startDate} s/d {endDate}</p>
              </div>
              <div className="px-5 py-2">
                <PLRow label="Penjualan Kotor" value={formatRupiah(plData.revenue + plData.discount)} bold />
                <PLRow label="Diskon diberikan" value={`− ${formatRupiah(plData.discount)}`} indent color="red" />
                <PLRow label="Penjualan Bersih" value={formatRupiah(plData.revenue)} bold />

                <div className="pt-2" />
                <PLRow label="Harga Pokok Penjualan (HPP)" value={`− ${formatRupiah(plData.cogs)}`} bold color="red" />

                <div className="pt-2 pb-1">
                  <div className="flex justify-between py-2.5 bg-green-50 rounded-lg px-3 -mx-3">
                    <span className="text-sm font-bold text-green-800">Laba Kotor</span>
                    <span className={`text-sm font-bold ${plData.grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatRupiah(plData.grossProfit)}
                    </span>
                  </div>
                </div>

                <div className="pt-2" />
                <PLRow label="Pengeluaran Operasional" value={`− ${formatRupiah(plData.totalExpenses)}`} bold color="red" />
                {plData.expensesByCategory.map(c => (
                  <PLRow key={c.category} label={c.category} value={formatRupiah(c.total)} indent />
                ))}
                {plData.expensesByCategory.length === 0 && (
                  <p className="text-xs text-gray-400 pl-6 py-2">Belum ada pengeluaran dicatat.</p>
                )}

                <div className="pt-2 pb-2">
                  <div className={`flex justify-between py-3 rounded-lg px-3 -mx-3 ${plData.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <span className="font-bold text-gray-800">Laba Bersih</span>
                    <span className={`font-bold text-lg ${plData.netProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {formatRupiah(plData.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {plData.revenue > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Margin Kotor"
                  value={`${(plData.grossProfit / plData.revenue * 100).toFixed(1)}%`}
                  color="green" />
                <StatCard label="Margin Bersih"
                  value={`${(plData.netProfit / plData.revenue * 100).toFixed(1)}%`}
                  color={plData.netProfit >= 0 ? 'blue' : 'red'} />
                <StatCard label="Total Pengeluaran"
                  value={formatRupiah(plData.totalExpenses)}
                  color="orange" />
              </div>
            )}
          </div>
        ) : null
      )}

      {/* ── TAB STOK MENIPIS ── */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Produk Stok Menipis / Habis</h3>
            <button onClick={loadLowStock} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Produk','Kategori','Stok Saat Ini','Stok Minimum','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category || '—'}</td>
                  <td className="px-4 py-3 font-bold">{p.stock === 0 ? <span className="text-red-600">0</span> : <span className="text-orange-500">{p.stock}</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{p.min_stock}</td>
                  <td className="px-4 py-3">
                    {p.stock === 0
                      ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Habis</span>
                      : <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Menipis</span>}
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-green-600 font-medium">Semua stok aman ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
