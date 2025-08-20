import { api } from './api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token?: string
  requires_2fa?: boolean
  temp_token?: string
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
  has_2fa_enabled?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface RegisterResponse {
  access_token: string
  user: User
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/login', credentials)
    return response.data
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post('/api/v1/auth/register', userData)
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/api/v1/auth/me')
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout')
  },

  refreshToken: async (): Promise<{ access_token: string }> => {
    const response = await api.post('/api/v1/auth/refresh')
    return response.data
  },

  // OAuth methods
  googleLogin: async (): Promise<{ auth_url: string }> => {
    const response = await api.get('/api/v1/auth/google')
    return response.data
  },

  googleCallback: async (code: string, state: string): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/google/callback', { code, state })
    return response.data
  },

  facebookLogin: async (): Promise<{ auth_url: string }> => {
    const response = await api.get('/api/v1/auth/facebook')
    return response.data
  },

  facebookCallback: async (code: string, state: string): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/facebook/callback', { code, state })
    return response.data
  },

  githubLogin: async (): Promise<{ auth_url: string }> => {
    const response = await api.get('/api/v1/auth/github')
    return response.data
  },

  githubCallback: async (code: string, state: string): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/github/callback', { code, state })
    return response.data
  },

  // Password Reset / Forgot Password methods
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; dev_info?: any }> => {
    const response = await api.post('/api/v1/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token: string, password: string): Promise<{ success: boolean; message: string; redirect_to?: string }> => {
    const response = await api.post('/api/v1/auth/reset-password', { token, password })
    return response.data
  },

  verifyResetToken: async (token: string): Promise<{ valid: boolean; email?: string; expires_at?: string; error?: string }> => {
    const response = await api.get(`/api/v1/auth/verify-reset-token/${token}`)
    return response.data
  }
}
