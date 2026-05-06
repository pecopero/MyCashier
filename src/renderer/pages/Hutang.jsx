import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'

function today() { return new Date().toLocaleDateString('en-CA') }
function tomorrow() { return new Date(Date.now() + 86400000).toLocaleDateString('en-CA') }
function in2days() { return new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA') }

function StatusBadge({ status, dueDate }) {
  const t = today(), tom = tomorrow(), i2 = in2days()
  if (status === 'paid')    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Lunas</span>
  if (dueDate && dueDate < t)  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">Lewat!</span>
  if (dueDate && dueDate <= tom) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Besok</span>
  if (dueDate && dueDate <= i2)  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">2 Hari</span>
  if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Cicil</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Belum Bayar</span>
}

function PayModal({ purchase, onClose, onPaid }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const remaining = purchase.total - purchase.paid_amount

  const handleSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num <= 0 || num > remaining) return alert('Jumlah tidak valid.')
    await window.electronAPI.addPurchasePayment(purchase.id, num, note)
    onPaid()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Bayar Hutang</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span className="font-medium">{purchase.supplier_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Hutang</span><span className="font-medium">{formatRupiah(purchase.total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Sudah Dibayar</span><span className="text-green-600">{formatRupiah(purchase.paid_amount)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-semibold">Sisa</span><span className="font-bold text-red-600">{formatRupiah(remaining)}</span></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar</label>
            <input type="number" min="1" max={remaining} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`Maks. ${formatRupiah(remaining)}`} required autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => setAmount(String(remaining))}
              className="text-xs text-blue-600 hover:underline mt-1">Bayar lunas ({formatRupiah(remaining)})</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
            <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Simpan Bayar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExtendModal({ purchase, onClose, onExtended }) {
  const [newDate, setNewDate] = useState(purchase.due_date || today())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newDate) return
    await window.electronAPI.extendPurchaseDueDate(purchase.id, newDate)
    onExtended()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Perpanjang Jatuh Tempo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-500">Jatuh tempo saat ini: <strong>{purchase.due_date || '—'}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Baru</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
            <button type="submit" className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium">Perpanjang</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Hutang() {
  const [hutang, setHutang] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('unpaid')
  const [payTarget, setPayTarget] = useState(null)
  const [extendTarget, setExtendTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    const data = filter === 'all'
      ? await window.electronAPI.getPurchases({ limit: 200 })
      : await window.electronAPI.getUnpaidPurchases()
    setHutang(filter === 'all' ? data : data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const totalSisa = hutang
    .filter(h => h.status !== 'paid')
    .reduce((s, h) => s + (h.total - h.paid_amount), 0)

  const overdue = hutang.filter(h => h.due_date && h.due_date < today() && h.status !== 'paid')

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Hutang Supplier</h1>
          {totalSisa > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              Total sisa hutang: <strong className="text-red-600">{formatRupiah(totalSisa)}</strong>
              {overdue.length > 0 && <span className="ml-2 text-red-600 font-medium">· {overdue.length} sudah lewat jatuh tempo!</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {['unpaid', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'unpaid' ? 'Belum Lunas' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Tanggal', 'Supplier', 'Total', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {hutang.filter(h => filter === 'all' || h.status !== 'paid').map(h => {
                const sisa = h.total - h.paid_amount
                return (
                  <tr key={h.id} className={`border-t border-gray-100 hover:bg-gray-50 ${h.due_date && h.due_date < today() && h.status !== 'paid' ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(h.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{h.supplier_name || '—'}</td>
                    <td className="px-4 py-3">{formatRupiah(h.total)}</td>
                    <td className="px-4 py-3 text-green-600">{formatRupiah(h.paid_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{h.status === 'paid' ? <span className="text-gray-400">0</span> : formatRupiah(sisa)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.due_date || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={h.status} dueDate={h.due_date} /></td>
                    <td className="px-4 py-3">
                      {h.status !== 'paid' && (
                        <div className="flex gap-2">
                          <button onClick={() => setPayTarget(h)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Bayar</button>
                          {h.due_date && (
                            <button onClick={() => setExtendTarget(h)}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">Perpanjang</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {hutang.filter(h => filter === 'all' || h.status !== 'paid').length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {filter === 'unpaid' ? 'Tidak ada hutang yang belum lunas.' : 'Belum ada data pembelian kredit.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {payTarget && <PayModal purchase={payTarget} onClose={() => setPayTarget(null)} onPaid={load} />}
      {extendTarget && <ExtendModal purchase={extendTarget} onClose={() => setExtendTarget(null)} onExtended={load} />}
    </div>
  )
}
