import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'

function ReturnForm({ onDone }) {
  const [txId, setTxId] = useState('')
  const [tx, setTx] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!txId) return
    const result = await window.electronAPI.getTransactionById(parseInt(txId))
    if (result) { setTx(result); setNotFound(false); setSelectedItems([]) }
    else { setTx(null); setNotFound(true) }
  }

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) return prev.filter(i => i.id !== item.id)
      return [...prev, { ...item, returnQty: item.quantity }]
    })
  }

  const setReturnQty = (itemId, qty) => {
    setSelectedItems(prev => prev.map(i => i.id === itemId ? { ...i, returnQty: Math.min(qty, i.quantity) } : i))
  }

  const totalRefund = selectedItems.reduce((s, i) => s + i.price * i.returnQty, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItems.length) return alert('Pilih minimal 1 item untuk diretur.')
    setLoading(true)
    await window.electronAPI.createReturn({
      transactionId: tx.id,
      items: selectedItems.map(i => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.returnQty,
        price: i.price,
        subtotal: i.price * i.returnQty,
      })),
      note,
    })
    setLoading(false)
    onDone()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="font-bold text-gray-800 mb-4">Buat Retur</h2>

      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input type="number" placeholder="Masukkan ID Transaksi..." value={txId}
          onChange={e => setTxId(e.target.value)} min="1"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Cari Transaksi
        </button>
      </form>

      {notFound && <p className="text-red-500 text-sm mb-4">Transaksi #{txId} tidak ditemukan.</p>}

      {tx && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Transaksi #{tx.id}</span>
              <span className="text-gray-500">{formatDate(tx.created_at)}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">Total: {formatRupiah(tx.total)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pilih item yang akan diretur:</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {tx.items.map(item => {
                const selected = selectedItems.find(i => i.id === item.id)
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${selected ? 'bg-red-50' : ''}`}>
                    <input type="checkbox" checked={!!selected} onChange={() => toggleItem(item)}
                      className="w-4 h-4 accent-red-500 cursor-pointer" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{formatRupiah(item.price)} × {item.quantity}</p>
                    </div>
                    {selected && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Qty retur:</label>
                        <input type="number" min="1" max={item.quantity} value={selected.returnQty}
                          onChange={e => setReturnQty(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center" />
                        <span className="text-sm font-medium text-red-600">{formatRupiah(item.price * selected.returnQty)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Refund</span>
              <span className="text-lg font-bold text-red-600">{formatRupiah(totalRefund)}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan / Catatan</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opsional..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setTx(null); setTxId('') }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
            <button type="submit" disabled={loading || !selectedItems.length}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
              {loading ? 'Memproses...' : 'Proses Retur'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function Returns() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getReturns()
      setReturns(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Retur / Refund</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stok produk dikembalikan otomatis saat retur diproses</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm">
            + Buat Retur
          </button>
        )}
      </div>

      {showForm && <ReturnForm onDone={() => { setShowForm(false); load() }} />}

      {loading ? <p className="text-gray-400 text-center mt-8">Memuat...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['#', 'Tanggal', 'ID Transaksi', 'Total Refund', 'Catatan'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {returns.map((r, i) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{returns.length - i}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">{r.transaction_id ? `#${r.transaction_id}` : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatRupiah(r.total_refund)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.note || '—'}</td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Belum ada retur.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
