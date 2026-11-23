import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authApi, tokenStore } from '../services/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  useEffect(() => {
    if (!tokenStore.get()) return
    authApi.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    tokenStore.set(data.access_token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (full_name, email, password) => {
    const data = await authApi.register({ full_name, email, password })
    tokenStore.set(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
