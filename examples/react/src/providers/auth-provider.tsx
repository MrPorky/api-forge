import type { PropsWithChildren } from 'react'
import type { User } from '@/models/user'
import { useEffect, useState } from 'react'
import { apiClient } from '@/api/api-client'
import { AuthContext } from '@/hooks/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [initialLoadig, setInitialLoadig] = useState(true)

  async function getSession() {
    try {
      const data = await apiClient('@get/get-session')

      if (data) {
        setUser(data.user)
      }
    }
    catch {
      setUser(null)
    }
  }

  useEffect(() => {
    getSession().then(() => setInitialLoadig(false))
  }, [])

  return (
    <AuthContext value={{
      initialLoadig,
      isAuthenticated: !!user,
      getSession,
      user,
    }}
    >
      {children}
    </AuthContext>
  )
}
