import React, { useState, useEffect } from 'react'
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { tokenService } from '../../services/tokenService'
import { secureTokenService } from '../../services/secureTokenService'
import { maskToken } from '../../utils/tokenUtils'

interface UserToken {
  name: string
  token: string
  added_at: string
  last_used?: string
  is_valid: boolean
}

interface TokenManagerProps {
  onTokensChange?: (tokens: string[]) => void
}



const TokenManager: React.FC<TokenManagerProps> = ({ onTokensChange }) => {
  const { user } = useAuth()
  const [userTokens, setUserTokens] = useState<UserToken[]>([])
  const [newToken, setNewToken] = useState('')
  const [newTokenName, setNewTokenName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [spacesStatus, setSpacesStatus] = useState<any>(null)

  // Load user tokens from backend on component mount
  useEffect(() => {
    loadUserTokens()
    loadSpacesStatus()
  }, [])

  const loadSpacesStatus = async () => {
    try {
      const response = await api.get('/api/v1/spaces/credentials/status')
      setSpacesStatus(response.data)
    } catch (error) {
      console.error('Failed to load Spaces status:', error)
    }
  }

  // Update token service when tokens change
  useEffect(() => {
    if (userTokens.length > 0) {
      tokenService.setTokens(userTokens)
    }
  }, [userTokens])

  const loadUserTokens = async () => {
    try {
      setIsLoading(true)
      setMessage('')

      // Add cache-busting parameter to prevent caching
      const timestamp = Date.now()
      const response = await api.get(`/api/v1/settings/tokens/secure?t=${timestamp}`)

      if (response.data.tokens) {
        // Transform secure tokens to frontend format
        const transformedTokens: UserToken[] = response.data.tokens.map((tokenData: any, index: number) => ({
          name: tokenData.name || `Account ${index + 1}`,
          token: '***ENCRYPTED***', // Don't expose actual token in frontend
          added_at: tokenData.created_at || new Date().toISOString(),
          is_valid: tokenData.is_valid !== false,
          fingerprint: tokenData.fingerprint,
          usage_count: tokenData.usage_count || 0,
          last_used: tokenData.last_used
        }))

        setUserTokens(transformedTokens)

        // Show status message
        const validCount = transformedTokens.filter(t => t.is_valid).length
        const totalCount = transformedTokens.length
        if (totalCount > 0) {
          setMessage(`✅ Đã tải ${totalCount} tokens (${validCount} hợp lệ)`)

          // Auto-reload backend clients when tokens are loaded successfully
          try {
            await api.post('/api/v1/settings/tokens/reload')
          } catch (reloadError) {
            console.warn('⚠️ Failed to reload backend clients:', reloadError)
          }
        } else {
          setMessage('ℹ️ Chưa có tokens nào được cấu hình')
        }
      } else {
        setUserTokens([])
        setMessage('ℹ️ Chưa có tokens nào được cấu hình')
      }
    } catch (error) {
      console.error('❌ Failed to load tokens from backend:', error)
      setMessage('❌ Không thể tải tokens từ backend')
    } finally {
      setIsLoading(false)
    }
  }

  const addToken = async () => {
    if (!user?.id) {
      setMessage('❌ Please login to add tokens')
      return
    }

    if (!newToken.trim() || !newTokenName.trim()) {
      setMessage('❌ Please enter both token and name')
      return
    }

    // Validate token format using secure service
    try {
      const validation = secureTokenService.validateDOTokenFormat(newToken.trim())
      if (!validation.valid) {
        setMessage(`❌ ${validation.error}`)
        return
      }
    } catch (validationError) {
      console.error('❌ Token validation error:', validationError)
      setMessage('❌ Failed to validate token format')
      return
    }

    try {
      setIsSyncing(true)
      setMessage('✅ Adding token...')

      // Get current tokens from secure endpoint
      const currentResponse = await api.get('/api/v1/settings/tokens/secure')
      const currentTokens = currentResponse.data.tokens || []

      // Check if token already exists (by fingerprint or other means)
      // Note: We can't directly compare tokens since they're encrypted
      // The backend will handle duplicate detection

      // Prepare token for secure transmission (backend will handle encryption)
      try {
        const tokenData = {
          encrypted_token: newToken.trim(), // Send plain text, backend will encrypt
          name: newTokenName.trim(),
          client_encrypted: false
        }

        const response = await api.post('/api/v1/settings/tokens/secure', {
          encrypted_tokens: [tokenData]
        })

      if (response.status === 200) {
        setMessage(`✅ Token "${newTokenName}" added successfully!`)

        // Auto-setup Spaces credentials
        try {
          setMessage('🔄 Auto-setting up Spaces credentials...')
          const spacesResponse = await api.post('/api/v1/spaces/auto-setup', {
            token: newToken.trim()
          })

          if (spacesResponse.data?.success) {
            setMessage(`✅ Token "${newTokenName}" added and Spaces credentials auto-configured!`)
            // Reload Spaces status
            await loadSpacesStatus()
          } else {
            setMessage(`✅ Token "${newTokenName}" added, but Spaces auto-setup failed. You can configure manually.`)
            console.warn('Spaces auto-setup failed:', spacesResponse.data?.error)
          }
        } catch (spacesError) {
          console.warn('Spaces auto-setup error:', spacesError)
          setMessage(`✅ Token "${newTokenName}" added, but Spaces auto-setup failed. You can configure manually.`)
        }

        setNewToken('')
        setNewTokenName('')
        // Reload tokens
        await loadUserTokens()

        // Auto-reload backend clients after adding token
        try {
          await api.post('/api/v1/settings/tokens/reload')
        } catch (reloadError) {
          console.warn('⚠️ Failed to reload backend clients:', reloadError)
        }

        // Notify parent component
        if (onTokensChange) {
          // For backward compatibility, pass token list
          const tokenList = [...currentTokens.map((t: any) => t.token), newToken.trim()]
          onTokensChange(tokenList)
        }
      } else {
        setMessage(`❌ Failed to add encrypted token`)
      }
      } catch (encryptError) {
        console.error('❌ Token encryption failed:', encryptError)
        setMessage('❌ Token encryption failed')
      }
    } catch (error) {
      console.error('❌ Failed to add token:', error)
      setMessage('❌ Failed to add token')
    } finally {
      setIsSyncing(false)
    }
  }

  const removeToken = async (tokenToRemove: string) => {
    if (!user?.id) {
      setMessage('❌ Please login to remove tokens')
      return
    }

    try {
      setIsSyncing(true)
      setMessage('✅ Removing token...')

      // Find token by fingerprint in current userTokens
      const tokenToDelete = userTokens.find((t: any) =>
        t.fingerprint || t.token === tokenToRemove
      )

      if (!tokenToDelete || !tokenToDelete.fingerprint) {
        setMessage('❌ Token fingerprint not found')
        await loadUserTokens() // Refresh UI
        return
      }

      // Make DELETE request with fingerprint
      const response = await api.delete(`/api/v1/settings/tokens/secure/${tokenToDelete.fingerprint}`)

      if (response.data?.success === true) {
        setMessage('✅ Token removed successfully!')
        // Reload tokens to get fresh data
        await loadUserTokens()

        // Auto-reload backend clients after removing token
        try {
          await api.post('/api/v1/settings/tokens/reload')
        } catch (reloadError) {
          console.warn('⚠️ Failed to reload backend clients:', reloadError)
        }

        // Notify parent component
        if (onTokensChange) {
          const updatedTokens = userTokens.filter((t: any) => t.fingerprint !== tokenToDelete.fingerprint)
          onTokensChange(updatedTokens.map((t: any) => t.token))
        }
      } else {
        const errorMsg = response.data?.error || response.data?.message || 'Unknown error'
        setMessage(`❌ Failed to remove token: ${errorMsg}`)
      }
    } catch (error: any) {
      console.error('❌ Failed to remove token:', error)
      setMessage(`❌ Failed to remove token: ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addToken()
    }
  }

  if (!user?.id) {
    return (
      <div className="text-center py-8">
        <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please login to manage DigitalOcean tokens</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quản lý DigitalOcean Tokens
          </h3>
          {/* Spaces Status */}
          {spacesStatus && (
            <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-md text-xs ${spacesStatus.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${spacesStatus.configured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              Spaces: {spacesStatus.configured ? 'Configured' : 'Not Configured'}
            </div>
          )}
        </div>
        <button
          onClick={loadUserTokens}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.includes('✅')
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message}
        </div>
      )}

      {/* Add new token */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token name (e.g., 'Main Account', 'Dev Account')..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter DigitalOcean API token (dop_v1_...)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={addToken}
            disabled={!newToken.trim() || !newTokenName.trim() || isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Token
          </button>
        </div>
      </div>

      {/* Token list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Tokens ({userTokens.length})
          </h4>
          <button
            onClick={loadUserTokens}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {userTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <KeyIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No DigitalOcean tokens configured</p>
            <p className="text-sm">Add a token to start managing your droplets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userTokens.map((tokenData, index) => {
              const isValid = tokenData.is_valid

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {isValid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{tokenData.name}</p>
                      <p className="font-mono text-xs text-gray-600">
                        {maskToken(tokenData.token)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isValid ? '✅ Valid token' : '❌ Invalid token'}
                        {tokenData.last_used && ` • Last used: ${new Date(tokenData.last_used).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeToken(tokenData.token)}
                    disabled={isSyncing}
                    className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isSyncing && (
        <div className="flex items-center justify-center py-4">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-600">Đang đồng bộ với backend...</span>
        </div>
      )}
    </div>
  )
}

export default TokenManager 