import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../ui/Logo'
import {
  HomeIcon,
  PlusCircleIcon,
  ServerIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ArrowLeftStartOnRectangleIcon,
  UserIcon,
  UsersIcon,
  CloudIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

interface MenuItem {
  name: string
  href: string
  icon: React.ForwardRefExoticComponent<any>
  current: boolean
  description: string
  adminOnly?: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails, navigate to login
      navigate('/login')
    }
  }

  const isAdmin = user?.role === 'admin' || user?.is_admin === true

  // Core menu items for all users
  const coreMenuItems: MenuItem[] = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard',
      description: 'Dashboard overview'
    },
    {
      name: 'My VPS',
      href: '/dashboard/droplets',
      icon: ServerIcon,
      current: location.pathname === '/dashboard/droplets',
      description: 'Your VPS instances'
    },
    {
      name: 'Create VPS',
      href: '/dashboard/create-vps-do',
      icon: PlusCircleIcon,
      current: location.pathname === '/dashboard/create-vps-do',
      description: 'Create new VPS'
    },
    {
      name: 'Spaces Storage',
      href: '/dashboard/spaces',
      icon: CloudIcon,
      current: location.pathname.startsWith('/dashboard/spaces'),
      description: 'Manage Spaces Object Storage'
    },
    {
      name: 'AI Agents',
      href: '/dashboard/ai-agents',
      icon: SparklesIcon,
      current: location.pathname.startsWith('/dashboard/ai-agents'),
      description: 'Create and manage AI assistants'
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: ChartBarIcon,
      current: location.pathname === '/dashboard/analytics',
      description: isAdmin ? 'System analytics' : 'Your usage statistics'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/dashboard/settings',
      description: 'Account settings'
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserIcon,
      current: location.pathname === '/dashboard/profile',
      description: 'Manage your profile and security'
    }
  ]

  // Admin-only menu items
  const adminMenuItems: MenuItem[] = [
    {
      name: 'Admin Panel',
      href: '/admin/dashboard',
      icon: UsersIcon,
      current: location.pathname.startsWith('/admin'),
      description: 'System administration',
      adminOnly: true
    }
  ]

  // Combine menu items based on role
  const menuItems = isAdmin ? [...coreMenuItems, ...adminMenuItems] : coreMenuItems

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-900'
      } text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'
      } min-h-screen relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-6 ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-gray-900 hover:bg-gray-800 border-gray-700'
          } text-white rounded-full p-1.5 border-2 transition-colors duration-200`}
      >
        {isCollapsed ? (
          <Bars3Icon className="h-4 w-4" />
        ) : (
          <XMarkIcon className="h-4 w-4" />
        )}
      </button>

      {/* Logo/Brand */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-700'}`}>
        <Logo
          size="2xl"
          showText={!isCollapsed}
          textColor="text-white"
          className="justify-center"
        />
      </div>

      {/* Navigation Menu */}
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 group relative ${item.current
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    } ${item.adminOnly ? 'border border-yellow-500/30' : ''}`}
                  title={isCollapsed ? item.description : ''}
                >
                  <Icon className={`flex-shrink-0 h-5 w-5 ${item.current ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    } ${item.adminOnly ? 'text-yellow-400' : ''}`} />
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.adminOnly && (
                        <span className="block text-xs text-yellow-400 opacity-75">
                          Admin Only
                        </span>
                      )}
                    </div>
                  )}
                  {item.adminOnly && isCollapsed && (
                    <div className="absolute left-14 top-2 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 text-xs text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      Admin
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Role indicator */}
        {!isCollapsed && (
          <div className="mt-6 px-3 py-2 bg-gray-800/50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-yellow-400' : 'bg-green-400'} mr-2`}></div>
              <span className="text-xs text-gray-400">
                Logged in as: <span className={`font-medium ${isAdmin ? 'text-yellow-400' : 'text-green-400'}`}>
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate">
              {user?.email}
            </div>
          </div>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className="absolute top-20 right-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors duration-200 ${isDark
            ? 'text-yellow-400 hover:bg-gray-800'
            : 'text-gray-400 hover:bg-gray-800'
            }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* User Section at Bottom */}
      {!isCollapsed && (
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-700'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatar_url}
                    alt={user.full_name || user.display_name || user.username || 'User'}
                  />
                ) : (
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name?.charAt(0).toUpperCase() || user?.display_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.display_name || user?.username || 'User'}</p>
                <p className="text-xs text-gray-300 truncate">
                  {user?.email || 'user@example.com'}
                  {user?.provider && ` • via ${user.provider}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-200"
              title="Logout"
            >
              <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Tooltip */}
      {isCollapsed && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          {user?.avatar_url ? (
            <img
              className="h-8 w-8 rounded-full"
              src={user.avatar_url}
              alt={user.full_name || user.display_name || user.username || 'User'}
              title={user.full_name || user.display_name || user.username || 'User'}
            />
          ) : (
            <div
              className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center"
              title={user?.full_name || user?.display_name || user?.username || 'User'}
            >
              <span className="text-sm font-medium text-white">
                {user?.full_name?.charAt(0).toUpperCase() || user?.display_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Sidebar
