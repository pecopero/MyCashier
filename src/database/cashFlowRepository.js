const { getDb } = require('./db')

const cashFlowRepository = {
  getReport({ startDate, endDate }) {
    const db = getDb()
    const p = [startDate, endDate]

    const salesCash = db.prepare(`
      SELECT COALESCE(SUM(payment), 0) AS amount
      FROM transactions
      WHERE date(created_at, 'localtime') BETWEEN ? AND ?
        AND payment_type != 'credit'
        AND (is_void = 0 OR is_void IS NULL)
    `).get(...p).amount

    const receivableIn = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS amount
      FROM receivable_payments
      WHERE date(created_at, 'localtime') BETWEEN ? AND ?
    `).get(...p).amount

    const cashPurchases = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS amount
      FROM purchases
      WHERE date(created_at, 'localtime') BETWEEN ? AND ?
        AND payment_type = 'cash'
    `).get(...p).amount

    const purchasePayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS amount
      FROM purchase_payments
      WHERE date(created_at, 'localtime') BETWEEN ? AND ?
    `).get(...p).amount

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS amount
      FROM expenses WHERE date BETWEEN ? AND ?
    `).get(...p).amount

    const totalIn  = salesCash + receivableIn
    const totalOut = cashPurchases + purchasePayments + expenses
    const net      = totalIn - totalOut

    const daily = db.prepare(`
      SELECT date(created_at, 'localtime') AS date,
        COALESCE(SUM(CASE WHEN payment_type != 'credit' THEN payment ELSE 0 END), 0) AS sales_in
      FROM transactions
      WHERE date(created_at, 'localtime') BETWEEN ? AND ?
        AND (is_void = 0 OR is_void IS NULL)
      GROUP BY date(created_at, 'localtime')
      ORDER BY date ASC
    `).all(...p)

    return {
      summary: { totalIn, totalOut, net },
      inflows: [
        { label: 'Penjualan Tunai / Transfer / QRIS', amount: salesCash },
        { label: 'Pembayaran Piutang Diterima',        amount: receivableIn },
      ],
      outflows: [
        { label: 'Pembelian Tunai',                  amount: cashPurchases },
        { label: 'Bayar Hutang Pembelian',            amount: purchasePayments },
        { label: 'Pengeluaran / Biaya Operasional',   amount: expenses },
      ],
      daily,
    }
  },
}

module.exports = cashFlowRepository
