import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  ShieldCheckIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import { twoFactorApi } from '../../services/twoFactorApi'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

interface TwoFactorVerificationProps {
  onVerifySuccess: (token: string) => void
  onBackToLogin: () => void
  tempToken: string
  userEmail?: string
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  onVerifySuccess,
  onBackToLogin,
  tempToken,
  userEmail
}) => {
  const { isDark } = useTheme()
  const [verificationCode, setVerificationCode] = useState('')
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false)

  const verifyMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.verify(code, tempToken),
    onSuccess: (data) => {
      toast.success('Authentication successful!')
      onVerifySuccess(data.access_token)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message
      toast.error(`Verification failed: ${errorMessage}`)
      
      // Clear the code on error
      setVerificationCode('')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      toast.error('Please enter a verification code')
      return
    }
    verifyMutation.mutate(verificationCode.trim())
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (isUsingBackupCode) {
      // Backup codes are alphanumeric, allow letters and numbers
      setVerificationCode(value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
    } else {
      // Regular TOTP codes are numeric only, 6 digits
      setVerificationCode(value.replace(/\D/g, '').slice(0, 6))
    }
  }

  const toggleCodeType = () => {
    setIsUsingBackupCode(!isUsingBackupCode)
    setVerificationCode('')
  }

  const maxLength = isUsingBackupCode ? 8 : 6
  const placeholder = isUsingBackupCode ? 'abc123de' : '123456'
  const isCodeComplete = verificationCode.length === maxLength

  return (
    <div className={`max-w-md mx-auto p-6 rounded-lg shadow-lg ${
      isDark ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="text-center mb-6">
        <ShieldCheckIcon className={`mx-auto h-12 w-12 mb-4 ${
          isDark ? 'text-blue-400' : 'text-blue-600'
        }`} />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Two-Factor Authentication
        </h2>
        {userEmail && (
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Verify access for {userEmail}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {isUsingBackupCode ? 'Backup Code' : 'Verification Code'}
          </label>
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isUsingBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
          <input
            type="text"
            value={verificationCode}
            onChange={handleCodeChange}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            maxLength={maxLength}
            autoComplete="off"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={verifyMutation.isLoading || !isCodeComplete}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {verifyMutation.isLoading ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>

        <div className="space-y-3">
          <button
            type="button"
            onClick={toggleCodeType}
            className={`w-full text-sm underline transition-colors ${
              isDark 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-blue-600 hover:text-blue-500'
            }`}
          >
            {isUsingBackupCode 
              ? 'Use authenticator app instead' 
              : 'Use backup code instead'
            }
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className={`w-full text-sm transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-gray-300' 
                : 'text-gray-600 hover:text-gray-500'
            }`}
          >
            ← Back to login
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className={`mt-6 p-4 rounded-lg border ${
        isDark 
          ? 'bg-gray-700 border-gray-600' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <ExclamationCircleIcon className={`h-5 w-5 mt-0.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="font-medium mb-1">Having trouble?</p>
            <ul className="space-y-1 text-xs">
              <li>• Make sure your device's time is synchronized</li>
              <li>• Check if the code is still valid (codes expire every 30 seconds)</li>
              <li>• Use a backup code if your device is unavailable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorVerification
