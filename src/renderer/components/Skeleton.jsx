export function SkeletonLine({ w = 'w-full', h = 'h-4' }) {
  return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />
}

export function SkeletonTable({ rows = 8, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className={`h-3.5 bg-gray-100 rounded animate-pulse ${c === 0 ? 'w-36' : c === cols - 1 ? 'w-16' : 'w-24'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
        </div>
      ))}
    </div>
  )
}
