import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
}

const BORDERS = {
  success: 'border-l-4 border-green-400',
  error:   'border-l-4 border-red-400',
  info:    'border-l-4 border-blue-400',
  warning: 'border-l-4 border-yellow-400',
}

function ToastItem({ toast, onRemove }) {
  return (
    <div className={`flex items-start gap-2.5 bg-white shadow-lg rounded-lg px-4 py-3 min-w-[260px] max-w-[360px] ${BORDERS[toast.type]} animate-[slideIn_0.2s_ease]`}>
      {ICONS[toast.type]}
      <p className="text-sm text-gray-800 flex-1 leading-snug">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 ml-1 shrink-0 text-base leading-none">×</button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  toast.success = (msg, dur) => toast(msg, 'success', dur)
  toast.error   = (msg, dur) => toast(msg, 'error',   dur ?? 5000)
  toast.info    = (msg, dur) => toast(msg, 'info',    dur)
  toast.warning = (msg, dur) => toast(msg, 'warning', dur)

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onRemove={remove} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
