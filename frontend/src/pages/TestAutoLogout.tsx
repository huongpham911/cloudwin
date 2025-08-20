import React, { useState, useEffect } from 'react'
import { useAutoLogoutContext } from '../contexts/AutoLogoutContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ClockIcon, UserIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline'

/**
 * Test page for auto-logout functionality
 * Shows countdown, allows manual trigger, etc.
 */
const TestAutoLogout: React.FC = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const { resetTimer, isWarningVisible } = useAutoLogoutContext()
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [isActive, setIsActive] = useState(true)

  // Update last activity time
  useEffect(() => {
    const updateActivity = () => {
      if (isActive) {
        setLastActivity(Date.now())
      }
    }

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [isActive])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getTimeSinceActivity = () => {
    return Math.floor((Date.now() - lastActivity) / 1000)
  }

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Auto-Logout Test Page</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Test the auto-logout functionality. You will be logged out after 5 minutes of inactivity.
          </p>
        </div>

        {/* User Info */}
        <div className={`
          p-6 rounded-lg mb-6
          ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
        `}>
          <div className="flex items-center mb-4">
            <UserIcon className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Current Session</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>User:</p>
              <p className="font-medium">{user?.email || 'Not logged in'}</p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Login Time:</p>
              <p className="font-medium">{user?.last_login ? formatTime(new Date(user.last_login).getTime()) : 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Activity Tracking */}
        <div className={`
          p-6 rounded-lg mb-6
          ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
        `}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-semibold">Activity Tracking</h2>
            </div>
            
            <button
              onClick={() => setIsActive(!isActive)}
              className={`
                flex items-center px-4 py-2 rounded-md text-sm font-medium
                ${isActive 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              `}
            >
              {isActive ? (
                <>
                  <PauseIcon className="h-4 w-4 mr-2" />
                  Pause Tracking
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Resume Tracking
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Last Activity:</p>
              <p className="font-medium font-mono">{formatTime(lastActivity)}</p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Seconds Since:</p>
              <p className="font-medium font-mono">{getTimeSinceActivity()}s</p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tracking Status:</p>
              <p className={`font-medium ${isActive ? 'text-green-500' : 'text-red-500'}`}>
                {isActive ? 'Active' : 'Paused'}
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Logout Status */}
        <div className={`
          p-6 rounded-lg mb-6
          ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
          ${isWarningVisible ? 'ring-2 ring-yellow-500' : ''}
        `}>
          <h2 className="text-xl font-semibold mb-4">Auto-Logout Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Timeout Setting:</p>
              <p className="font-medium">5 minutes</p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Warning Time:</p>
              <p className="font-medium">1 minute before</p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Warning Visible:</p>
              <p className={`font-medium ${isWarningVisible ? 'text-yellow-500' : 'text-green-500'}`}>
                {isWarningVisible ? 'Yes - Check modal!' : 'No'}
              </p>
            </div>
            <div>
              <button
                onClick={resetTimer}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium
                  ${isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                Reset Timer
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className={`
          p-6 rounded-lg
          ${isDark ? 'bg-blue-900 border border-blue-700' : 'bg-blue-50 border border-blue-200'}
        `}>
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Stay on this page and don't interact for 4 minutes</li>
            <li>After 4 minutes, you should see a warning modal</li>
            <li>You can choose to "Continue Session" or "Logout Now"</li>
            <li>If you don't respond within 1 minute, you'll be automatically logged out</li>
            <li>Use "Pause Tracking" to stop activity detection for testing</li>
            <li>Use "Reset Timer" to restart the countdown</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default TestAutoLogout
