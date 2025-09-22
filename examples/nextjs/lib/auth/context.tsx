'use client'

import type { ReactNode } from 'react'
import type { User } from '../api/schema'
import Cookies from 'js-cookie'
import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '../api/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string, avatar?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('auth-token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await apiClient('@get/auth/me')
        setUser(response)
      }
      catch {
        // Token is invalid, remove it
        Cookies.remove('auth-token')
      }
      finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiClient('@post/auth/login', { json: { email, password } })
    setUser(response.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await apiClient('@post/auth/register', { json: { email, password, name } })
    setUser(response.user)
  }

  const logout = async () => {
    await apiClient('@post/auth/logout')
    Cookies.remove('auth-token')
    setUser(null)
  }

  const updateProfile = async (data: { name?: string, avatar?: string }) => {
    const response = await apiClient('@put/profile', { json: data })
    setUser(response)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
    }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
