import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'

function today() { return new Date().toLocaleDateString('en-CA') }

function DiffBadge({ diff }) {
  if (diff === 0) return <span className="text-green-600 font-bold">Sesuai</span>
  if (diff > 0)   return <span className="text-blue-600 font-bold">+{formatRupiah(diff)} (Lebih)</span>
  return <span className="text-red-600 font-bold">{formatRupiah(diff)} (Kurang)</span>
}

export default function TutupKas() {
  const [date, setDate] = useState(today())
  const [openingCash, setOpeningCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState(null)
  const [existing, setExisting] = useState(null)
  const [history, setHistory] = useState([])
  const [saved, setSaved] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)

  const loadDate = async (d) => {
    setLoadingDate(true)
    const [sum, ex] = await Promise.all([
      window.electronAPI.getCashDailySummary(d),
      window.electronAPI.getCashClosingByDate(d),
    ])
    setSummary(sum)
    if (ex) {
      setExisting(ex)
      setOpeningCash(String(ex.opening_cash))
      setActualCash(String(ex.actual_cash))
      setNote(ex.note || '')
    } else {
      setExisting(null)
      setActualCash('')
      setNote('')
    }
    setLoadingDate(false)
  }

  const loadHistory = async () => {
    const data = await window.electronAPI.getCashClosings()
    setHistory(data)
  }

  useEffect(() => {
    loadDate(date)
    loadHistory()
  }, [date])

  const openingNum = parseFloat(openingCash) || 0
  const actualNum  = parseFloat(actualCash)  || 0

  const expectedCash = summary
    ? openingNum + summary.salesCash + summary.receivablePayments - summary.expenses - summary.purchasesCash
    : 0

  const difference = actualNum - expectedCash

  const handleSave = async (e) => {
    e.preventDefault()
    await window.electronAPI.saveCashClosing({
      date,
      openingCash: openingNum,
      actualCash: actualNum,
      expectedCash,
      note,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    loadHistory()
    loadDate(date)
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Tutup Kas Harian</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form tutup kas */}
        <div>
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  max={today()}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {existing && <span className="text-xs text-blue-600 font-medium mt-4">Sudah ada — edit untuk update</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kas Awal (modal awal hari)</label>
              <input type="number" min="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Ringkasan otomatis */}
            {summary && !loadingDate && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Ringkasan Kas {date}</p>
                <div className="flex justify-between text-green-700">
                  <span>+ Kas Awal</span><span>{formatRupiah(openingNum)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>+ Penjualan Tunai</span><span>{formatRupiah(summary.salesCash)}</span>
                </div>
                {summary.receivablePayments > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>+ Bayar Piutang</span><span>{formatRupiah(summary.receivablePayments)}</span>
                  </div>
                )}
                <div className="flex justify-between text-red-600">
                  <span>− Pengeluaran</span><span>{formatRupiah(summary.expenses)}</span>
                </div>
                {summary.purchasesCash > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>− Pembelian Tunai</span><span>{formatRupiah(summary.purchasesCash)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span>Kas Seharusnya</span><span className="text-blue-700">{formatRupiah(expectedCash)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kas Aktual (uang fisik dihitung)</label>
              <input type="number" min="0" value={actualCash} onChange={e => setActualCash(e.target.value)}
                placeholder="Hitung uang fisik di tangan..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {actualCash !== '' && (
              <div className={`rounded-lg p-4 text-sm font-medium flex justify-between items-center ${difference === 0 ? 'bg-green-50' : difference > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <span className="text-gray-700">Selisih:</span>
                <DiffBadge diff={difference} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Opsional..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex items-center gap-4">
              <button type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                {existing ? 'Update Tutup Kas' : 'Simpan Tutup Kas'}
              </button>
              {saved && <span className="text-green-600 text-sm font-medium">✓ Tersimpan</span>}
            </div>
          </form>
        </div>

        {/* Histori tutup kas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Riwayat Tutup Kas</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-sm">Belum ada riwayat tutup kas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Tanggal', 'Kas Awal', 'Seharusnya', 'Aktual', 'Selisih'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} onClick={() => setDate(h.date)}
                    className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer">
                    <td className="px-4 py-2.5 font-medium text-blue-700">{h.date}</td>
                    <td className="px-4 py-2.5">{formatRupiah(h.opening_cash)}</td>
                    <td className="px-4 py-2.5">{formatRupiah(h.expected_cash)}</td>
                    <td className="px-4 py-2.5">{formatRupiah(h.actual_cash)}</td>
                    <td className="px-4 py-2.5">
                      {h.difference === 0
                        ? <span className="text-green-600 text-xs font-medium">Sesuai</span>
                        : h.difference > 0
                        ? <span className="text-blue-600 text-xs font-medium">+{formatRupiah(h.difference)}</span>
                        : <span className="text-red-600 text-xs font-medium">{formatRupiah(h.difference)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
