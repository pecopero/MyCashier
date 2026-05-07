import { useState, useCallback, useEffect } from 'react'
import { formatRupiah } from '../utils/format'

function today() { return new Date().toLocaleDateString('en-CA') }

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA')
}

export default function CashFlow() {
  const [startDate, setStartDate] = useState(firstOfMonth())
  const [endDate,   setEndDate]   = useState(today())
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await window.electronAPI.getCashFlowReport({ startDate, endDate })
    setData(result)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [])

  const setPreset = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    setStartDate(start.toLocaleDateString('en-CA'))
    setEndDate(end.toLocaleDateString('en-CA'))
  }

  const setMonth = () => {
    const d = new Date()
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA'))
    setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA'))
  }

  const { summary, inflows, outflows } = data || {}
  const netPositive = summary && summary.net >= 0

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Laporan Arus Kas</h1>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            ['Hari ini',  () => { setStartDate(today()); setEndDate(today()) }],
            ['7 hari',    () => setPreset(7)],
            ['Bulan ini', setMonth],
            ['30 hari',   () => setPreset(30)],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">{label}</button>
          ))}
        </div>
        <button onClick={load}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tampilkan
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 py-12">Memuat...</p>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Total Kas Masuk</p>
              <p className="text-xl font-bold text-green-600">{formatRupiah(summary.totalIn)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Total Kas Keluar</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(summary.totalOut)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${netPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Saldo Bersih (Net Cash)</p>
              <p className={`text-xl font-bold ${netPositive ? 'text-green-700' : 'text-red-700'}`}>
                {netPositive ? '' : '− '}{formatRupiah(Math.abs(summary.net))}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-6">
            {/* Kas Masuk */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-green-50 border-b border-green-100">
                <h2 className="font-semibold text-green-800">Kas Masuk</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {inflows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-gray-700">{row.label}</td>
                      <td className="px-5 py-3 text-right font-medium text-green-700">{formatRupiah(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 font-semibold">
                    <td className="px-5 py-3 text-green-800">Total Masuk</td>
                    <td className="px-5 py-3 text-right text-green-800">{formatRupiah(summary.totalIn)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Kas Keluar */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <h2 className="font-semibold text-red-800">Kas Keluar</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {outflows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-gray-700">{row.label}</td>
                      <td className="px-5 py-3 text-right font-medium text-red-700">{formatRupiah(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 font-semibold">
                    <td className="px-5 py-3 text-red-800">Total Keluar</td>
                    <td className="px-5 py-3 text-right text-red-800">{formatRupiah(summary.totalOut)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net summary bar */}
          <div className={`mt-4 rounded-xl p-4 flex justify-between items-center ${netPositive ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className={`font-semibold ${netPositive ? 'text-green-800' : 'text-red-800'}`}>
              {netPositive ? 'Arus kas positif — kas bertambah periode ini' : 'Arus kas negatif — kas berkurang periode ini'}
            </span>
            <span className={`text-lg font-bold ${netPositive ? 'text-green-800' : 'text-red-800'}`}>
              {netPositive ? '+' : '−'} {formatRupiah(Math.abs(summary.net))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
