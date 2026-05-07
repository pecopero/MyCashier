import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'

const today = new Date().toLocaleDateString('en-CA')
const weekAgo = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-CA')

const ACTION_COLORS = {
  'Login':       'bg-blue-100 text-blue-700',
  'Logout':      'bg-gray-100 text-gray-600',
  'Buka Shift':  'bg-green-100 text-green-700',
  'Tutup Shift': 'bg-purple-100 text-purple-700',
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)

  const load = async () => {
    setLoading(true)
    const data = await window.electronAPI.getActivityLog({ startDate, endDate })
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const badgeClass = (action) => ACTION_COLORS[action] ?? 'bg-orange-100 text-orange-700'

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Log Aktivitas</h1>

      <form onSubmit={e => { e.preventDefault(); load() }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sampai</label>
          <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
      </form>

      {loading ? (
        <p className="text-center text-gray-400">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Waktu', 'Pengguna', 'Aksi', 'Detail'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{log.user_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.details || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Tidak ada aktivitas pada periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
