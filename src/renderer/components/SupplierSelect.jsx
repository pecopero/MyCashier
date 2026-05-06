import { useState } from 'react'
import { createPortal } from 'react-dom'
import SupplierManager from './SupplierManager'

export default function SupplierSelect({ value, onChange, suppliers, onAdd, onUpdate, onDelete }) {
  const [showManager, setShowManager] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">-- Tanpa Supplier --</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowManager(true)}
          title="Kelola Supplier"
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-blue-600 text-sm font-bold transition-colors"
        >
          ⚙
        </button>
      </div>

      {showManager && createPortal(
        <SupplierManager
          suppliers={suppliers}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setShowManager(false)}
        />,
        document.body
      )}
    </>
  )
}
