import axios from 'axios'
// import toast from 'react-hot-toast'
import CsrfProtection from '../utils/csrf'
import { SecurityUtils } from '../utils/validation'
import Logger from '../utils/logger'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  // DO NOT set Content-Type globally - let axios/browser set it automatically for FormData
  timeout: 30 * 60 * 1000, // 30 minutes timeout for large file uploads (CDN service)
})

// Add security headers and rate limiting
api.interceptors.request.use(async (config) => {
  // Set Content-Type conditionally: JSON for normal requests, let browser handle FormData
  if (config.data && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }

  // Add auth token for all protected endpoints
  const token = localStorage.getItem('token')
  if (token) {
    // Add token to all requests except OAuth callback and public endpoints
    const publicEndpoints = [
      '/health',
      '/api/v1/auth/google',
      '/api/v1/auth/github',
      '/api/v1/auth/facebook'
      // Removed '/api/v1/genai' - GenAI endpoints need authentication
    ]
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))

    if (!isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  // Add CSRF token for protected endpoints - TEMPORARILY DISABLED
  // if (CsrfProtection.requiresCsrfProtection(config.method || 'GET', config.url || '')) {
  //   try {
  //     const csrfToken = await CsrfProtection.getToken()
  //     if (csrfToken) {
  //       config.headers['X-CSRF-Token'] = csrfToken
  //     }
  //   } catch (error) {
  //     console.warn('Failed to get CSRF token:', error)
  //   }
  // }

  // Rate limiting check - simplified (disabled for now)
  // const endpoint = config.url || ''
  // let rateLimitType = 'default'

  // Sanitize request data (only for JSON, skip FormData)
  if (config.data && !(config.data instanceof FormData)) {
    // Check for suspicious content
    if (SecurityUtils.isSuspiciousRequest(config.data)) {
      const error = new Error('Request contains potentially harmful content')
        ; (error as any).isSecurity = true
      throw error
    }

    // Sanitize parameters
    config.data = SecurityUtils.sanitizeApiParams(config.data)
  }

  // Add security headers
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  config.headers['X-Content-Type-Options'] = 'nosniff'

  return config
}, (error) => {
  return Promise.reject(error)
})

// Handle auth errors and show toast notifications
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    // Handle rate limiting errors
    if (error.isRateLimit) {
      Logger.error('Rate limit exceeded')
      return Promise.reject(error)
    }

    // Handle security errors
    if (error.isSecurity) {
      Logger.error('Security violation detected')
      return Promise.reject(error)
    }

    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.detail?.includes('CSRF')) {
      try {
        await CsrfProtection.refreshToken()
        // Retry the request with new token
        const config = error.config
        const csrfToken = await CsrfProtection.getToken()
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken
        }
        return api.request(config)
      } catch (csrfError) {
        Logger.error('Failed to refresh CSRF token', csrfError)
      }
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      // CsrfProtection.clearToken()
      window.location.href = '/login'
      Logger.error('Session expired. Please login again.')
      return Promise.reject(error)
    }

    // Handle other HTTP errors
    if (error.response?.status >= 400) {
      const message = error.response?.data?.detail ||
        error.response?.data?.message ||
        'An error occurred'
      Logger.error(message)
    }

    // Handle network errors
    if (!error.response) {
      Logger.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

// Export individual API services
export * from './droplets'
export * from './analytics'
export * from './settings'
