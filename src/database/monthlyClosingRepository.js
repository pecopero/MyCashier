const { getDb } = require('./db')
const { verifyPin, isHashed, hashPin } = require('./pinUtils')

function pad(n) { return String(n).padStart(2, '0') }

function monthRange(year, month) {
  const startDate = `${year}-${pad(month)}-01`
  const lastDay   = new Date(year, month, 0).getDate()
  const endDate   = `${year}-${pad(month)}-${lastDay}`
  return { startDate, endDate }
}

const monthlyClosingRepository = {
  // Hitung semua angka keuangan untuk 1 bulan (tanpa menyimpan)
  computeMonth(year, month) {
    const db = getDb()
    const { startDate, endDate } = monthRange(year, month)

    const get = (sql, ...params) => db.prepare(sql).get(...params)

    const revenue = get(`
      SELECT COALESCE(SUM(total), 0) AS v FROM transactions
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
        AND (is_void = 0 OR is_void IS NULL)
    `, startDate, endDate).v

    const cost = get(`
      SELECT COALESCE(SUM(ti.cost_price * ti.quantity * ti.conversion), 0) AS v
      FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
      WHERE date(t.created_at,'localtime') BETWEEN ? AND ?
        AND (t.is_void = 0 OR t.is_void IS NULL)
    `, startDate, endDate).v

    const totalExpenses = get(`
      SELECT COALESCE(SUM(amount), 0) AS v FROM expenses
      WHERE date BETWEEN ? AND ?
    `, startDate, endDate).v

    const cashPurchases = get(`
      SELECT COALESCE(SUM(total), 0) AS v FROM purchases
      WHERE payment_type = 'cash'
        AND date(created_at,'localtime') BETWEEN ? AND ?
    `, startDate, endDate).v

    const purchasePayments = get(`
      SELECT COALESCE(SUM(amount), 0) AS v FROM purchase_payments
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
    `, startDate, endDate).v

    const totalPurchases = get(`
      SELECT COALESCE(SUM(total), 0) AS v FROM purchases
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
    `, startDate, endDate).v

    const receivablesCollected = get(`
      SELECT COALESCE(SUM(amount), 0) AS v FROM receivable_payments
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
    `, startDate, endDate).v

    const cashSales = get(`
      SELECT COALESCE(SUM(total), 0) AS v FROM transactions
      WHERE payment_type != 'credit'
        AND date(created_at,'localtime') BETWEEN ? AND ?
        AND (is_void = 0 OR is_void IS NULL)
    `, startDate, endDate).v

    const txCount = get(`
      SELECT COUNT(*) AS v FROM transactions
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
        AND (is_void = 0 OR is_void IS NULL)
    `, startDate, endDate).v

    const voidCount = get(`
      SELECT COUNT(*) AS v FROM transactions
      WHERE date(created_at,'localtime') BETWEEN ? AND ?
        AND is_void = 1
    `, startDate, endDate).v

    const grossProfit = revenue - cost
    const netProfit   = grossProfit - totalExpenses
    const cashIn      = cashSales + receivablesCollected
    const cashOut     = cashPurchases + purchasePayments + totalExpenses

    return {
      year, month, startDate, endDate,
      revenue, cost, grossProfit,
      totalExpenses, netProfit,
      totalPurchases, cashPurchases, purchasePayments,
      receivablesCollected,
      cashIn, cashOut, netCash: cashIn - cashOut,
      transactionCount: txCount, voidCount,
    }
  },

  // Tutup buku sebulan (simpan snapshot + lock)
  closeMonth(year, month, pin, notes = '') {
    const db = getDb()
    const owners = db.prepare(`SELECT * FROM users WHERE role = 'owner' AND active = 1`).all()
    let owner = null
    for (const o of owners) {
      if (verifyPin(pin, o.pin)) {
        owner = o
        if (!isHashed(o.pin)) db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashPin(pin), o.id)
        break
      }
    }
    if (!owner) throw new Error('PIN salah atau bukan owner')

    const existing = db.prepare('SELECT * FROM monthly_closings WHERE year = ? AND month = ?').get(year, month)
    if (existing?.status === 'closed') throw new Error('Bulan ini sudah pernah ditutup')

    const data = this.computeMonth(year, month)

    db.prepare(`
      INSERT INTO monthly_closings
        (year, month, status, revenue, cost, gross_profit, total_expenses, net_profit,
         total_purchases, cash_purchases, purchase_payments, receivables_collected,
         cash_in, cash_out, transaction_count, notes, closed_at, closed_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)
      ON CONFLICT(year,month) DO UPDATE SET
        status='closed', revenue=excluded.revenue, cost=excluded.cost,
        gross_profit=excluded.gross_profit, total_expenses=excluded.total_expenses,
        net_profit=excluded.net_profit, total_purchases=excluded.total_purchases,
        cash_purchases=excluded.cash_purchases, purchase_payments=excluded.purchase_payments,
        receivables_collected=excluded.receivables_collected,
        cash_in=excluded.cash_in, cash_out=excluded.cash_out,
        transaction_count=excluded.transaction_count, notes=excluded.notes,
        closed_at=datetime('now'), closed_by=excluded.closed_by
    `).run(
      year, month, 'closed',
      data.revenue, data.cost, data.grossProfit,
      data.totalExpenses, data.netProfit,
      data.totalPurchases, data.cashPurchases, data.purchasePayments,
      data.receivablesCollected, data.cashIn, data.cashOut,
      data.transactionCount, notes, owner.name
    )

    return { ...data, status: 'closed', closedBy: owner.name, notes }
  },

  // Ambil record tutup buku yang sudah disimpan
  findByMonth(year, month) {
    return getDb().prepare('SELECT * FROM monthly_closings WHERE year = ? AND month = ?').get(year, month)
  },

  // Rekap tahunan: 12 bulan sekaligus (live-compute, tidak bergantung pada status closed)
  getAnnual(year) {
    const months = []
    for (let m = 1; m <= 12; m++) {
      const closed = getDb().prepare('SELECT * FROM monthly_closings WHERE year = ? AND month = ?').get(year, m)
      if (closed) {
        months.push({
          month: m,
          status: closed.status,
          revenue: closed.revenue,
          cost: closed.cost,
          grossProfit: closed.gross_profit,
          totalExpenses: closed.total_expenses,
          netProfit: closed.net_profit,
          totalPurchases: closed.total_purchases,
          cashIn: closed.cash_in,
          cashOut: closed.cash_out,
          transactionCount: closed.transaction_count,
          closedBy: closed.closed_by,
          closedAt: closed.closed_at,
        })
      } else {
        const live = this.computeMonth(year, m)
        months.push({ ...live, status: 'open' })
      }
    }

    const totals = months.reduce((acc, m) => ({
      revenue:          acc.revenue          + m.revenue,
      cost:             acc.cost             + m.cost,
      grossProfit:      acc.grossProfit      + m.grossProfit,
      totalExpenses:    acc.totalExpenses    + m.totalExpenses,
      netProfit:        acc.netProfit        + m.netProfit,
      totalPurchases:   acc.totalPurchases   + m.totalPurchases,
      cashIn:           acc.cashIn           + m.cashIn,
      cashOut:          acc.cashOut          + m.cashOut,
      transactionCount: acc.transactionCount + m.transactionCount,
    }), {
      revenue:0, cost:0, grossProfit:0, totalExpenses:0, netProfit:0,
      totalPurchases:0, cashIn:0, cashOut:0, transactionCount:0,
    })

    return { year, months, totals }
  },

  // Daftar tahun yang punya data
  getAvailableYears() {
    const db = getDb()
    const fromTx = db.prepare(`
      SELECT DISTINCT strftime('%Y', created_at, 'localtime') AS y FROM transactions ORDER BY y DESC
    `).all().map(r => parseInt(r.y))
    const fromClosed = db.prepare(`
      SELECT DISTINCT year AS y FROM monthly_closings ORDER BY y DESC
    `).all().map(r => r.y)
    const all = [...new Set([...fromTx, ...fromClosed])].sort((a, b) => b - a)
    return all.length ? all : [new Date().getFullYear()]
  },
}

module.exports = monthlyClosingRepository
