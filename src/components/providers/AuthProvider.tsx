'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, ApiError, type User } from '@/lib/api-client'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null })

  // 初始化：从 localStorage 恢复会话
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken')
    if (!token) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    authApi.me()
      .then(user => setState({ user, loading: false, error: null }))
      .catch(() => {
        // Token 失效，尝试刷新
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          authApi.refresh(refreshToken)
            .then(({ accessToken, refreshToken: newRT }) => {
              sessionStorage.setItem('accessToken', accessToken)
              localStorage.setItem('refreshToken', newRT)
              return authApi.me()
            })
            .then(user => setState({ user, loading: false, error: null }))
            .catch(() => {
              sessionStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              setState({ user: null, loading: false, error: null })
            })
        } else {
          setState({ user: null, loading: false, error: null })
        }
      })
  }, [])

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { user, accessToken, refreshToken } = await authApi.login({ email, password })
      sessionStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setState({ user, loading: false, error: null })
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message }))
      throw err
    }
  }, [])

  // 注册
  const register = useCallback(async (username: string, email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      await authApi.register({ username, email, password })
      setState(s => ({ ...s, loading: false }))
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message }))
      throw err
    }
  }, [])

  // 登出
  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setState({ user: null, loading: false, error: null })
  }, [])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me()
      setState(s => ({ ...s, user }))
    } catch { /* ignore */ }
  }, [])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
