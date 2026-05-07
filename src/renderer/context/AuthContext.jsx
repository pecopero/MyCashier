import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('kasir_user')
    if (saved) {
      try {
        const user = JSON.parse(saved)
        setCurrentUser(user)
        window.electronAPI.setSession(user)
      } catch {}
    }
    setChecking(false)
  }, [])

  const login = (user) => {
    setCurrentUser(user)
    sessionStorage.setItem('kasir_user', JSON.stringify(user))
    window.electronAPI.setSession(user)
    window.electronAPI.addActivityLog({ userId: user.id, userName: user.name, action: 'Login', entity: 'auth' })
  }

  const logout = () => {
    const saved = sessionStorage.getItem('kasir_user')
    if (saved) {
      try {
        const u = JSON.parse(saved)
        window.electronAPI.addActivityLog({ userId: u.id, userName: u.name, action: 'Logout', entity: 'auth' })
      } catch {}
    }
    window.electronAPI.clearSession()
    setCurrentUser(null)
    sessionStorage.removeItem('kasir_user')
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, checking }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
