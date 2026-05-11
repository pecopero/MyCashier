import { useState, useMemo } from 'react'

export function useSortable(data, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  const toggle = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !data?.length) return data || []
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'id')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  function Th({ col, children, className = '' }) {
    const indicator = sortKey !== col
      ? <span className="ml-1 text-gray-300 text-xs">↕</span>
      : <span className="ml-1 text-blue-500 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
    return (
      <th onClick={() => toggle(col)}
        className={`cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}>
        {children}{indicator}
      </th>
    )
  }

  return { sorted, sortKey, sortDir, toggle, Th }
}
