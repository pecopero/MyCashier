import { useState, useRef, useCallback, useEffect } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { formatRupiah } from '../utils/format'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'
import { useAuth } from '../context/AuthContext'

function buildWAText(success) {
  const { tx, change, isCredit, sisaHutang, cartSnapshot } = success
  const now = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const lines = ['*Struk Belanja*', `#${tx.id} · ${now}`, '']
  if (cartSnapshot?.length) {
    cartSnapshot.forEach(i => {
      lines.push(`${i.productName}${i.unitName ? ` (${i.unitName})` : ''}: ${i.quantity} x ${formatRupiah(i.price)} = ${formatRupiah(i.subtotal)}`)
    })
    lines.push('')
  }
  if (tx.discount > 0) {
    lines.push(`Diskon: -${formatRupiah(tx.discount)}`)
  }
  lines.push(`*Total: ${formatRupiah(tx.total)}*`)
  if (!isCredit) {
    lines.push(`Bayar: ${formatRupiah(tx.payment)}`)
    lines.push(`Kembalian: ${formatRupiah(Math.max(0, change))}`)
  } else {
    lines.push(`Piutang: ${formatRupiah(sisaHutang)}`)
  }
  lines.push('', 'Terima kasih! 🙏')
  return lines.join('\n')
}

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Tunai' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'qris',     label: 'QRIS' },
]

function quickAmounts(total) {
  const s = new Set([total])
  for (const d of [1000, 5000, 10000, 20000, 50000, 100000]) {
    const r = Math.ceil(total / d) * d
    if (r >= total && r <= total + 100000) s.add(r)
  }
  return [...s].sort((a, b) => a - b).slice(0, 6)
}
function fmtK(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000) % 1 === 0 ? n / 1_000_000 : (n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `${n / 1_000}rb`
  return String(n)
}

function CartItem({ item, onQtyChange, onRemove, onDiscountChange }) {
  const [showDisc, setShowDisc] = useState(false)
  const discountAmt = item.itemDiscountType === 'percent'
    ? Math.round(item.price * item.quantity * (item.itemDiscount / 100))
    : (item.itemDiscount || 0)

  return (
    <div className="py-2 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {item.productName}
            {item.unitName && <span className="text-xs text-gray-400 font-normal ml-1">({item.unitName})</span>}
            {item.wholesaleMinQty > 0 && item.price === item.wholesalePrice && (
              <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">GROSIR</span>
            )}
          </p>
          <button onClick={() => setShowDisc(s => !s)}
            className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
            {item.itemDiscount > 0
              ? <span>{item.promoName ? <span className="text-green-600 font-semibold">{item.promoName} · </span> : ''}Diskon: −{formatRupiah(discountAmt)}</span>
              : '+ diskon item'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onQtyChange(item.cartKey, item.quantity - 1)}
            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold shrink-0">−</button>
          <input type="number" min="1" value={item.quantity}
            onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onQtyChange(item.cartKey, v) }}
            onFocus={e => e.target.select()}
            className="w-12 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 py-0.5" />
          <button onClick={() => onQtyChange(item.cartKey, item.quantity + 1)}
            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold shrink-0">+</button>
        </div>
        <span className="text-sm font-medium w-20 text-right shrink-0">{formatRupiah(item.subtotal)}</span>
        <button onClick={() => onRemove(item.cartKey)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      </div>
      {showDisc && (
        <div className="flex gap-1 mt-1.5 pl-0">
          <div className="flex rounded border border-gray-300 overflow-hidden text-xs">
            <button onClick={() => onDiscountChange(item.cartKey, item.itemDiscount, 'nominal')}
              className={`px-2 py-1 font-medium ${item.itemDiscountType === 'nominal' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>Rp</button>
            <button onClick={() => onDiscountChange(item.cartKey, item.itemDiscount, 'percent')}
              className={`px-2 py-1 font-medium ${item.itemDiscountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>%</button>
          </div>
          <input type="number" min="0" placeholder="0" value={item.itemDiscount || ''}
            onChange={e => onDiscountChange(item.cartKey, parseFloat(e.target.value) || 0, item.itemDiscountType)}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {item.itemDiscount > 0 && (
            <button onClick={() => { onDiscountChange(item.cartKey, 0, 'nominal'); setShowDisc(false) }}
              className="text-xs text-gray-400 hover:text-red-500 px-1">hapus</button>
          )}
        </div>
      )}
    </div>
  )
}

function ShiftBanner({ shift, onOpen, onClose }) {
  const [showClose, setShowClose] = useState(false)
  const [closingCash, setClosingCash] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  if (!shift) return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
      <p className="text-sm text-blue-700">Belum ada shift aktif.</p>
      <button onClick={onOpen} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700">
        Buka Shift
      </button>
    </div>
  )

  return (
    <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-between">
      <p className="text-sm text-green-700 font-medium">
        Shift #{shift.id} aktif · {shift.user_name}
      </p>
      {showClose ? (
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Kas akhir (Rp)" value={closingCash}
            onChange={e => setClosingCash(e.target.value)}
            className="w-36 px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input placeholder="Catatan" value={note} onChange={e => setNote(e.target.value)}
            className="w-32 px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <button onClick={async () => {
            setLoading(true)
            try {
              await onClose(shift.id, { closingCash: parseFloat(closingCash) || 0, note })
              setShowClose(false)
            } finally {
              setLoading(false)
            }
          }} disabled={loading} className="px-3 py-1 bg-green-600 text-white text-xs rounded font-medium hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Menutup...' : 'Konfirmasi'}
          </button>
          <button onClick={() => setShowClose(false)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
        </div>
      ) : (
        <button onClick={() => setShowClose(true)} className="px-3 py-1 border border-green-400 text-green-700 text-xs rounded-lg font-medium hover:bg-green-100">
          Tutup Shift
        </button>
      )}
    </div>
  )
}

function OpenShiftModal({ user, onOpen, onCancel }) {
  const [openingCash, setOpeningCash] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80">
        <h3 className="font-bold text-gray-800 mb-4">Buka Shift Baru</h3>
        <p className="text-sm text-gray-500 mb-4">Kasir: <strong>{user?.name}</strong></p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kas Awal (Rp)</label>
        <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)}
          placeholder="0" autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Nanti</button>
          <button onClick={async () => {
            setLoading(true)
            try {
              await onOpen(parseFloat(openingCash) || 0)
            } finally {
              setLoading(false)
            }
          }} disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Membuka...' : 'Buka Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UnitPickerModal({ product, units, baseUnit, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-72" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
        <p className="text-xs text-gray-400 mb-3">Pilih satuan</p>
        <div className="space-y-2">
          {/* Satuan dasar */}
          <button onClick={() => onSelect({ unitName: baseUnit, conversion: 1, price: product.price })}
            className="w-full flex justify-between items-center px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm">
            <span className="font-medium text-gray-800">{baseUnit || 'pcs'}</span>
            <span className="text-blue-600 font-bold">{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(product.price)}</span>
          </button>
          {/* Satuan tambahan */}
          {units.map(u => (
            <button key={u.id} onClick={() => onSelect({ unitName: u.unit_name, conversion: u.conversion, price: u.price })}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border transition-colors text-sm ${u.is_default ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
              <div className="text-left">
                <span className="font-medium text-gray-800">{u.unit_name}</span>
                <span className="text-xs text-gray-400 ml-2">= {u.conversion} {baseUnit || 'pcs'}</span>
              </div>
              <span className="text-blue-600 font-bold">{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(u.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Kasir() {
  const { currentUser } = useAuth()
  const { products, loading, reload: reloadProducts } = useProducts()
  const { categories } = useCategories()
  const [activeShift, setActiveShift] = useState(null)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [productUnits, setProductUnits] = useState({})
  const [unitPicker, setUnitPicker] = useState(null)
  const [activePromos, setActivePromos] = useState([])

  useEffect(() => {
    if (currentUser) {
      window.electronAPI.getActiveShift(currentUser.id).then(shift => {
        setActiveShift(shift || null)
        if (!shift) setShowOpenShift(true)
      })
    }
  }, [currentUser?.id])

  useEffect(() => {
    window.electronAPI.getAllProductUnits().then(setProductUnits)
  }, [])

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA')
    window.electronAPI.getActivePromos(today).then(promos => setActivePromos(promos || []))
  }, [])

  // F2 → fokus ke kolom cari, dari mana saja di halaman ini
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('kasir_view') || 'grid4')
  const changeView = (v) => { setViewMode(v); localStorage.setItem('kasir_view', v) }

  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('nominal')
  const [success, setSuccess] = useState(null)
  const [previewTx, setPreviewTx] = useState(null)

  // Enter/Escape pada layar sukses → langsung transaksi baru
  useEffect(() => {
    if (!success) return
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setSuccess(null)
        setTimeout(() => searchRef.current?.focus(), 80)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [success])

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

  const calcSubtotal = (price, qty, discount, discType) => {
    const discAmt = discType === 'percent' ? Math.round(price * qty * (discount / 100)) : (discount || 0)
    return Math.max(0, price * qty - discAmt)
  }

  const getEffectivePrice = (retailPrice, wholesalePrice, wholesaleMinQty, qty) => {
    if (wholesaleMinQty > 0 && wholesalePrice > 0 && qty >= wholesaleMinQty) return wholesalePrice
    return retailPrice
  }

  const findProductPromo = useCallback((productId) => {
    return activePromos.find(p => p.product_id === productId) || null
  }, [activePromos])

  const addToCart = useCallback((product) => {
    if (product.stock === 0) return
    setCart(prev => {
      const key = String(product.id)
      const existing = prev.find(i => i.cartKey === key)
      if (existing) {
        const qty = existing.quantity + 1
        const price = getEffectivePrice(existing.retailPrice, existing.wholesalePrice, existing.wholesaleMinQty, qty)
        return prev.map(i => i.cartKey === key
          ? { ...i, quantity: qty, price, subtotal: calcSubtotal(price, qty, i.itemDiscount, i.itemDiscountType) }
          : i)
      }
      const promo = findProductPromo(product.id)
      const itemDiscount = promo ? promo.value : 0
      const itemDiscountType = promo ? promo.type : 'nominal'
      return [...prev, {
        cartKey: key, productId: product.id, productName: product.name,
        price: product.price, retailPrice: product.price,
        wholesalePrice: product.wholesale_price || 0,
        wholesaleMinQty: product.wholesale_min_qty || 0,
        unitName: product.unit || 'pcs', conversion: 1,
        quantity: 1, subtotal: calcSubtotal(product.price, 1, itemDiscount, itemDiscountType),
        itemDiscount, itemDiscountType,
        promoName: promo ? promo.name : null,
      }]
    })
  }, [findProductPromo])

  const handleProductClick = useCallback((product) => {
    const units = productUnits[product.id] || []
    if (units.length > 0) setUnitPicker(product)
    else addToCart(product)
  }, [productUnits, addToCart])

  const addToCartWithUnit = (product, { unitName, conversion, price }) => {
    setCart(prev => {
      const key = `${product.id}-${unitName}`
      const existing = prev.find(i => i.cartKey === key)
      if (existing) {
        const qty = existing.quantity + 1
        return prev.map(i => i.cartKey === key
          ? { ...i, quantity: qty, subtotal: calcSubtotal(price, qty, i.itemDiscount, i.itemDiscountType) }
          : i)
      }
      const promo = findProductPromo(product.id)
      const itemDiscount = promo ? promo.value : 0
      const itemDiscountType = promo ? promo.type : 'nominal'
      return [...prev, {
        cartKey: key, productId: product.id, productName: product.name,
        price, unitName, conversion,
        quantity: 1, subtotal: calcSubtotal(price, 1, itemDiscount, itemDiscountType),
        itemDiscount, itemDiscountType,
        promoName: promo ? promo.name : null,
      }]
    })
    setUnitPicker(null)
  }

  // Barcode scanner: USB scanner types chars rapidly then sends Enter
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      const val = search.trim()
      if (!val) return
      // Try exact barcode match first
      const byBarcode = await window.electronAPI.getProductByBarcode(val)
      if (byBarcode) {
        handleProductClick(byBarcode)
        setSearch('')
        return
      }
      // Fallback: if only 1 result in filtered list, add it
      const filtered = products.filter(p => p.name.toLowerCase().includes(val.toLowerCase()))
      if (filtered.length === 1) {
        handleProductClick(filtered[0])
        setSearch('')
      }
    }
  }

  const changeQty = (cartKey, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.cartKey !== cartKey)); return }
    setCart(prev => prev.map(i => {
      if (i.cartKey !== cartKey) return i
      const price = getEffectivePrice(i.retailPrice ?? i.price, i.wholesalePrice, i.wholesaleMinQty, qty)
      return { ...i, quantity: qty, price, subtotal: calcSubtotal(price, qty, i.itemDiscount, i.itemDiscountType) }
    }))
  }

  const changeItemDiscount = (cartKey, discount, discType) => {
    setCart(prev => prev.map(i => i.cartKey === cartKey
      ? { ...i, itemDiscount: discount, itemDiscountType: discType,
          subtotal: calcSubtotal(i.price, i.quantity, discount, discType) }
      : i))
  }

  const removeItem = (cartKey) => setCart(prev => prev.filter(i => i.cartKey !== cartKey))

  const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0)
  const discountNum = parseFloat(discount) || 0
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * discountNum / 100) : discountNum
  const total = Math.max(0, subtotal - discountAmount)

  // Cart-level promos (no product_id) that meet min_purchase
  const cartPromos = activePromos.filter(p => !p.product_id && subtotal >= (p.min_purchase || 0))

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

  const [checkoutError, setCheckoutError] = useState('')

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!isCredit && totalPaid < total) return
    if (isCredit && !customerName.trim()) return setCheckoutError('Masukkan nama pelanggan untuk piutang.')
    setCheckoutError('')

    let tx
    try {
      tx = await window.electronAPI.createTransaction({
        items: cart.map(i => ({
          ...i,
          costPrice: products.find(p => p.id === i.productId)?.cost_price ?? 0,
          itemDiscount: i.itemDiscount ?? 0,
          itemDiscountType: i.itemDiscountType ?? 'nominal',
          unitName: i.unitName ?? '',
          conversion: i.conversion ?? 1,
        })),
        subtotal, discount: discountAmount, discountType, total,
        payment: isCredit ? paymentNum : totalPaid,
        change: isCredit ? paymentNum - total : change,
        paymentType: isCredit ? 'credit' : paymentMethod,
        customerName: isCredit ? customerName.trim() : '',
        customerPhone: isCredit ? customerPhone.trim() : '',
        paymentMethods: isCredit ? [] : paymentMethods,
        shiftId: activeShift?.id || null,
        userId: currentUser?.id || null,
        userName: currentUser?.name || '',
      })
    } catch (e) {
      setCheckoutError(e.message || 'Transaksi gagal')
      await reloadProducts()
      return
    }

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
    setSuccess({ tx, change: isCredit ? paymentNum - total : change, isCredit, sisaHutang: isCredit ? total - paymentNum : 0, cartSnapshot: cart })
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
    const changeAmt = Math.max(0, success.change)
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        {previewTx && <ReceiptPreviewModal tx={previewTx} onClose={() => setPreviewTx(null)} />}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full mx-4">
          {/* Ikon sukses */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success.isCredit ? 'bg-orange-100' : 'bg-green-100'}`}>
            {success.isCredit ? (
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-1">Transaksi Berhasil</h2>
          <p className="text-xs text-gray-400 mb-5">#{success.tx.id} · {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>

          {/* Angka utama: kembalian atau piutang */}
          {success.isCredit && success.sisaHutang > 0 ? (
            <div className="bg-orange-50 rounded-xl p-4 mb-5">
              <p className="text-xs text-orange-500 font-medium mb-1">Piutang Pelanggan</p>
              <p className="text-3xl font-bold text-orange-600">{formatRupiah(success.sisaHutang)}</p>
            </div>
          ) : (
            <div className="bg-green-50 rounded-xl p-4 mb-5">
              <p className="text-xs text-green-600 font-medium mb-1">Kembalian</p>
              <p className="text-3xl font-bold text-green-700">{formatRupiah(changeAmt)}</p>
            </div>
          )}

          {/* Detail */}
          <div className="flex justify-between text-sm text-gray-500 mb-5">
            <span>Total</span>
            <span className="font-semibold text-gray-800">{formatRupiah(success.tx.total)}</span>
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={() => setPreviewTx(success.tx)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
              Preview
            </button>
            <button onClick={() => window.electronAPI.printReceipt(success.tx)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
              Print
            </button>
          </div>
          <button
            onClick={() => {
              const text = buildWAText(success)
              window.electronAPI.openExternal('https://wa.me/?text=' + encodeURIComponent(text))
            }}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 font-medium text-sm transition-colors mb-3 flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Kirim WhatsApp
          </button>
          <button onClick={() => { setSuccess(null); setTimeout(() => searchRef.current?.focus(), 80) }}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition-colors">
            Transaksi Baru
            <span className="ml-2 text-blue-300 text-xs font-normal">Enter</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ShiftBanner shift={activeShift}
        onOpen={() => setShowOpenShift(true)}
        onClose={async (id, data) => {
          const closed = await window.electronAPI.closeShift(id, data)
          setActiveShift(null)
        }} />

      {showOpenShift && (
        <OpenShiftModal user={currentUser}
          onCancel={() => setShowOpenShift(false)}
          onOpen={async (openingCash) => {
            const shift = await window.electronAPI.openShift({
              userId: currentUser.id, userName: currentUser.name, openingCash
            })
            setActiveShift(shift)
            setShowOpenShift(false)
          }} />
      )}

      {unitPicker && (
        <UnitPickerModal
          product={unitPicker}
          units={productUnits[unitPicker.id] || []}
          baseUnit={unitPicker.unit || 'pcs'}
          onSelect={(unit) => addToCartWithUnit(unitPicker, unit)}
          onClose={() => setUnitPicker(null)}
        />
      )}

    <div className="flex flex-1 gap-0 min-h-0">
      {/* Product Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="relative mb-3">
          <input ref={searchRef} type="text" placeholder="Cari produk / scan barcode → Enter"
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12" />
          {search ? (
            <button onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none font-mono select-none">F2</span>
          )}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {['Semua', ...categories.map(c => c.name)].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 shrink-0">
            {[
              { key: 'grid2', title: '2 Kolom',
                icon: <><rect x="1" y="1" width="6" height="14" rx="1.5"/><rect x="9" y="1" width="6" height="14" rx="1.5"/></> },
              { key: 'grid4', title: '4 Kolom',
                icon: <><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></> },
              { key: 'list', title: 'List',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h8M4 8h8M4 12h8" /> },
            ].map(({ key, title, icon }) => (
              <button key={key} title={title} onClick={() => changeView(key)}
                className={`p-1.5 rounded-md transition-colors ${viewMode === key ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <svg viewBox="0 0 16 16" className="w-4 h-4"
                  fill={key === 'list' ? 'none' : 'currentColor'}
                  stroke={key === 'list' ? 'currentColor' : 'none'}
                  strokeWidth={key === 'list' ? 2 : 0}>
                  {icon}
                </svg>
              </button>
            ))}
          </div>
        </div>

        {loading ? <p className="text-gray-400 text-center mt-12">Memuat produk...</p> : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-center py-10 text-sm">Produk tidak ditemukan</p>
            ) : filtered.map(product => {
              const isLow = product.stock <= (product.min_stock ?? 5)
              const isEmpty = product.stock === 0
              return (
                <button key={product.id} onClick={() => !isEmpty && handleProductClick(product)} disabled={isEmpty}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 text-left transition-colors ${
                    isEmpty ? 'opacity-40 cursor-not-allowed bg-gray-50'
                    : isLow  ? 'hover:bg-orange-50'
                    :          'hover:bg-blue-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isEmpty ? 'text-gray-400' : 'text-gray-800'}`}>{product.name}</p>
                    <p className={`text-xs mt-0.5 ${isLow && !isEmpty ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                      Stok: {product.stock} {product.unit}
                      {isLow && !isEmpty && ' · Menipis'}
                      {isEmpty && ' · Habis'}
                    </p>
                  </div>
                  {product.wholesale_price > 0 && product.wholesale_min_qty > 0 && !isEmpty && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded shrink-0">GROSIR</span>
                  )}
                  <p className={`text-sm font-bold shrink-0 ${isEmpty ? 'text-gray-300' : 'text-blue-600'}`}>
                    {formatRupiah(product.price)}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className={`grid gap-3 ${viewMode === 'grid2' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
            {filtered.map(product => {
              const isLow = product.stock <= (product.min_stock ?? 5)
              const isEmpty = product.stock === 0
              return (
                <button key={product.id} onClick={() => !isEmpty && handleProductClick(product)} disabled={isEmpty}
                  className={`relative bg-white rounded-lg p-3 text-left shadow-sm border transition-all ${
                    isEmpty ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : isLow  ? 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                    :          'border-gray-200 hover:border-blue-400 hover:shadow-md'}`}>
                  {isLow && !isEmpty && <span className="absolute top-1.5 right-1.5 text-orange-500 text-xs">⚠</span>}
                  {isEmpty && <span className="absolute top-1.5 right-1.5 bg-red-100 text-red-600 text-xs px-1 rounded">Habis</span>}
                  {!isEmpty && !isLow && product.wholesale_price > 0 && product.wholesale_min_qty > 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-purple-100 text-purple-700 text-[9px] font-bold px-1 rounded leading-tight">G</span>
                  )}
                  <p className={`font-medium text-sm pr-6 ${viewMode === 'grid2' ? '' : 'truncate'}`}>{product.name}</p>
                  <p className="text-blue-600 font-bold text-sm mt-1">{formatRupiah(product.price)}</p>
                  <p className={`text-xs mt-1 ${isLow ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                    Stok: {product.stock}{viewMode === 'grid2' ? ` ${product.unit}` : ''}
                  </p>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="col-span-4 text-gray-400 text-center mt-8">Produk tidak ditemukan</p>}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            Keranjang
            {cart.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{cart.length}</span>
            )}
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 transition-colors">Hapus semua</button>
          )}
        </div>

        <div className="flex-1 overflow-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center select-none">
              <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-gray-400 font-medium">Keranjang kosong</p>
              <p className="text-xs text-gray-300 mt-1">Klik produk atau scan barcode</p>
            </div>
          ) : (
            cart.map(item => <CartItem key={item.cartKey} item={item} onQtyChange={changeQty} onRemove={removeItem} onDiscountChange={changeItemDiscount} />)
          )}
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

          {/* Cart-level promo suggestions */}
          {cartPromos.length > 0 && (
            <div className="space-y-1">
              {cartPromos.map(promo => {
                const promoDisc = promo.type === 'percent' ? promo.value : null
                const promoNom = promo.type === 'nominal' ? promo.value : null
                const label = promoDisc != null ? `${promoDisc}%` : formatRupiah(promoNom)
                const isActive = discount === String(promo.value) && discountType === promo.type
                return (
                  <button key={promo.id}
                    onClick={() => {
                      if (isActive) { setDiscount(''); setDiscountType('nominal') }
                      else { setDiscount(String(promo.value)); setDiscountType(promo.type) }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-green-100 border-green-400 text-green-800'
                        : 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                    }`}>
                    <span>{isActive ? '✓ ' : ''}{promo.name}</span>
                    <span className="font-bold">− {label}</span>
                  </button>
                )
              })}
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
                    onFocus={e => e.target.select()}
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
                    onFocus={e => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total dibayar</span><span>{formatRupiah(totalPaid)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <input type="number" placeholder="Uang bayar" value={payment} onChange={e => setPayment(e.target.value)}
                    onFocus={e => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {paymentMethod === 'cash' && total > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {quickAmounts(total).map(amt => (
                        <button key={amt} onClick={() => setPayment(String(amt))}
                          className={`py-1 px-2 text-xs rounded border font-medium transition-colors ${
                            Number(payment) === amt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                          }`}>
                          {amt === total ? 'Pas' : fmtK(amt)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Input uang muka untuk piutang */}
          {isCredit && (
            <input type="number" placeholder="Uang muka (bisa 0)" value={payment} onChange={e => setPayment(e.target.value)}
              onFocus={e => e.target.select()}
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

          {checkoutError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
              {checkoutError}
            </div>
          )}
          <button onClick={handleCheckout}
            disabled={cart.length === 0 || (!isCredit && totalPaid < total)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
            {cart.length === 0
              ? 'Keranjang masih kosong'
              : !isCredit && totalPaid < total && total > 0
                ? `Kurang ${formatRupiah(total - totalPaid)}`
                : isCredit ? 'Catat Transaksi' : `Bayar ${formatRupiah(total)}`}
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
