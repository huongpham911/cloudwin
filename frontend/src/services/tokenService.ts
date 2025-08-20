import { api } from './api'

export interface DOToken {
  name: string
  token: string
  added_at: string
  last_used?: string
  is_valid: boolean
}

class TokenService {
  private static instance: TokenService
  private currentTokens: DOToken[] = []
  private activeToken: string | null = null

  private constructor() { }

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService()
    }
    return TokenService.instance
  }

  // Set DigitalOcean tokens (called from Settings/TokenManager)
  setTokens(tokens: DOToken[]) {
    this.currentTokens = tokens
    // Set first valid token as active
    const validToken = tokens.find(t => t.is_valid)
    if (validToken) {
      this.setActiveToken(validToken.token)
    }
  }

  // Set active DigitalOcean token for API calls
  setActiveToken(token: string) {
    this.activeToken = token
    // Configure API instance to use this token for DigitalOcean calls
  }

  // Get current active token
  getActiveToken(): string | null {
    return this.activeToken
  }

  // Get all tokens
  getTokens(): DOToken[] {
    return this.currentTokens
  }

  // Clear all tokens
  clearTokens() {
    this.currentTokens = []
    this.activeToken = null
  }

  // Check if we have valid tokens
  hasValidTokens(): boolean {
    return this.currentTokens.some(t => t.is_valid)
  }

  // Get API headers with DO token
  getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    // Add auth token if exists (for authentication)
    const authToken = localStorage.getItem('token')
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    // Add DO token header if exists
    if (this.activeToken) {
      headers['X-DO-Token'] = this.activeToken
    }

    return headers
  }

  // Make API call with DO token
  async makeApiCall(config: any) {
    const headers = this.getApiHeaders()
    const response = await api.request({
      ...config,
      headers: {
        ...config.headers,
        ...headers
      }
    })
    return response.data  // Return data directly
  }
}

export const tokenService = TokenService.getInstance()
