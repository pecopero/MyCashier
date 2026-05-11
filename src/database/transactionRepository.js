const { getDb } = require('./db')
const productRepository = require('./productRepository')
const { verifyPin, isHashed, hashPin } = require('./pinUtils')

function verifyOwnerPin(db, pin) {
  const owners = db.prepare(`SELECT * FROM users WHERE role = 'owner' AND active = 1`).all()
  for (const owner of owners) {
    if (verifyPin(pin, owner.pin)) {
      if (!isHashed(owner.pin)) {
        db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashPin(pin), owner.id)
      }
      return owner
    }
  }
  return null
}

const transactionRepository = {
  create({ items, subtotal, discount = 0, discountType = 'nominal', total, payment, change,
           note = '', paymentType = 'cash', customerName = '', customerPhone = '',
           paymentMethods = [], shiftId = null, userId = null, userName = '' }) {
    const db = getDb()

    const insertTransaction = db.transaction(() => {
      const txResult = db.prepare(`
        INSERT INTO transactions
          (subtotal, discount, discount_type, total, payment, change, note,
           payment_type, customer_name, customer_phone, shift_id, user_id, user_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(subtotal, discount, discountType, total, payment, change, note,
             paymentType, customerName || '', customerPhone || '',
             shiftId || null, userId || null, userName || '')

      const txId = txResult.lastInsertRowid

      const insertItem = db.prepare(`
        INSERT INTO transaction_items
          (transaction_id, product_id, product_name, price, cost_price, quantity, subtotal,
           item_discount, item_discount_type, unit_name, conversion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const item of items) {
        const conversion = item.conversion ?? 1
        const unitName = item.unitName ?? ''
        insertItem.run(txId, item.productId, item.productName, item.price, item.costPrice ?? 0,
          item.quantity, item.subtotal, item.itemDiscount ?? 0, item.itemDiscountType ?? 'nominal',
          unitName, conversion)
        productRepository.decrementStock(item.productId, item.quantity * conversion)
      }

      // Simpan detail metode pembayaran (multi-payment)
      if (paymentMethods.length > 0) {
        const insertPm = db.prepare(
          'INSERT INTO transaction_payments (transaction_id, method, amount) VALUES (?, ?, ?)'
        )
        for (const pm of paymentMethods) {
          if (pm.amount > 0) insertPm.run(txId, pm.method, pm.amount)
        }
      }

      return txId
    })

    const txId = insertTransaction()
    return this.findById(txId)
  },

  findById(id) {
    const db = getDb()
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
    if (!tx) return null
    tx.items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id)
    tx.paymentMethods = db.prepare('SELECT * FROM transaction_payments WHERE transaction_id = ?').all(id)
    return tx
  },

  findAll({ startDate, endDate, limit = 50 } = {}) {
    let query = `SELECT * FROM transactions WHERE 1=1`
    const params = []
    if (startDate) { query += ` AND date(created_at, 'localtime') >= ?`; params.push(startDate) }
    if (endDate)   { query += ` AND date(created_at, 'localtime') <= ?`; params.push(endDate) }
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)
    return getDb().prepare(query).all(...params)
  },

  voidTransaction(txId, pin) {
    const db = getDb()
    const owner = verifyOwnerPin(db, pin)
    if (!owner) throw new Error('PIN salah atau bukan owner')

    const tx = this.findById(txId)
    if (!tx) throw new Error('Transaksi tidak ditemukan')
    if (tx.is_void) throw new Error('Transaksi sudah di-void')

    db.transaction(() => {
      db.prepare('UPDATE transactions SET is_void = 1 WHERE id = ?').run(txId)
      for (const item of tx.items) {
        productRepository.incrementStock(item.product_id, item.quantity * (item.conversion ?? 1))
      }
      db.prepare(`UPDATE receivables SET status = 'cancelled' WHERE transaction_id = ? AND status = 'unpaid'`).run(txId)
    })()

    return { success: true, voidedBy: owner.name }
  },
}

module.exports = transactionRepository
