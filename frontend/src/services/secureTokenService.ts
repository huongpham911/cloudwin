/**
 * Enhanced Secure Token Service - Multi-layer security for token handling
 * Replaces localStorage with encrypted, secure token management
 * Compatible with backend enhanced_token_service.py
 */

import CryptoJS from 'crypto-js'
import Logger from '../utils/logger'

interface SecureToken {
  value: string
  expires: number
  fingerprint: string
  created: number
  encrypted: boolean
}

interface TokenMetadata {
  lastUsed: number
  usageCount: number
  deviceFingerprint: string
}

interface DOTokenData {
  token: string
  name: string
  fingerprint: string
  encrypted: boolean
}

class SecureTokenService {
  private static instance: SecureTokenService
  private encryptionKey: string
  private tokenStore: Map<string, SecureToken> = new Map()
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private readonly STORAGE_KEY = 'wc_secure_tokens'

  private constructor() {
    this.encryptionKey = this.generateEncryptionKey()
    this.loadTokensFromStorage()
    this.setupCleanupInterval()
  }

  public static getInstance(): SecureTokenService {
    if (!SecureTokenService.instance) {
      SecureTokenService.instance = new SecureTokenService()
    }
    return SecureTokenService.instance
  }

  /**
   * Generate device-specific encryption key
   */
  private generateEncryptionKey(): string {
    // Use device fingerprint + sessionStorage for key generation
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: (navigator as any).deviceMemory || 'unknown',
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    }

    const fingerprint = btoa(JSON.stringify(deviceInfo))

    // Get or create session key
    let sessionKey = sessionStorage.getItem('wc_session_key')
    if (!sessionKey) {
      sessionKey = this.generateRandomKey()
      sessionStorage.setItem('wc_session_key', sessionKey)
    }

    // Combine for final key
    return CryptoJS.SHA256(fingerprint + sessionKey).toString()
  }

  /**
   * Generate cryptographically secure random key
   */
  private generateRandomKey(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Encrypt token with AES
   */
  private encryptToken(token: string): string {
    const encrypted = CryptoJS.AES.encrypt(token, this.encryptionKey).toString()
    return encrypted
  }

  /**
   * Decrypt token
   */
  private decryptToken(encryptedToken: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey)
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      Logger.error('Token decryption failed', error)
      return ''
    }
  }

  /**
   * Store JWT token securely
   */
  public storeToken(token: string, type: 'access' | 'refresh' = 'access'): void {
    try {
      const now = Date.now()
      const secureToken: SecureToken = {
        value: this.encryptToken(token),
        expires: now + this.TOKEN_EXPIRY,
        fingerprint: this.generateTokenFingerprint(token),
        created: now,
        encrypted: true
      }

      this.tokenStore.set(type, secureToken)
      this.saveTokensToStorage()
      Logger.success(`Securely stored ${type} token`)
    } catch (error) {
      Logger.error('Failed to store token', error)
    }
  }

  /**
   * Encrypt DigitalOcean token before sending to backend
   */
  public encryptDOToken(token: string, userKey?: string): string {
    try {
      const key = userKey || this.encryptionKey
      const encrypted = CryptoJS.AES.encrypt(token, key).toString()
      Logger.debug('DO token encrypted for transmission')
      return encrypted
    } catch (error) {
      Logger.error('Failed to encrypt DO token', error)
      return token // Fallback to plain text (not recommended)
    }
  }

  /**
   * Decrypt DigitalOcean token received from backend
   */
  public decryptDOToken(encryptedToken: string, userKey?: string): string {
    try {
      const key = userKey || this.encryptionKey
      const decrypted = CryptoJS.AES.decrypt(encryptedToken, key)
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      Logger.error('Failed to decrypt DO token', error)
      return ''
    }
  }

  /**
   * Retrieve JWT token
   */
  public getToken(type: 'access' | 'refresh' = 'access'): string | null {
    try {
      const secureToken = this.tokenStore.get(type)

      if (!secureToken) {
        return null
      }

      // Check expiration
      if (Date.now() > secureToken.expires) {
        this.removeToken(type)
        Logger.warn('Token expired and removed')
        return null
      }

      const decryptedToken = this.decryptToken(secureToken.value)

      if (!decryptedToken) {
        this.removeToken(type)
        Logger.warn('Failed to decrypt token - removed')
        return null
      }

      // Update usage metadata
      this.updateTokenUsage(type)

      return decryptedToken
    } catch (error) {
      Logger.error('Failed to retrieve token', error)
      return null
    }
  }

  /**
   * Remove token
   */
  public removeToken(type: 'access' | 'refresh' = 'access'): void {
    this.tokenStore.delete(type)
    this.saveTokensToStorage()
  }

  /**
   * Clear all tokens
   */
  public clearAllTokens(): void {
    this.tokenStore.clear()
    this.saveTokensToStorage()
    sessionStorage.removeItem('wc_session_key')
  }

  /**
   * Check if token exists and is valid
   */
  public hasValidToken(type: 'access' | 'refresh' = 'access'): boolean {
    const token = this.getToken(type)
    return token !== null && token.length > 0
  }

  /**
   * Generate token fingerprint for validation
   */
  private generateTokenFingerprint(token: string): string {
    return CryptoJS.SHA256(token).toString().substring(0, 16)
  }

  /**
   * Validate token integrity
   */
  public validateTokenIntegrity(type: 'access' | 'refresh' = 'access'): boolean {
    try {
      const secureToken = this.tokenStore.get(type)
      if (!secureToken) return false

      const decryptedToken = this.decryptToken(secureToken.value)
      if (!decryptedToken) return false

      const currentFingerprint = this.generateTokenFingerprint(decryptedToken)
      return currentFingerprint === secureToken.fingerprint
    } catch {
      return false
    }
  }

  /**
   * Get secure headers for API requests
   */
  public getSecureHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff',
      'X-Device-Fingerprint': this.generateDeviceFingerprint()
    }

    const token = this.getToken('access')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Device fingerprint', 2, 2)
    }

    const fingerprint = {
      canvas: canvas.toDataURL(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timestamp: Date.now()
    }

    return CryptoJS.SHA256(JSON.stringify(fingerprint)).toString().substring(0, 32)
  }

  /**
   * Save tokens to encrypted localStorage
   */
  private saveTokensToStorage(): void {
    try {
      const tokenData = Object.fromEntries(this.tokenStore)
      const encryptedData = this.encryptToken(JSON.stringify(tokenData))
      localStorage.setItem(this.STORAGE_KEY, encryptedData)
    } catch (error) {
      Logger.error('Failed to save tokens to storage', error)
    }
  }

  /**
   * Load tokens from encrypted localStorage
   */
  private loadTokensFromStorage(): void {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEY)
      if (!encryptedData) return

      const decryptedData = this.decryptToken(encryptedData)
      if (!decryptedData) {
        localStorage.removeItem(this.STORAGE_KEY)
        return
      }

      const tokenData = JSON.parse(decryptedData)
      this.tokenStore = new Map(Object.entries(tokenData))

      // Validate loaded tokens
      this.validateAndCleanTokens()
    } catch (error) {
      Logger.error('Failed to load tokens from storage', error)
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Validate and clean expired/invalid tokens
   */
  private validateAndCleanTokens(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, token] of this.tokenStore) {
      // Check expiration
      if (now > token.expires) {
        keysToRemove.push(key)
        continue
      }

      // Check integrity
      if (!this.validateTokenIntegrity(key as 'access' | 'refresh')) {
        keysToRemove.push(key)
      }
    }

    // Remove invalid tokens
    keysToRemove.forEach(key => this.tokenStore.delete(key))

    if (keysToRemove.length > 0) {
      this.saveTokensToStorage()
    }
  }

  /**
   * Update token usage metadata
   */
  private updateTokenUsage(_type: string): void {
    // Could be expanded to track usage patterns
  }

  /**
   * Setup automatic cleanup of expired tokens
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.validateAndCleanTokens()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Security audit - check for potential issues
   */
  public performSecurityAudit(): {
    secure: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Connection is not HTTPS')
      recommendations.push('Use HTTPS for secure token transmission')
    }

    // Check localStorage security
    if (localStorage.length > 50) {
      recommendations.push('Consider clearing unused localStorage data')
    }

    // Check token expiration times
    for (const [type, token] of this.tokenStore) {
      const timeLeft = token.expires - Date.now()
      if (timeLeft < 60000) { // Less than 1 minute
        issues.push(`${type} token expires soon`)
        recommendations.push(`Refresh ${type} token`)
      }
    }

    return {
      secure: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Emergency security wipe
   */
  public emergencyWipe(): void {
    try {
      // Clear all tokens
      this.clearAllTokens()

      // Clear all localStorage/sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Clear cookies (best effort)
      document.cookie.split(";").forEach(c => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })

      Logger.warn('Emergency security wipe completed')
    } catch (error) {
      Logger.error('Emergency wipe failed', error)
    }
  }

  /**
   * Prepare token data for secure transmission to backend
   */
  public prepareTokenForTransmission(token: string, tokenName: string): {
    encrypted_token: string
    fingerprint: string
    name: string
    client_encrypted: boolean
  } {
    try {
      const encrypted = this.encryptDOToken(token)
      const fingerprint = this.generateTokenFingerprint(token)

      return {
        encrypted_token: encrypted,
        fingerprint: fingerprint,
        name: tokenName,
        client_encrypted: true
      }
    } catch (error) {
      Logger.error('Failed to prepare token for transmission', error)
      throw error
    }
  }

  /**
   * Validate token format before processing
   */
  public validateDOTokenFormat(token: string): { valid: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required' }
    }

    if (!token.startsWith('dop_v1_')) {
      return { valid: false, error: 'Invalid DigitalOcean token format' }
    }

    if (token.length !== 71) {
      return { valid: false, error: 'Invalid DigitalOcean token length' }
    }

    // Check for valid hex characters after prefix
    const tokenBody = token.substring(7) // Remove 'dop_v1_'
    if (!/^[a-f0-9]{64}$/.test(tokenBody)) {
      return { valid: false, error: 'Invalid token characters' }
    }

    return { valid: true }
  }
}

// Export singleton instance
export const secureTokenService = SecureTokenService.getInstance()

// Legacy compatibility - gradually migrate from these
export const storeToken = (token: string) => secureTokenService.storeToken(token, 'access')
export const getToken = () => secureTokenService.getToken('access')
export const removeToken = () => secureTokenService.removeToken('access')
export const clearTokens = () => secureTokenService.clearAllTokens()

export default secureTokenService
