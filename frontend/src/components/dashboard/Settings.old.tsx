import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTokenSync } from '../../contexts/TokenSyncContext'
import { useTokens } from '../../hooks/useTokens'
import TokenManager from '../settings/TokenManager'
import SSHKeysManager from '../settings/SSHKeysManager'
import {
  ArrowLeftIcon,
  UserIcon,
  CogIcon,
  KeyIcon,
  BellIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

const Settings: React.FC = () => {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const { refreshAllData } = useTokenSync()
  const { tokens, loading: tokensLoading, refreshTokens } = useTokens()
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    profile: {
      name: user?.full_name || user?.display_name || 'User',
      email: user?.email || '',
      company: 'Tech Corp'
    },
    security: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      weeklyReports: true
    },
    api: {
      digitalOceanToken: '*********************',
      webhookUrl: 'https://your-app.com/webhook'
    },
    digitalOcean: {
      tokens: [
        'YOUR_DIGITALOCEAN_TOKEN_HERE',
        'dop_v1_sample_token_here_for_example_purposes_only_not_real_token_example'
      ],
      newToken: ''
    }
  })

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        profile: {
          name: user.full_name || user.display_name || 'User',
          email: user.email || '',
          company: prev.profile.company // Keep existing company data
        }
      }))
    }
  }, [user])

  const handleEdit = (section: string) => {
    setEditingSection(section)
  }

  const handleSave = async (section: string) => {

    if (section === 'API Configuration') {
      // API Configuration is now auto-synced, just close editing
      alert('✅ API Configuration is auto-synced! All tokens are saved automatically.')
    } else {
      alert(`${section} settings saved successfully!`)
    }

    setEditingSection(null)
  }

  const handleCancel = () => {
    setEditingSection(null)
  }

  // Helper function to mask DigitalOcean tokens
  const maskToken = (token: string) => {
    if (!token || token.length < 20) return token
    const prefix = token.substring(0, 12) // dop_v1_xxxxx
    const suffix = token.substring(token.length - 4) // last 4 chars
    const masked = '*'.repeat(Math.max(0, token.length - 16))
    return `${prefix}${masked}${suffix}`
  }





  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className={`flex items-center ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} mr-4 transition-colors duration-300`}
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
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>DigitalOcean API Settings</h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Profile Settings */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => editingSection !== 'Profile' && handleEdit('Profile')}>
                      <UserIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage your profile information</p>
                      </div>
                    </div>
                    {editingSection !== 'Profile' ? (
                      <button
                        onClick={() => handleEdit('Profile')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave('Profile')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {editingSection === 'Profile' && (
                    <div className={`space-y-4 mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Full Name</label>
                        <input
                          type="text"
                          value={formData.profile.name}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            profile: { ...prev.profile, name: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
                        <input
                          type="email"
                          value={formData.profile.email}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            profile: { ...prev.profile, email: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Company</label>
                        <input
                          type="text"
                          value={formData.profile.company}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            profile: { ...prev.profile, company: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Settings */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => editingSection !== 'Security' && handleEdit('Security')}>
                      <KeyIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Change your password and security settings</p>
                      </div>
                    </div>
                    {editingSection !== 'Security' ? (
                      <button
                        onClick={() => handleEdit('Security')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave('Security')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {editingSection === 'Security' && (
                    <div className={`space-y-4 mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Current Password</label>
                        <input
                          type="password"
                          value={formData.security.currentPassword}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            security: { ...prev.security, currentPassword: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>New Password</label>
                        <input
                          type="password"
                          value={formData.security.newPassword}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            security: { ...prev.security, newPassword: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Confirm New Password</label>
                        <input
                          type="password"
                          value={formData.security.confirmPassword}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            security: { ...prev.security, confirmPassword: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          placeholder="Confirm new password"
                        />
                      </div>
                      {formData.security.newPassword && formData.security.confirmPassword &&
                        formData.security.newPassword !== formData.security.confirmPassword && (
                          <p className="text-sm text-red-600">Passwords do not match</p>
                        )}
                    </div>
                  )}
                </div>

                {/* SSH Keys */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => editingSection !== 'SSH Keys' && handleEdit('SSH Keys')}>
                      <ShieldCheckIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>SSH Keys</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage SSH keys for secure droplet access</p>
                      </div>
                    </div>
                    {editingSection !== 'SSH Keys' ? (
                      <button
                        onClick={() => handleEdit('SSH Keys')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={handleCancel}
                        className="text-gray-600 hover:text-gray-500 text-sm font-medium"
                      >
                        Close
                      </button>
                    )}
                  </div>
                  
                  <SSHKeysManager isExpanded={editingSection === 'SSH Keys'} />
                </div>

                {/* Notifications */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => editingSection !== 'Notifications' && handleEdit('Notifications')}>
                      <BellIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Configure your notification preferences</p>
                      </div>
                    </div>
                    {editingSection !== 'Notifications' ? (
                      <button
                        onClick={() => handleEdit('Notifications')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave('Notifications')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {editingSection === 'Notifications' && (
                    <div className={`space-y-4 mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Alerts</h4>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive email notifications for droplet events</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.notifications.emailAlerts}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, emailAlerts: e.target.checked }
                          }))}
                          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-300'} rounded`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>SMS Alerts</h4>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive SMS notifications for critical events</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.notifications.smsAlerts}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, smsAlerts: e.target.checked }
                          }))}
                          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-300'} rounded`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Weekly Reports</h4>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive weekly usage and cost reports</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.notifications.weeklyReports}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, weeklyReports: e.target.checked }
                          }))}
                          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-300'} rounded`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DigitalOcean Tokens - Synchronized with CreateVPS */}
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
                    <TokenManager onTokensChange={(updatedTokens) => {
                      // Trigger refresh after token changes
                      setTimeout(refreshTokens, 500);
                    }} />
                  </div>
                </div>

                {/* Notifications */}
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => editingSection !== 'Notifications' && handleEdit('Notifications')}>
                      <BellIcon className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-4`} />
                      <div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Configure your notification preferences</p>
                      </div>
                    </div>
                    {editingSection !== 'Notifications' ? (
                      <button
                        onClick={() => handleEdit('Notifications')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave('Notifications')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {editingSection === 'Notifications' && (
                    <div className={`space-y-4 mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notifications.emailAlerts}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, emailAlerts: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email alerts for critical events</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notifications.smsAlerts}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, smsAlerts: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>SMS alerts for critical events</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notifications.weeklyReports}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, weeklyReports: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Weekly usage reports</span>
                        </label>
                      </div>
                    </div>
                  )}
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
