import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatRupiah, formatDate } from '../utils/format'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'
import { SkeletonTable } from '../components/Skeleton'
import { usePagination } from '../hooks/usePagination'

function today() { return new Date().toLocaleDateString('en-CA') }

function VoidConfirmModal({ txId, onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVoid = async () => {
    if (!pin.trim()) return setError('Masukkan PIN owner')
    setLoading(true)
    setError('')
    try {
      await window.electronAPI.voidTransaction(txId, pin)
      onSuccess()
    } catch (e) {
      setError(e.message || 'Gagal void transaksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80">
        <h3 className="font-bold text-gray-800 mb-1">Batalkan Transaksi (Void)</h3>
        <p className="text-sm text-gray-500 mb-4">Stok akan dikembalikan. Masukkan PIN owner untuk konfirmasi.</p>
        <input type="password" placeholder="PIN Owner" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVoid()}
          autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400" />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Batal</button>
          <button onClick={handleVoid} disabled={loading}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Memproses...' : 'Void'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TransactionDetail({ txId, onClose, onVoided }) {
  const [tx, setTx] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showVoid, setShowVoid] = useState(false)

  useEffect(() => {
    window.electronAPI.getTransactionById(txId).then(setTx)
  }, [txId])

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 text-lg">Detail Transaksi</h2>
              {tx?.is_void === 1 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">VOID</span>
              )}
            </div>
            {tx && (
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(tx.created_at)}
                {tx.user_name && <span className="ml-2">· Kasir: <span className="font-medium text-gray-500">{tx.user_name}</span></span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">×</button>
        </div>

        {!tx ? (
          <p className="text-center text-gray-400 py-12">Memuat...</p>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-semibold text-gray-600">Produk</th>
                    <th className="text-center pb-2 font-semibold text-gray-600 w-16">Qty</th>
                    <th className="text-right pb-2 font-semibold text-gray-600 w-28">Harga</th>
                    <th className="text-right pb-2 font-semibold text-gray-600 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.items.map(item => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2.5 text-gray-800">
                        {item.product_name}
                        {item.unit_name && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[11px] rounded font-normal">
                            {item.unit_name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-gray-500">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-500">{formatRupiah(item.price)}</td>
                      <td className="py-2.5 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl space-y-2">
              {tx.discount > 0 && (
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
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  👁 Preview
                </button>
                <button
                  onClick={() => window.electronAPI.printReceipt(tx)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  🖨 Print
                </button>
                {tx.is_void !== 1 && (
                  <button
                    onClick={() => setShowVoid(true)}
                    className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium"
                  >
                    Void
                  </button>
                )}
              </div>
              {showPreview && <ReceiptPreviewModal tx={tx} onClose={() => setShowPreview(false)} />}
              {showVoid && (
                <VoidConfirmModal txId={tx.id}
                  onClose={() => setShowVoid(false)}
                  onSuccess={() => { setShowVoid(false); onVoided(); onClose() }} />
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function Sales() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [startDate, setStartDate]       = useState(today())
  const [endDate, setEndDate]           = useState(today())
  const [selectedTxId, setSelectedTxId] = useState(null)
  const [summary, setSummary]           = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getSalesReport({ startDate, endDate })
      setTransactions(data?.transactions || [])
      setSummary(data?.summary || {})
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { load() }, [])

  const { paged: pagedTx, Pager: TxPager } = usePagination(transactions, 50)

  const setPreset = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    setStartDate(start.toLocaleDateString('en-CA'))
    setEndDate(end.toLocaleDateString('en-CA'))
  }

  const setPresetMonth = () => {
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'))
    setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA'))
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Penjualan</h1>

      {/* Filter */}
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
          {[
            ['Hari ini',  () => { setStartDate(today()); setEndDate(today()) }],
            ['7 hari',    () => setPreset(7)],
            ['Bulan ini', () => setPresetMonth()],
            ['30 hari',   () => setPreset(30)],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">{label}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={load}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Tampilkan
          </button>
          <button onClick={() => window.electronAPI.exportSales({ startDate, endDate })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            Export Excel
          </button>
        </div>
      </div>

      {/* Kartu ringkasan */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Transaksi',   value: summary.total_transactions, fmt: false },
            { label: 'Omzet',       value: summary.total_revenue,      fmt: true  },
            { label: 'Total Diskon',value: summary.total_discount,     fmt: true  },
            { label: 'Laba Kotor',  value: summary.gross_profit,       fmt: true  },
          ].map(({ label, value, fmt }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-xl font-bold text-gray-800">{fmt ? formatRupiah(value) : value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabel transaksi */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-gray-800">
            Daftar Transaksi
            {!loading && transactions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({transactions.length} transaksi)</span>
            )}
          </span>
          <span className="text-xs text-gray-400">Klik baris untuk lihat detail</span>
        </div>

        {loading ? (
          <SkeletonTable rows={10} cols={8} />
        ) : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['No','Waktu','Kasir','Subtotal','Diskon','Total','Bayar','Kembalian'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedTx.map((t, i) => (
                <tr key={t.id} onClick={() => setSelectedTxId(t.id)}
                  className={`border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${t.is_void ? 'opacity-50 bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {transactions.length - i}
                    {t.is_void === 1 && <span className="ml-1 px-1 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">VOID</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.user_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">{formatRupiah(t.subtotal || t.total)}</td>
                  <td className="px-4 py-3 text-orange-600">{t.discount > 0 ? `− ${formatRupiah(t.discount)}` : '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatRupiah(t.total)}</td>
                  <td className="px-4 py-3">{formatRupiah(t.payment)}</td>
                  <td className="px-4 py-3 text-green-600">{formatRupiah(t.change)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Tidak ada transaksi di periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <TxPager />
          </>
        )}
      </div>

      {selectedTxId && (
        <TransactionDetail txId={selectedTxId} onClose={() => setSelectedTxId(null)} onVoided={load} />
      )}
    </div>
  )
}
