import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react'
import { api } from '../services/api'
import { secureTokenService } from '../services/secureTokenService'
import Logger from '../utils/logger'

interface User {
  id: string
  email: string
  username?: string
  full_name?: string
  display_name?: string
  avatar_url?: string | null
  provider?: string
  is_active?: boolean
  is_verified?: boolean
  created_at?: string
  last_login?: string
  role?: string
  role_name?: string
  role_id?: string
  is_admin?: boolean
  has_2fa_enabled?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  register: (userData: {
    email: string
    username?: string
    password: string
    full_name: string
  }) => Promise<{ success: boolean, error?: string }>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithFacebook: () => Promise<void>
  loginWithGithub: () => Promise<void>
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  resetInactivityTimer: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    try {
      return secureTokenService.getToken('access')
    } catch (error) {
      Logger.error('Failed to get token from secureTokenService', error)
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  // Auto-logout functionality - simple version
  const inactivityTimeoutRef = useRef<number | null>(null)

  // Set up API interceptor for token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await api.get('/api/v1/auth/me')
          setUser(response.data)
        } catch (error) {
          // Token is invalid, remove it
          try {
            secureTokenService.removeToken('access')
            secureTokenService.removeToken('refresh')
          } catch (removeError) {
            Logger.error('Failed to remove tokens', removeError)
          }
          setToken(null)
        }
      }
      setIsLoading(false)
    }

    loadUser()
  }, [token])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/v1/auth/login', {
        email,
        password,
      })

      if (response.data.error) {
        return { success: false, error: response.data.error }
      }

      // Kiểm tra nếu cần 2FA
      if (response.data.requires_2fa) {
        // Trả về thông tin 2FA để component Login xử lý
        throw new Error('2FA_REQUIRED')
      }

      const { access_token, user: userData } = response.data

      // Store token securely instead of localStorage
      try {
        secureTokenService.storeToken(access_token, 'access')
      } catch (storeError) {
        Logger.error('Failed to store token securely', storeError)
        // Fallback to setting token directly
      }
      setToken(access_token)
      
      if (userData) {
        setUser(userData)
      } else {
        // If user data not in login response, fetch it separately
        try {
          const userResponse = await api.get(`/api/v1/auth/me?access_token=${access_token}`)
          setUser(userResponse.data)
        } catch (userError) {
          Logger.error('Failed to fetch user profile', userError)
        }
      }
      
      return { success: true }
    } catch (error: any) {
      // Xử lý riêng cho 2FA
      if (error.message === '2FA_REQUIRED') {
        throw error
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const register = async (userData: {
    email: string
    username?: string
    password: string
    full_name: string
  }) => {
    try {
      const response = await api.post('/api/v1/auth/register', userData)
      
      if (response.data.error) {
        return { success: false, error: response.data.error }
      }

      // Registration successful, extract token and user data
      const { access_token, user: newUser } = response.data
      
      if (access_token) {
        localStorage.setItem('token', access_token)
        setToken(access_token)
        
        if (newUser) {
          setUser(newUser)
        }
      }
      
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Registration failed'
      return { success: false, error: errorMessage }
    }
  }

  // Simple auto-logout function
  const resetInactivityTimer = useCallback(() => {
    if (!user || !token) return

    // Clear existing timer
    if (inactivityTimeoutRef.current) {
      window.clearTimeout(inactivityTimeoutRef.current)
    }

    // Set new timer for 5 minutes
    inactivityTimeoutRef.current = window.setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log('Auto-logout triggered due to inactivity')
      }
      // Simple logout without API call to avoid circular dependency
      secureTokenService.clearAllTokens()
      setToken(null)
      setUser(null)
      delete api.defaults.headers.common['Authorization']
    }, 5 * 60 * 1000) // 5 minutes
  }, [user, token])

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch (error) {
      // Even if logout fails on server, clear local state
      Logger.debug('Logout error', error)
    } finally {
      // Clear tokens securely
      secureTokenService.clearAllTokens()
      setToken(null)
      setUser(null)
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await api.post('/api/v1/auth/refresh', {
        refresh_token: refreshTokenValue,
      })

      const { access_token, refresh_token } = response.data
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('refreshToken', refresh_token)
      setToken(access_token)
    } catch (error) {
      // Refresh failed, logout user
      logout()
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      const response = await api.get('/api/v1/auth/google')
      const { auth_url } = response.data
      // Redirect to OAuth URL
      window.location.href = auth_url
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        throw new Error('Backend server is not running. Please start the backend server.')
      }
      throw new Error(error.response?.data?.detail || 'Google login failed')
    }
  }

  const loginWithFacebook = async () => {
    try {
      const response = await api.get('/api/v1/auth/facebook')
      const { auth_url } = response.data
      // Redirect to OAuth URL
      window.location.href = auth_url
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        throw new Error('Backend server is not running. Please start the backend server.')
      }
      throw new Error(error.response?.data?.detail || 'Facebook login failed')
    }
  }

  const loginWithGithub = async () => {
    try {
      const response = await api.get('/api/v1/auth/github')
      const { auth_url } = response.data
      // Redirect to OAuth URL
      window.location.href = auth_url
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        throw new Error('Backend server is not running. Please start the backend server.')
      }
      throw new Error(error.response?.data?.detail || 'GitHub login failed')
    }
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    loginWithGoogle,
    loginWithFacebook,
    loginWithGithub,
    setToken,
    setUser,
    resetInactivityTimer,
  }

  // Set up activity listeners for auto-logout
  useEffect(() => {
    if (!user || !token) {
      // Clear timer if user is not logged in
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      return
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial timer setup
    resetInactivityTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
    }
  }, [user, token, resetInactivityTimer])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
