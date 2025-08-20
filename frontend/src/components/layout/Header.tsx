import React, { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { clsx } from 'clsx'

const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className={`shadow-sm border-b transition-colors duration-300 ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              WinCloud Builder
            </h1>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDark 
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <SunIcon className="w-5 h-5" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </button>

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors duration-200 ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}>
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium transition-colors duration-300 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user?.username || 'User'}
                    </div>
                    <div className={`text-xs transition-colors duration-300 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {user?.email}
                    </div>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 transition-colors duration-300 ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                </div>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10 transition-colors duration-300 ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={clsx(
                            active ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : '',
                            'flex items-center w-full px-4 py-2 text-sm transition-colors duration-200',
                            isDark ? 'text-gray-200' : 'text-gray-700'
                          )}
                        >
                          <UserIcon className="w-4 h-4 mr-3" />
                          Profile
                        </button>
                      )}
                    </Menu.Item>
                    
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={clsx(
                            active ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : '',
                            'flex items-center w-full px-4 py-2 text-sm transition-colors duration-200',
                            isDark ? 'text-gray-200' : 'text-gray-700'
                          )}
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-3" />
                          Settings
                        </button>
                      )}
                    </Menu.Item>

                    <hr className={`my-1 ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
                    
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(
                            active ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : '',
                            'flex items-center w-full px-4 py-2 text-sm transition-colors duration-200',
                            isDark ? 'text-gray-200' : 'text-gray-700'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
