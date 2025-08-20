import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ServerIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Quản lý Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Quản lý Admins', href: '/admin/admins', icon: ShieldCheckIcon },
    { name: 'System Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Droplets', href: '/admin/droplets', icon: ServerIcon },
    { name: 'AI Agents', href: '/admin/agents', icon: SparklesIcon },
    { name: 'Spaces Storage', href: '/admin/spaces', icon: CloudIcon },
    { name: 'DO Tokens', href: '/admin/tokens', icon: CogIcon },
    { name: 'System Logs', href: '/admin/logs', icon: DocumentTextIcon },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const goToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <AdminSidebar navigation={navigation} currentPath={location.pathname} isDark={isDark} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <AdminSidebar
            navigation={navigation}
            currentPath={location.pathname}
            isDark={isDark}
            isCollapsed={sidebarCollapsed}
            setIsCollapsed={setSidebarCollapsed}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
        <div className={`relative z-10 flex-shrink-0 flex h-16 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow`}>
          <button
            type="button"
            className={`px-4 border-r ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden`}
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div>
              <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Admin Panel
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={goToDashboard}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDark
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
              >
                Về Dashboard
              </button>

              <div className={`flex items-center space-x-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <ShieldCheckIcon className="h-5 w-5" />
                <span>{user?.full_name || user?.email}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark
                  ? 'bg-red-900 text-red-200'
                  : 'bg-red-100 text-red-800'
                  }`}>
                  Admin
                </span>
              </div>

              <button
                onClick={handleLogout}
                className={`p-2 rounded-md transition-colors ${isDark
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={`flex-1 relative overflow-y-auto focus:outline-none ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

interface AdminSidebarProps {
  navigation: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
  currentPath: string
  isDark: boolean
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ navigation, currentPath, isDark, isCollapsed = false, setIsCollapsed }) => {
  return (
    <div className={`flex flex-col h-0 flex-1 border-r ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} relative`}>
      {/* Toggle Button */}
      {setIsCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-6 ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-gray-900 hover:bg-gray-800 border-gray-700'
            } text-white rounded-full p-1.5 border-2 transition-colors duration-200 z-10`}
        >
          {isCollapsed ? (
            <Bars3Icon className="h-4 w-4" />
          ) : (
            <XMarkIcon className="h-4 w-4" />
          )}
        </button>
      )}

      <div className="flex-1 flex flex-col pt-3 pb-4 overflow-y-auto">
        <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center justify-center'} flex-shrink-0 px-4`}>
          {/* KANGTA Logo with WinCloud text */}
          <div className="flex items-center">
            <img
              src="/kangta-logo.svg"
              alt="KANGTA"
              className={`${isCollapsed ? 'w-8 h-8' : 'w-24 h-24'}`}
              style={{
                maxWidth: isCollapsed ? '32px' : '96px',
                maxHeight: isCollapsed ? '32px' : '96px'
              }}
            />
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  WinCloud
                </h1>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-1 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${isActive
                  ? isDark
                    ? 'bg-gray-900 border-r-4 border-blue-500 text-blue-400'
                    : 'bg-blue-100 border-r-4 border-blue-600 text-blue-700'
                  : isDark
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors relative`}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon
                  className={`${isActive
                    ? isDark ? 'text-blue-400' : 'text-blue-500'
                    : isDark
                      ? 'text-gray-400 group-hover:text-gray-300'
                      : 'text-gray-400 group-hover:text-gray-500'
                    } ${isCollapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0 h-6 w-6`}
                />
                {!isCollapsed && item.name}
                {isCollapsed && (
                  <div className="absolute left-14 top-2 bg-gray-800/90 border border-gray-600/20 rounded px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={`flex-shrink-0 flex border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        {!isCollapsed && (
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Admin Interface v1.0</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminLayout
