import { useState, useEffect, useCallback } from 'react'
import { formatRupiah } from '../utils/format'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function Badge({ status }) {
  if (status === 'closed') return (
    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Tutup</span>
  )
  return (
    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Buka</span>
  )
}

function StatCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    gray:   'bg-gray-50 text-gray-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CloseModal({ year, month, preview, onClose, onSuccess }) {
  const [pin, setPin] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = async () => {
    if (!pin.trim()) return setError('Masukkan PIN owner')
    setLoading(true)
    setError('')
    try {
      await window.electronAPI.closeMonth(year, month, pin, notes)
      onSuccess()
    } catch (e) {
      setError(e.message || 'Gagal menutup buku')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Tutup Buku — {MONTHS_FULL[month - 1]} {year}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Snapshot keuangan akan dikunci. Tindakan ini tidak dapat dibatalkan.</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Ringkasan singkat */}
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Omzet</p>
              <p className="font-semibold text-gray-800">{formatRupiah(preview.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HPP</p>
              <p className="font-semibold text-gray-800">{formatRupiah(preview.cost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Laba Kotor</p>
              <p className={`font-semibold ${preview.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRupiah(preview.grossProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Laba Bersih</p>
              <p className={`font-semibold ${preview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRupiah(preview.netProfit)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan penutupan buku..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PIN Owner</label>
            <input
              type="password"
              placeholder="Masukkan PIN owner"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClose()}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            Batal
          </button>
          <button onClick={handleClose} disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Memproses...' : 'Tutup Buku'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MonthlyTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [preview, setPreview] = useState(null)
  const [saved, setSaved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [years, setYears] = useState([])

  useEffect(() => {
    window.electronAPI.getClosingYears().then(setYears)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [p, s] = await Promise.all([
      window.electronAPI.previewMonthlyClosing(year, month),
      window.electronAPI.getMonthlyClosing(year, month),
    ])
    setPreview(p)
    setSaved(s)
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const isClosed = saved?.status === 'closed'

  return (
    <div>
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bulan</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS_FULL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <button onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
        {!isClosed && preview && (
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 ml-auto">
            Tutup Buku Bulan Ini
          </button>
        )}
        {isClosed && (
          <div className="ml-auto flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Ditutup oleh {saved.closed_by}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : preview ? (
        <>
          {/* Status header */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold text-gray-800">
              {MONTHS_FULL[month - 1]} {year}
            </h2>
            <Badge status={saved?.status ?? 'open'} />
            {isClosed && (
              <span className="text-xs text-gray-400">
                {new Date(saved.closed_at).toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* Profit cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Omzet" value={formatRupiah(preview.revenue)} color="blue" />
            <StatCard label="HPP" value={formatRupiah(preview.cost)} color="orange" />
            <StatCard label="Laba Kotor" value={formatRupiah(preview.grossProfit)}
              color={preview.grossProfit >= 0 ? 'green' : 'red'} />
            <StatCard label="Laba Bersih" value={formatRupiah(preview.netProfit)}
              color={preview.netProfit >= 0 ? 'green' : 'red'}
              sub={`Setelah pengeluaran ${formatRupiah(preview.totalExpenses)}`} />
          </div>

          {/* Secondary grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <StatCard label="Total Pembelian" value={formatRupiah(preview.totalPurchases)} color="gray" />
            <StatCard label="Kas Masuk" value={formatRupiah(preview.cashIn)}
              sub={`Penjualan tunai + piutang lunas`} color="blue" />
            <StatCard label="Kas Keluar" value={formatRupiah(preview.cashOut)}
              sub={`Pembelian + bayar hutang + operasional`} color="orange" />
          </div>

          {/* Cash summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Ringkasan Kas</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Kas Masuk',          preview.cashIn,     'text-blue-600'],
                ['Kas Keluar',         preview.cashOut,    'text-red-600'],
                ['Selisih Kas Bersih', preview.cashIn - preview.cashOut,
                  preview.cashIn - preview.cashOut >= 0 ? 'text-green-600' : 'text-red-600'],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{formatRupiah(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Statistik Transaksi</h3>
            <div className="grid grid-cols-3 gap-4 text-sm text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800">{preview.transactionCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Transaksi</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{preview.voidCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Void</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {preview.transactionCount > 0 ? formatRupiah(preview.revenue / preview.transactionCount) : 'Rp 0'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Rata-rata per Transaksi</p>
              </div>
            </div>
          </div>

          {isClosed && saved.notes && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Catatan Penutupan</p>
              <p className="text-sm text-blue-800">{saved.notes}</p>
            </div>
          )}
        </>
      ) : null}

      {showModal && preview && (
        <CloseModal
          year={year}
          month={month}
          preview={preview}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function AnnualTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [years, setYears] = useState([])

  useEffect(() => {
    window.electronAPI.getClosingYears().then(setYears)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const result = await window.electronAPI.getAnnualClosing(year)
    setData(result)
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : data ? (
        <>
          {/* Totals row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Omzet" value={formatRupiah(data.totals.revenue)} color="blue" />
            <StatCard label="Total HPP" value={formatRupiah(data.totals.cost)} color="orange" />
            <StatCard label="Total Laba Kotor" value={formatRupiah(data.totals.grossProfit)}
              color={data.totals.grossProfit >= 0 ? 'green' : 'red'} />
            <StatCard label="Total Laba Bersih" value={formatRupiah(data.totals.netProfit)}
              color={data.totals.netProfit >= 0 ? 'green' : 'red'} />
          </div>

          {/* Monthly table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Rekap Bulanan {year}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Bulan','Status','Omzet','HPP','Laba Kotor','Pengeluaran','Laba Bersih','Pembelian','Transaksi'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.months.map(m => (
                    <tr key={m.month} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {MONTHS_FULL[m.month - 1]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-blue-700">{formatRupiah(m.revenue)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatRupiah(m.cost)}</td>
                      <td className={`px-4 py-3 font-medium ${m.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupiah(m.grossProfit)}
                      </td>
                      <td className="px-4 py-3 text-orange-600">{formatRupiah(m.totalExpenses)}</td>
                      <td className={`px-4 py-3 font-semibold ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupiah(m.netProfit)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatRupiah(m.totalPurchases)}</td>
                      <td className="px-4 py-3 text-gray-500">{m.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-800" colSpan={2}>Total {year}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">{formatRupiah(data.totals.revenue)}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{formatRupiah(data.totals.cost)}</td>
                    <td className={`px-4 py-3 font-bold ${data.totals.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatRupiah(data.totals.grossProfit)}
                    </td>
                    <td className="px-4 py-3 font-bold text-orange-700">{formatRupiah(data.totals.totalExpenses)}</td>
                    <td className={`px-4 py-3 font-bold ${data.totals.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatRupiah(data.totals.netProfit)}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{formatRupiah(data.totals.totalPurchases)}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{data.totals.transactionCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function TutupBuku() {
  const [tab, setTab] = useState('monthly')

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Tutup Buku</h1>
      <p className="text-sm text-gray-500 mb-6">Snapshot keuangan bulanan dan tahunan.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {[['monthly','Tutup Buku Bulanan'],['annual','Rekap Tahunan']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'monthly' ? <MonthlyTab /> : <AnnualTab />}
    </div>
  )
}
