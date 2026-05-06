import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ReceiptPreviewModal({ tx, onClose }) {
  const [html, setHtml] = useState(null)

  useEffect(() => {
    window.electronAPI.previewReceipt(tx).then(setHtml)
  }, [tx])

  const handlePrint = () => {
    window.electronAPI.printReceipt(tx)
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]" style={{ width: 360 }}>
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Preview Struk</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100">
          {html ? (
            <iframe
              srcDoc={html}
              title="receipt-preview"
              className="bg-white shadow-md rounded"
              style={{ width: 296, minHeight: 400, border: 'none' }}
              sandbox="allow-same-origin"
            />
          ) : (
            <p className="text-gray-400 text-sm mt-8">Memuat...</p>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">
            Tutup
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
            Print Struk
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
