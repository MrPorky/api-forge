import type { User } from '$lib/api/schema'
import { apiClient } from '$lib/api/client'
import Cookies from 'js-cookie'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

class AuthStore {
  private state = $state<AuthState>({
    user: null,
    isLoading: false,
    isAuthenticated: false,
  })

  get user() {
    return this.state.user
  }

  get isLoading() {
    return this.state.isLoading
  }

  get isAuthenticated() {
    return this.state.isAuthenticated
  }

  async login(email: string, password: string) {
    this.state.isLoading = true
    try {
      const data = await apiClient('@post/auth/login', {
        json: { email, password },
      })

      this.state.user = data.user
      this.state.isAuthenticated = true
    }
    catch {
      return { success: false, error: 'Network error' }
    }
    finally {
      this.state.isLoading = false
    }
  }

  async register(email: string, password: string, name: string) {
    this.state.isLoading = true
    try {
      const data = await apiClient('@post/auth/register', {
        json: { email, password, name },
      })

      this.state.user = data.user
      this.state.isAuthenticated = true
      return { success: true }
    }
    catch {
      return { success: false, error: 'Network error' }
    }
    finally {
      this.state.isLoading = false
    }
  }

  async logout() {
    this.state.isLoading = true
    try {
      await apiClient('@post/auth/logout')
      Cookies.remove('auth-token')
      this.state.user = null
      this.state.isAuthenticated = false
    }
    catch (error) {
      console.error('Logout error:', error)
    }
    finally {
      this.state.isLoading = false
    }
  }

  async checkAuth() {
    const token = Cookies.get('auth-token')
    if (!token)
      return

    this.state.isLoading = true
    try {
      const user = await apiClient('@get/auth/me')
      this.state.user = user
      this.state.isAuthenticated = true
    }
    catch {
      Cookies.remove('auth-token')
    }
    finally {
      this.state.isLoading = false
    }
  }

  async updateProfile(name?: string, avatar?: string) {
    this.state.isLoading = true
    try {
      const updatedUser = await apiClient('@put/profile', {
        json: { name, avatar },
      })

      this.state.user = updatedUser
      return { success: true }
    }
    catch {
      return { success: false, error: 'Network error' }
    }
    finally {
      this.state.isLoading = false
    }
  }
}

export const authStore = new AuthStore()
