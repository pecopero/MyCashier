import { useState, useMemo } from 'react'

export function usePagination(data, pageSize = 50) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil((data?.length ?? 0) / pageSize))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(() => {
    if (!data?.length) return []
    const start = (safePage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, safePage, pageSize])

  const reset = () => setPage(1)

  function Pager() {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-500">
          {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, data.length)} dari {data.length} data
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(1)} disabled={safePage === 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p
            if (totalPages <= 5) p = i + 1
            else if (safePage <= 3) p = i + 1
            else if (safePage >= totalPages - 2) p = totalPages - 4 + i
            else p = safePage - 2 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded border transition-colors ${p === safePage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                {p}
              </button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
          <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">»</button>
        </div>
      </div>
    )
  }

  return { paged, page: safePage, totalPages, setPage, reset, Pager }
}
