import type { User } from '@/models/user'
import { createContext, use } from 'react'

export interface AuthContextType {
  initialLoading: boolean
  user: User | null
  isAuthenticated: boolean
  getSession: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = use(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
