import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useSuppliers } from '../hooks/useSuppliers'
import { usePurchases } from '../hooks/usePurchases'
import SupplierSelect from '../components/SupplierSelect'
import { formatRupiah, formatDate } from '../utils/format'

const EMPTY_ITEM = { productId: '', productName: '', quantity: 1, costPrice: '', subtotal: 0 }

function statusBadge(status, dueDate) {
  const today = new Date().toLocaleDateString('en-CA')
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA')
  const in2d = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA')

  if (status === 'paid')    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Lunas</span>
  if (status === 'partial') {
    if (dueDate && dueDate < today) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Cicil · Lewat</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Cicil</span>
  }
  if (dueDate) {
    if (dueDate < today)   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Lewat Jatuh Tempo</span>
    if (dueDate <= tomorrow) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Jatuh Tempo Besok!</span>
    if (dueDate <= in2d)   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Jatuh Tempo 2 Hari</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Belum Bayar</span>
}

function PurchaseForm({ products, suppliers, onAdd, onUpdate, onDelete, onSubmit, onCancel }) {
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [paymentType, setPaymentType] = useState('cash')
  const [dueDate, setDueDate] = useState('')

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    setItems(prev => prev.map((item, i) => i !== index ? item : {
      ...item,
      productId: product?.id ?? '',
      productName: product?.name ?? '',
      costPrice: product?.cost_price > 0 ? String(product.cost_price) : '',
      subtotal: (product?.cost_price ?? 0) * item.quantity,
    }))
  }

  const handleFieldChange = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      updated.subtotal = (parseFloat(updated.costPrice) || 0) * (parseInt(updated.quantity, 10) || 0)
      return updated
    }))
  }

  const handleSupplierChange = (id) => {
    setSupplierId(id)
    const s = suppliers.find(s => s.id === parseInt(id))
    setSupplierName(s?.name ?? '')
  }

  const addRow = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeRow = (index) => setItems(prev => prev.filter((_, i) => i !== index))
  const grandTotal = items.reduce((sum, i) => sum + (i.subtotal || 0), 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    const validItems = items.filter(i => i.productId && i.quantity > 0 && i.costPrice > 0)
    if (validItems.length === 0) return alert('Tambahkan minimal 1 item yang lengkap.')
    if (paymentType === 'credit' && !dueDate) return alert('Masukkan tanggal jatuh tempo untuk pembelian kredit.')
    onSubmit({
      supplierId: supplierId ? parseInt(supplierId) : null,
      supplierName,
      items: validItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: parseInt(i.quantity, 10),
        costPrice: parseFloat(i.costPrice),
        subtotal: i.subtotal,
      })),
      note,
      paymentType,
      dueDate: paymentType === 'credit' ? dueDate : null,
    })
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold mb-4">Tambah Pembelian Baru</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <SupplierSelect value={supplierId} onChange={handleSupplierChange}
            suppliers={suppliers} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Opsional..." className={inp} />
        </div>
      </div>

      {/* Tabel item */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Produk</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-24">Jumlah</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-36">Harga Pokok</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-32">Subtotal</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <select value={item.productId} onChange={e => handleProductChange(index, e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Pilih Produk --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => handleFieldChange(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" value={item.costPrice} placeholder="0"
                    onChange={e => handleFieldChange(index, 'costPrice', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-2 font-medium">{formatRupiah(item.subtotal)}</td>
                <td className="px-3 py-2">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pembayaran */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Metode Pembayaran</p>
        <div className="flex gap-3 mb-3">
          <button type="button" onClick={() => setPaymentType('cash')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            Bayar Tunai
          </button>
          <button type="button" onClick={() => setPaymentType('credit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'credit' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
            Kredit / Jatuh Tempo
          </button>
        </div>
        {paymentType === 'credit' && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">Tanggal Jatuh Tempo:</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              min={new Date().toLocaleDateString('en-CA')}
              className="px-3 py-1.5 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <span className="text-xs text-orange-600">Notifikasi akan muncul H-2 dan H-1 jatuh tempo</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button type="button" onClick={addRow} className="text-blue-600 text-sm font-medium hover:underline">
          + Tambah Baris
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">
            Total: <span className="text-blue-600">{formatRupiah(grandTotal)}</span>
          </span>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Batal
          </button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Simpan Pembelian
          </button>
        </div>
      </div>
    </form>
  )
}

export default function Purchases() {
  const { products, reload: reloadProducts } = useProducts()
  const { suppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()
  const { purchases, loading, createPurchase, reload: reloadPurchases } = usePurchases()
  const [showForm, setShowForm] = useState(false)

  useState(() => { reloadPurchases() }, [])

  const handleSubmit = async (data) => {
    await createPurchase(data)
    await reloadProducts()
    setShowForm(false)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Pembelian</h1>
        <div className="flex gap-3">
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              + Tambah Pembelian
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <PurchaseForm
          products={products}
          suppliers={suppliers}
          onAdd={createSupplier}
          onUpdate={updateSupplier}
          onDelete={deleteSupplier}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p className="text-gray-400 text-center mt-8">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Tanggal', 'Supplier', 'Total', 'Dibayar', 'Jatuh Tempo', 'Status', 'Catatan'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">{p.supplier_name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 font-medium">{formatRupiah(p.total)}</td>
                  <td className="px-4 py-3 text-green-600">
                    {p.payment_type === 'cash'
                      ? <span className="text-gray-400">Tunai</span>
                      : `${formatRupiah(p.paid_amount)} / ${formatRupiah(p.total)}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.due_date || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(p.status, p.due_date)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.note || '—'}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada riwayat pembelian.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
