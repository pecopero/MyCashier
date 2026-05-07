import { useState, useEffect } from 'react'
import { formatRupiah, formatDate } from '../utils/format'

function duration(openedAt, closedAt) {
  const from = new Date(openedAt)
  const to = closedAt ? new Date(closedAt) : new Date()
  const diff = Math.floor((to - from) / 60000)
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

export default function Shifts() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getAllShifts().then(data => {
      setShifts(data)
      setLoading(false)
    })
  }, [])

  const totalSales = shifts.filter(s => s.status === 'closed').reduce((sum, s) => sum + s.total_sales, 0)
  const totalTx = shifts.filter(s => s.status === 'closed').reduce((sum, s) => sum + s.total_transactions, 0)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Riwayat Shift</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Shift</p>
          <p className="text-2xl font-bold text-gray-800">{shifts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Penjualan (semua shift)</p>
          <p className="text-lg font-bold text-blue-600">{formatRupiah(totalSales)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Transaksi (semua shift)</p>
          <p className="text-2xl font-bold text-gray-800">{totalTx}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Kasir', 'Dibuka', 'Ditutup', 'Durasi', 'Kas Awal', 'Kas Akhir', 'Penjualan', 'Transaksi', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.user_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.opened_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.closed_at ? formatDate(s.closed_at) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{duration(s.opened_at, s.closed_at)}</td>
                  <td className="px-4 py-3">{formatRupiah(s.opening_cash)}</td>
                  <td className="px-4 py-3">{s.closing_cash != null ? formatRupiah(s.closing_cash) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-blue-700">{formatRupiah(s.total_sales)}</td>
                  <td className="px-4 py-3 text-center">{s.total_transactions}</td>
                  <td className="px-4 py-3">
                    {s.status === 'open'
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Selesai</span>}
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Belum ada riwayat shift.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
