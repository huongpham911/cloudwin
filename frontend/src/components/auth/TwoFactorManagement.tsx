import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ShieldCheckIcon, 
  ShieldExclamationIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { twoFactorApi } from '../../services/twoFactorApi'
import TwoFactorSetup from './TwoFactorSetup'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

const TwoFactorManagement: React.FC = () => {
  const { isDark } = useTheme()
  const [showSetup, setShowSetup] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([])
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)
  const queryClient = useQueryClient()

  const { data: status, isLoading } = useQuery({
    queryKey: ['twoFactorStatus'],
    queryFn: twoFactorApi.getStatus
  })

  const disableMutation = useMutation({
    mutationFn: twoFactorApi.disable,
    onSuccess: () => {
      toast.success('Two-factor authentication disabled')
      setShowDisableConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] })
    },
    onError: (error: any) => {
      toast.error(`Failed to disable 2FA: ${error.response?.data?.detail || error.message}`)
    }
  })

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: twoFactorApi.regenerateBackupCodes,
    onSuccess: (data) => {
      setNewBackupCodes(data.backup_codes)
      setBackupCodesCopied(false)
      toast.success('New backup codes generated')
    },
    onError: (error: any) => {
      toast.error(`Failed to generate backup codes: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleSetupComplete = () => {
    setShowSetup(false)
    queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] })
  }

  const handleDisable = () => {
    disableMutation.mutate('')
  }

  const handleRegenerateBackupCodes = () => {
    regenerateBackupCodesMutation.mutate('')
  }

  const copyBackupCodes = () => {
    if (newBackupCodes.length > 0) {
      const codesText = newBackupCodes.join('\n')
      navigator.clipboard.writeText(codesText)
      setBackupCodesCopied(true)
      toast.success('Backup codes copied to clipboard')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (showSetup) {
    return (
      <TwoFactorSetup
        onSetupComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {status?.enabled ? (
            <ShieldCheckIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldExclamationIcon className="h-5 w-5 text-yellow-500" />
          )}
          <div>
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Two-Factor Authentication
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {status?.enabled
                ? 'Your account is protected with 2FA' 
                : 'Add an extra layer of security to your account'
              }
            </p>
          </div>
        </div>
        {!status?.enabled && (
          <button
            onClick={() => setShowSetup(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Enable 2FA
          </button>
        )}
      </div>

      {status?.enabled && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`p-4 rounded-lg border ${
            isDark 
              ? 'bg-green-900/20 border-green-700' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <div>
                <h3 className={`font-semibold ${
                  isDark ? 'text-green-400' : 'text-green-700'
                }`}>
                  Two-Factor Authentication is Active
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-green-300' : 'text-green-600'
                }`}>
                  Your account requires a verification code for login
                </p>
              </div>
            </div>
          </div>

          {/* Backup Codes Section */}
          <div className={`p-6 rounded-lg border ${
            isDark 
              ? 'bg-gray-700 border-gray-600' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <KeyIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Backup Codes
              </h3>
            </div>
            
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Backup codes can be used to access your account if you lose access to your authenticator device. 
              Each code can only be used once.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {status.backup_codes_remaining || 0} backup codes remaining
              </span>
              {(status.backup_codes_remaining || 0) <= 2 && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  isDark 
                    ? 'bg-yellow-900/30 text-yellow-400' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  Low
                </div>
              )}
            </div>

            <button
              onClick={handleRegenerateBackupCodes}
              disabled={regenerateBackupCodesMutation.isPending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50`}
            >
              {regenerateBackupCodesMutation.isPending ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4" />
                  Generate New Codes
                </>
              )}
            </button>

            {/* New Backup Codes Display */}
            {newBackupCodes.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg border ${
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
                      Your New Backup Codes
                    </h4>
                    <p className={`text-sm mb-3 ${
                      isDark ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      Save these codes immediately. Your old backup codes are no longer valid.
                    </p>
                    <div className={`grid grid-cols-2 gap-2 p-3 rounded font-mono text-sm ${
                      isDark ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      {newBackupCodes.map((code, index) => (
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
            )}
          </div>

          {/* Disable 2FA Section */}
          <div className={`p-6 rounded-lg border ${
            isDark 
              ? 'bg-red-900/20 border-red-700' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}>
              Disable Two-Factor Authentication
            </h3>
            <p className={`text-sm mb-4 ${
              isDark ? 'text-red-300' : 'text-red-600'
            }`}>
              This will remove the extra security layer from your account. 
              We recommend keeping 2FA enabled for better security.
            </p>

            {showDisableConfirm ? (
              <div className="space-y-3">
                <p className={`text-sm font-medium ${
                  isDark ? 'text-red-400' : 'text-red-700'
                }`}>
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDisable}
                    disabled={disableMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {disableMutation.isPending ? 'Disabling...' : 'Yes, Disable'}
                  </button>
                  <button
                    onClick={() => setShowDisableConfirm(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDisableConfirm(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <TrashIcon className="h-4 w-4" />
                Disable 2FA
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TwoFactorManagement
