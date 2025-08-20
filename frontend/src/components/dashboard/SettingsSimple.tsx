import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useTokenSync } from '../../contexts/TokenSyncContext'
import { useTokens } from '../../hooks/useTokens'
import TokenManager from '../settings/TokenManager'
import {
  ArrowLeftIcon,
  KeyIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const Settings: React.FC = () => {
  const { isDark } = useTheme()
  const { refreshAllData } = useTokenSync()
  const { tokens, loading: tokensLoading, refreshTokens } = useTokens()

  const handleRefreshAll = async () => {
    try {
      await refreshAllData()
      await refreshTokens()
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b transition-colors duration-300`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                } transition-colors duration-200`}
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* DigitalOcean API Settings */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>DigitalOcean API Settings</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Manage your DigitalOcean API tokens for VPS creation and management
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* DigitalOcean Tokens */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center flex-1">
                      <KeyIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>DigitalOcean Tokens</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Manage API tokens - automatically synced with Create VPS page
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                          📊 {tokens.length} tokens configured, {tokens.filter(t => t.status === 'valid').length} active
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={refreshTokens}
                      disabled={tokensLoading}
                      className={`flex items-center px-3 py-1 text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} disabled:opacity-50`}
                    >
                      <ArrowPathIcon className={`h-4 w-4 mr-1 ${tokensLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Token Manager Component */}
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <TokenManager />
                  </div>
                </div>

                {/* Global Refresh Action */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Sync Data</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Refresh all tokens and account data across the application
                      </p>
                    </div>
                    <button
                      onClick={handleRefreshAll}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors duration-200"
                    >
                      Refresh All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
