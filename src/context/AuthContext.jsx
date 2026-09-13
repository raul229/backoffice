import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCsrf, getMe, login as loginRequest, logout as logoutRequest } from '../service/api.js'
import { can } from '../lib/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await getCsrf()
        const me = await getMe()
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    const onAuthRequired = () => setUser(null)
    window.addEventListener('auth:required', onAuthRequired)
    return () => {
      cancelled = true
      window.removeEventListener('auth:required', onAuthRequired)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      can: (permission) => can(user, permission),
      login: async (username, password) => {
        await getCsrf()
        const next = await loginRequest(username, password)
        setUser(next)
        return next
      },
      logout: async () => {
        try {
          await logoutRequest()
        } finally {
          setUser(null)
        }
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
