import { useState, useRef, useCallback } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { formatRupiah } from '../utils/format'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Tunai' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'qris',     label: 'QRIS' },
]

function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.productName}</p>
        <p className="text-xs text-gray-500">{formatRupiah(item.price)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onQtyChange(item.productId, item.quantity - 1)}
          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold shrink-0">−</button>
        <input type="number" min="1" value={item.quantity}
          onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onQtyChange(item.productId, v) }}
          onFocus={e => e.target.select()}
          className="w-12 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 py-0.5" />
        <button onClick={() => onQtyChange(item.productId, item.quantity + 1)}
          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold shrink-0">+</button>
      </div>
      <span className="text-sm font-medium w-24 text-right">{formatRupiah(item.subtotal)}</span>
      <button onClick={() => onRemove(item.productId)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
    </div>
  )
}

export default function Kasir() {
  const { products, loading, reload: reloadProducts } = useProducts()
  const { categories } = useCategories()
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('nominal')
  const [success, setSuccess] = useState(null)
  const [previewTx, setPreviewTx] = useState(null)

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [splitMode, setSplitMode] = useState(false)
  const [payment, setPayment] = useState('')       // tunai (single or split-cash)
  const [nonCashAmount, setNonCashAmount] = useState('') // split non-cash

  // Piutang state
  const [isCredit, setIsCredit] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [creditDueDate, setCreditDueDate] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Barcode scanner state
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const searchRef = useRef(null)

  const addToCart = useCallback((product) => {
    if (product.stock === 0) return
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
          : i)
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1, subtotal: product.price }]
    })
  }, [])

  // Barcode scanner: USB scanner types chars rapidly then sends Enter
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      const val = search.trim()
      if (!val) return
      // Try exact barcode match first
      const byBarcode = await window.electronAPI.getProductByBarcode(val)
      if (byBarcode) {
        addToCart(byBarcode)
        setSearch('')
        return
      }
      // Fallback: if only 1 result in filtered list, add it
      const filtered = products.filter(p => p.name.toLowerCase().includes(val.toLowerCase()))
      if (filtered.length === 1) {
        addToCart(filtered[0])
        setSearch('')
      }
    }
  }

  const changeQty = (productId, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.productId !== productId))
    else setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty, subtotal: qty * i.price } : i))
  }

  const removeItem = (productId) => setCart(prev => prev.filter(i => i.productId !== productId))

  const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0)
  const discountNum = parseFloat(discount) || 0
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * discountNum / 100) : discountNum
  const total = Math.max(0, subtotal - discountAmount)

  const paymentNum = parseFloat(payment) || 0
  const nonCashNum = parseFloat(nonCashAmount) || 0
  const totalPaid  = splitMode ? paymentNum + nonCashNum : paymentNum
  const change     = totalPaid - total

  const paymentMethods = splitMode
    ? [{ method: 'cash', amount: paymentNum }, { method: paymentMethod === 'cash' ? 'transfer' : paymentMethod, amount: nonCashNum }]
    : [{ method: paymentMethod, amount: paymentNum }]

  const resetPayment = () => {
    setPayment(''); setNonCashAmount(''); setSplitMode(false)
    setPaymentMethod('cash'); setIsCredit(false)
    setCustomerName(''); setCustomerPhone(''); setCreditDueDate('')
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!isCredit && totalPaid < total) return
    if (isCredit && !customerName.trim()) return alert('Masukkan nama pelanggan untuk piutang.')

    const tx = await window.electronAPI.createTransaction({
      items: cart.map(i => ({ ...i, costPrice: products.find(p => p.id === i.productId)?.cost_price ?? 0 })),
      subtotal, discount: discountAmount, discountType, total,
      payment: isCredit ? paymentNum : totalPaid,
      change: isCredit ? paymentNum - total : change,
      paymentType: isCredit ? 'credit' : paymentMethod,
      customerName: isCredit ? customerName.trim() : '',
      customerPhone: isCredit ? customerPhone.trim() : '',
      paymentMethods: isCredit ? [] : paymentMethods,
    })

    if (isCredit) {
      const sisaHutang = total - paymentNum
      if (sisaHutang > 0) {
        await window.electronAPI.createReceivable({
          transactionId: tx.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          totalAmount: sisaHutang,
          paidAmount: 0,
          dueDate: creditDueDate || null,
          note: '',
        })
      }
    }

    await reloadProducts()
    setSuccess({ tx, change: isCredit ? paymentNum - total : change, isCredit, sisaHutang: isCredit ? total - paymentNum : 0 })
    setCart([])
    resetPayment()
    setDiscount('')
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
    const matchCategory = activeCategory === 'Semua' || p.category === activeCategory
    return matchSearch && matchCategory
  })

  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        {previewTx && <ReceiptPreviewModal tx={previewTx} onClose={() => setPreviewTx(null)} />}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{success.isCredit ? '📝' : '✓'}</div>
          <h2 className="text-xl font-bold text-green-600 mb-2">Transaksi Berhasil!</h2>
          <p className="text-gray-600 mb-1">Total: <strong>{formatRupiah(success.tx.total)}</strong></p>
          {success.isCredit && success.sisaHutang > 0
            ? <p className="text-orange-600 mb-1 font-medium">Piutang: <strong>{formatRupiah(success.sisaHutang)}</strong></p>
            : <p className="text-gray-600 mb-1">Kembalian: <strong>{formatRupiah(Math.max(0, success.change))}</strong></p>
          }
          <div className="mb-6" />
          <div className="flex gap-3 mb-2">
            <button onClick={() => setPreviewTx(success.tx)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm">
              👁 Preview Struk
            </button>
            <button onClick={() => window.electronAPI.printReceipt(success.tx)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm">
              🖨 Print Struk
            </button>
          </div>
          <button onClick={() => setSuccess(null)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
            Transaksi Baru
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-0">
      {/* Product Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <input ref={searchRef} type="text" placeholder="Cari produk / scan barcode → Enter"
          value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
          className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <div className="flex gap-2 mb-4 flex-wrap">
          {['Semua', ...categories.map(c => c.name)].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? <p className="text-gray-400 text-center mt-12">Memuat produk...</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(product => {
              const isLow = product.stock <= (product.min_stock ?? 5)
              const isEmpty = product.stock === 0
              return (
                <button key={product.id} onClick={() => !isEmpty && addToCart(product)} disabled={isEmpty}
                  className={`relative bg-white rounded-lg p-3 text-left shadow-sm border transition-all ${
                    isEmpty ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : isLow  ? 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                    :          'border-gray-200 hover:border-blue-400 hover:shadow-md'}`}>
                  {isLow && !isEmpty && <span className="absolute top-1.5 right-1.5 text-orange-500 text-xs">⚠</span>}
                  {isEmpty && <span className="absolute top-1.5 right-1.5 bg-red-100 text-red-600 text-xs px-1 rounded">Habis</span>}
                  <p className="font-medium text-sm truncate pr-6">{product.name}</p>
                  <p className="text-blue-600 font-bold text-sm mt-1">{formatRupiah(product.price)}</p>
                  <p className={`text-xs mt-1 ${isLow ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Stok: {product.stock}</p>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="col-span-4 text-gray-400 text-center mt-8">Produk tidak ditemukan</p>}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Keranjang</h2>
        </div>

        <div className="flex-1 overflow-auto px-4 py-2">
          {cart.length === 0
            ? <p className="text-gray-400 text-sm text-center mt-8">Keranjang kosong</p>
            : cart.map(item => <CartItem key={item.productId} item={item} onQtyChange={changeQty} onRemove={removeItem} />)}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2.5">
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatRupiah(subtotal)}</span>
            </div>
          )}

          {/* Diskon */}
          <div className="flex gap-1.5">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
              <button onClick={() => setDiscountType('nominal')}
                className={`px-2 py-1.5 font-medium transition-colors ${discountType === 'nominal' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Rp</button>
              <button onClick={() => setDiscountType('percent')}
                className={`px-2 py-1.5 font-medium transition-colors ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>%</button>
            </div>
            <input type="number" placeholder="Diskon (opsional)" value={discount} min="0"
              max={discountType === 'percent' ? 100 : undefined} onChange={e => setDiscount(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Diskon</span><span>− {formatRupiah(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg pt-0.5">
            <span>Total</span><span className="text-blue-600">{formatRupiah(total)}</span>
          </div>

          {/* Tunai vs Piutang */}
          <div className="flex gap-1">
            <button onClick={() => setIsCredit(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!isCredit ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}>
              Tunai
            </button>
            <button onClick={() => setIsCredit(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isCredit ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-300'}`}>
              Piutang
            </button>
          </div>

          {/* Info piutang */}
          {isCredit && (
            <div className="space-y-1.5 bg-orange-50 rounded-lg p-3">
              {/* Customer autocomplete */}
              <div className="relative">
                <input type="text" placeholder="Nama pelanggan *" value={customerName}
                  onChange={async e => {
                    setCustomerName(e.target.value)
                    if (e.target.value.length >= 1) {
                      const results = await window.electronAPI.getCustomers(e.target.value)
                      setCustomerSuggestions(results)
                      setShowSuggestions(results.length > 0)
                    } else {
                      setShowSuggestions(false)
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full px-3 py-1.5 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-auto">
                    {customerSuggestions.map(c => (
                      <button key={c.id} type="button"
                        onMouseDown={() => {
                          setCustomerName(c.name)
                          setCustomerPhone(c.phone || '')
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {c.phone && <span className="text-gray-400 text-xs ml-2">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="text" placeholder="No. HP (opsional)" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <input type="date" value={creditDueDate} onChange={e => setCreditDueDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}

          {/* Metode bayar (hanya untuk non-piutang) */}
          {!isCredit && (
            <>
              <div className="flex gap-1 flex-wrap">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.key} onClick={() => { setPaymentMethod(m.key); setSplitMode(false) }}
                    className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${!splitMode && paymentMethod === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'}`}>
                    {m.label}
                  </button>
                ))}
                <button onClick={() => setSplitMode(s => !s)}
                  className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${splitMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400'}`}>
                  Split
                </button>
              </div>

              {splitMode ? (
                <div className="space-y-1.5">
                  <input type="number" placeholder="Tunai" value={payment} onChange={e => setPayment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="flex gap-1">
                    {['transfer','qris'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                        {m === 'transfer' ? 'Transfer' : 'QRIS'}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder={paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
                    value={nonCashAmount} onChange={e => setNonCashAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total dibayar</span><span>{formatRupiah(totalPaid)}</span>
                  </div>
                </div>
              ) : (
                <input type="number" placeholder="Uang bayar" value={payment} onChange={e => setPayment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </>
          )}

          {/* Input uang muka untuk piutang */}
          {isCredit && (
            <input type="number" placeholder="Uang muka (bisa 0)" value={payment} onChange={e => setPayment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}

          {!isCredit && totalPaid >= total && total > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Kembalian</span><span className="font-medium">{formatRupiah(Math.max(0, change))}</span>
            </div>
          )}
          {isCredit && total > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Sisa Piutang</span>
              <span className="font-medium">{formatRupiah(Math.max(0, total - paymentNum))}</span>
            </div>
          )}

          <button onClick={handleCheckout}
            disabled={cart.length === 0 || (!isCredit && totalPaid < total)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isCredit ? 'Catat Transaksi' : 'Bayar'}
          </button>
        </div>
      </div>
    </div>
  )
}
