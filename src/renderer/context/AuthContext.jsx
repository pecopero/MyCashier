import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Pulihkan sesi dari sessionStorage
    const saved = sessionStorage.getItem('kasir_user')
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)) } catch {}
    }
    setChecking(false)
  }, [])

  const login = (user) => {
    setCurrentUser(user)
    sessionStorage.setItem('kasir_user', JSON.stringify(user))
  }

  const logout = () => {
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
