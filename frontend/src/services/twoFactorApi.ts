import { api } from './api'

export interface TwoFactorSetupResponse {
  secret: string
  qr_code: string
  backup_codes: string[]
}

export interface TwoFactorStatusResponse {
  enabled: boolean
  backup_codes_remaining: number
}

export interface TwoFactorVerifyResponse {
  verified: boolean
  backup_code_used: boolean
}

export const twoFactorApi = {
  // Setup 2FA
  async setup(): Promise<TwoFactorSetupResponse> {
    const response = await api.post('/api/v1/auth/2fa/setup')
    return response.data
  },

  // Verify setup with code
  async verifySetup(code: string): Promise<{ message: string }> {
    const response = await api.post('/api/v1/auth/2fa/verify-setup', { code })
    return response.data
  },

  // Verify 2FA code during login
  async verify(userId: string, code: string): Promise<TwoFactorVerifyResponse> {
    const response = await api.post('/api/v1/auth/2fa/verify', { user_id: userId, code })
    return response.data
  },

  // Disable 2FA
  async disable(code: string): Promise<{ message: string }> {
    const response = await api.post('/api/v1/auth/2fa/disable', { code })
    return response.data
  },

  // Get 2FA status
  async getStatus(): Promise<TwoFactorStatusResponse> {
    const response = await api.get('/api/v1/auth/2fa/status')
    return response.data
  },

  // Regenerate backup codes
  async regenerateBackupCodes(code: string): Promise<{ message: string; backup_codes: string[] }> {
    const response = await api.post('/api/v1/auth/2fa/regenerate-backup-codes', { code })
    return response.data
  }
}
