import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ShieldCheckIcon, 
  QrCodeIcon, 
  KeyIcon, 
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { twoFactorApi, TwoFactorSetupResponse } from '../../services/twoFactorApi'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

interface TwoFactorSetupProps {
  onSetupComplete?: () => void
  onCancel?: () => void
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onSetupComplete, onCancel }) => {
  const { isDark } = useTheme()
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)
  const queryClient = useQueryClient()

  const setupMutation = useMutation({
    mutationFn: twoFactorApi.setup,
    onSuccess: (data) => {
      setSetupData(data)
      setStep('verify')
      toast.success('QR Code generated. Scan with your authenticator app.')
    },
    onError: (error: any) => {
      toast.error(`Setup failed: ${error.response?.data?.detail || error.message}`)
    }
  })

  const verifyMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.verifySetup(code),
    onSuccess: () => {
      toast.success('2FA enabled successfully!')
      queryClient.invalidateQueries(['twoFactorStatus'])
      onSetupComplete?.()
    },
    onError: (error: any) => {
      toast.error(`Verification failed: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleSetup = () => {
    setupMutation.mutate()
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }
    verifyMutation.mutate(verificationCode.trim())
  }

  const copyBackupCodes = () => {
    if (setupData?.backup_codes) {
      const codesText = setupData.backup_codes.join('\n')
      navigator.clipboard.writeText(codesText)
      setBackupCodesCopied(true)
      toast.success('Backup codes copied to clipboard')
    }
  }

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      toast.success('Secret key copied to clipboard')
    }
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 rounded-lg shadow-lg ${
      isDark ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="text-center mb-6">
        <ShieldCheckIcon className={`mx-auto h-12 w-12 mb-4 ${
          isDark ? 'text-green-400' : 'text-green-600'
        }`} />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Enable Two-Factor Authentication
        </h2>
        <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Add an extra layer of security to your account
        </p>
      </div>

      {step === 'setup' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border ${
            isDark 
              ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <h3 className="font-semibold mb-2">What you'll need:</h3>
            <ul className="space-y-1 text-sm">
              <li>• A smartphone or tablet</li>
              <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>• A secure place to store backup codes</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSetup}
              disabled={setupMutation.isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {setupMutation.isLoading ? 'Generating...' : 'Start Setup'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'verify' && setupData && (
        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="text-center">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              1. Scan QR Code
            </h3>
            <div className={`inline-block p-4 rounded-lg ${
              isDark ? 'bg-white' : 'bg-gray-50'
            }`}>
              <img 
                src={setupData.qr_code} 
                alt="2FA QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Scan this QR code with your authenticator app
            </p>
          </div>

          {/* Manual Entry */}
          <div className={`p-4 rounded-lg border ${
            isDark 
              ? 'bg-gray-700 border-gray-600' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Can't scan? Enter manually:
            </h4>
            <div className="flex items-center gap-2">
              <code className={`flex-1 px-3 py-2 rounded text-sm font-mono ${
                isDark 
                  ? 'bg-gray-800 text-gray-300' 
                  : 'bg-white text-gray-700'
              }`}>
                {setupData.secret}
              </code>
              <button
                onClick={copySecret}
                className={`p-2 rounded transition-colors ${
                  isDark
                    ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-300'
                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                }`}
                title="Copy secret key"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Backup Codes */}
          <div className={`p-4 rounded-lg border ${
            isDark 
              ? 'bg-yellow-900/20 border-yellow-700' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <h4 className={`font-medium mb-2 ${
                  isDark ? 'text-yellow-400' : 'text-yellow-800'
                }`}>
                  Save these backup codes
                </h4>
                <p className={`text-sm mb-3 ${
                  isDark ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  Store these codes safely. You can use them to access your account if you lose your device.
                </p>
                <div className={`grid grid-cols-2 gap-2 p-3 rounded font-mono text-sm ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  {setupData.backup_codes.map((code, index) => (
                    <div key={index} className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {code}
                    </div>
                  ))}
                </div>
                <button
                  onClick={copyBackupCodes}
                  className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    backupCodesCopied
                      ? isDark 
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-green-100 text-green-700'
                      : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {backupCodesCopied ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Copy Codes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verification */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                2. Enter Verification Code
              </h3>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className={`w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                maxLength={6}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={verifyMutation.isLoading || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {verifyMutation.isLoading ? 'Verifying...' : 'Enable 2FA'}
              </button>
              <button
                type="button"
                onClick={() => setStep('setup')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default TwoFactorSetup
