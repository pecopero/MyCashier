import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    window.electronAPI.getUsers().then(data => setUsers(data || [])).catch(() => {})
  }, [])

  // Auto-focus agar keyboard langsung aktif saat user dipilih
  useEffect(() => {
    containerRef.current?.focus()
  }, [selected])

  const handleSelectUser = (user) => {
    setSelected(user)
    setPin('')
    setError('')
  }

  const handlePinInput = (digit) => {
    if (pin.length >= 6) return
    setPin(p => p + digit)
    setError('')
  }

  const handleBackspace = () => setPin(p => p.slice(0, -1))

  const handleLogin = async () => {
    if (!pin) return
    setLoading(true)
    try {
      const user = await window.electronAPI.loginUser(selected.id, pin)
      if (user) {
        login(user)
      } else {
        setError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (!selected) return
    if (e.key >= '0' && e.key <= '9') handlePinInput(e.key)
    if (e.key === 'Backspace') handleBackspace()
    if (e.key === 'Enter') handleLogin()
  }

  const activeUsers = users.filter(u => u.active)

  return (
    <div ref={containerRef} className="flex items-center justify-center h-screen bg-gray-100 outline-none"
      onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Kasir App</h1>
          <p className="text-gray-400 text-sm mt-1">Masuk untuk melanjutkan</p>
        </div>

        {!selected ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600 text-center mb-4">Pilih pengguna</p>
            {activeUsers.map(user => (
              <button key={user.id} onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${user.role === 'owner' ? 'bg-blue-600' : 'bg-gray-500'}`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role === 'owner' ? 'Pemilik' : 'Kasir'}</p>
                </div>
              </button>
            ))}
            {activeUsers.length === 0 && (
              <p className="text-center text-gray-400 text-sm">Tidak ada pengguna aktif.</p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">←</button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${selected.role === 'owner' ? 'bg-blue-600' : 'bg-gray-500'}`}>
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.role === 'owner' ? 'Pemilik' : 'Kasir'}</p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mb-4">Masukkan PIN (6 digit)</p>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-6">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
              ))}
            </div>

            {error && <p className="text-center text-red-500 text-sm mb-4">{error}</p>}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((digit, i) => (
                <button key={i} onClick={() => digit === '⌫' ? handleBackspace() : digit && handlePinInput(digit)}
                  disabled={!digit && digit !== '0'}
                  className={`h-12 rounded-xl text-lg font-semibold transition-colors ${
                    digit === '⌫' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : digit ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                    : ''
                  }`}>
                  {digit}
                </button>
              ))}
            </div>

            <button onClick={handleLogin} disabled={pin.length < 1 || loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {loading ? 'Memeriksa...' : 'Masuk'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
