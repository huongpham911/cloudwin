import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { api } from '../../services/api'

interface SystemConfig {
  maintenanceMode: boolean
  allowRegistration: boolean
  maxUsersPerAccount: number
  sessionTimeout: number
  defaultDropletLimit: number
  emailNotifications: boolean
  autoBackup: boolean
  backupRetentionDays: number
}

interface AdminSettings {
  systemConfig: SystemConfig
  apiLimits: {
    requestsPerMinute: number
    requestsPerHour: number
    maxConcurrentRequests: number
  }
  security: {
    passwordMinLength: number
    requireTwoFactor: boolean
    sessionDuration: number
    maxLoginAttempts: number
  }
}

const AdminSettings: React.FC = () => {
  const { isDark } = useTheme()
  const [settings, setSettings] = useState<AdminSettings>({
    systemConfig: {
      maintenanceMode: false,
      allowRegistration: true,
      maxUsersPerAccount: 100,
      sessionTimeout: 30,
      defaultDropletLimit: 10,
      emailNotifications: true,
      autoBackup: true,
      backupRetentionDays: 30
    },
    apiLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      maxConcurrentRequests: 10
    },
    security: {
      passwordMinLength: 8,
      requireTwoFactor: false,
      sessionDuration: 24,
      maxLoginAttempts: 5
    }
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('system')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Mock loading settings - in real app would fetch from API
      setLoading(false)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Mock saving settings - in real app would send to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Cài đặt đã được lưu thành công!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Lỗi khi lưu cài đặt!')
    } finally {
      setSaving(false)
    }
  }

  const updateSystemConfig = (key: keyof SystemConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      systemConfig: {
        ...prev.systemConfig,
        [key]: value
      }
    }))
  }

  const updateApiLimits = (key: keyof AdminSettings['apiLimits'], value: number) => {
    setSettings(prev => ({
      ...prev,
      apiLimits: {
        ...prev.apiLimits,
        [key]: value
      }
    }))
  }

  const updateSecurity = (key: keyof AdminSettings['security'], value: any) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải cài đặt...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'system', name: 'Hệ thống', icon: '⚙️' },
    { id: 'api', name: 'API Limits', icon: '🔗' },
    { id: 'security', name: 'Bảo mật', icon: '🔒' },
    { id: 'backup', name: 'Sao lưu', icon: '💾' }
  ]

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Cài đặt Hệ thống
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Quản lý cấu hình và cài đặt hệ thống WinCloud Builder
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cài đặt Hệ thống
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Maintenance Mode */}
                <div className="space-y-2">
                  <label className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={settings.systemConfig.maintenanceMode}
                      onChange={(e) => updateSystemConfig('maintenanceMode', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    Chế độ bảo trì
                  </label>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Khi bật, chỉ admin mới có thể truy cập hệ thống
                  </p>
                </div>

                {/* Allow Registration */}
                <div className="space-y-2">
                  <label className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={settings.systemConfig.allowRegistration}
                      onChange={(e) => updateSystemConfig('allowRegistration', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    Cho phép đăng ký
                  </label>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Người dùng mới có thể tự đăng ký tài khoản
                  </p>
                </div>

                {/* Max Users */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Số user tối đa mỗi tài khoản
                  </label>
                  <input
                    type="number"
                    value={settings.systemConfig.maxUsersPerAccount}
                    onChange={(e) => updateSystemConfig('maxUsersPerAccount', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Session Timeout */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Timeout phiên làm việc (phút)
                  </label>
                  <input
                    type="number"
                    value={settings.systemConfig.sessionTimeout}
                    onChange={(e) => updateSystemConfig('sessionTimeout', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Default Droplet Limit */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Giới hạn VPS mặc định
                  </label>
                  <input
                    type="number"
                    value={settings.systemConfig.defaultDropletLimit}
                    onChange={(e) => updateSystemConfig('defaultDropletLimit', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Email Notifications */}
                <div className="space-y-2">
                  <label className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={settings.systemConfig.emailNotifications}
                      onChange={(e) => updateSystemConfig('emailNotifications', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    Thông báo email
                  </label>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Gửi email thông báo về các hoạt động quan trọng
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Limits Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Giới hạn API
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Requests/phút
                  </label>
                  <input
                    type="number"
                    value={settings.apiLimits.requestsPerMinute}
                    onChange={(e) => updateApiLimits('requestsPerMinute', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Requests/giờ
                  </label>
                  <input
                    type="number"
                    value={settings.apiLimits.requestsPerHour}
                    onChange={(e) => updateApiLimits('requestsPerHour', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Concurrent requests
                  </label>
                  <input
                    type="number"
                    value={settings.apiLimits.maxConcurrentRequests}
                    onChange={(e) => updateApiLimits('maxConcurrentRequests', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cài đặt Bảo mật
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Độ dài mật khẩu tối thiểu
                  </label>
                  <input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSecurity('passwordMinLength', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Thời gian phiên (giờ)
                  </label>
                  <input
                    type="number"
                    value={settings.security.sessionDuration}
                    onChange={(e) => updateSecurity('sessionDuration', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Số lần đăng nhập sai tối đa
                  </label>
                  <input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSecurity('maxLoginAttempts', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={settings.security.requireTwoFactor}
                      onChange={(e) => updateSecurity('requireTwoFactor', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    Bắt buộc 2FA
                  </label>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Yêu cầu xác thực 2 yếu tố cho tất cả tài khoản
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Cài đặt Sao lưu
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={`flex items-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={settings.systemConfig.autoBackup}
                      onChange={(e) => updateSystemConfig('autoBackup', e.target.checked)}
                      className="mr-2 rounded"
                    />
                    Tự động sao lưu
                  </label>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tự động sao lưu dữ liệu hệ thống hàng ngày
                  </p>
                </div>

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Thời gian lưu trữ (ngày)
                  </label>
                  <input
                    type="number"
                    value={settings.systemConfig.backupRetentionDays}
                    onChange={(e) => updateSystemConfig('backupRetentionDays', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Thao tác Sao lưu
                </h3>
                <div className="space-x-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                    Tạo Backup Ngay
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                    Khôi phục từ Backup
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                    Xóa Backup Cũ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`px-6 py-2 rounded-md font-medium ${
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Đang lưu...
              </>
            ) : (
              'Lưu Cài đặt'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
