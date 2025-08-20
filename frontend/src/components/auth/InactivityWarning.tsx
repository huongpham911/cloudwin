import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface InactivityWarningProps {
  isVisible: boolean
  remainingSeconds: number
  onStayLoggedIn: () => void
  onLogoutNow: () => void
}

const InactivityWarning: React.FC<InactivityWarningProps> = ({
  isVisible,
  remainingSeconds,
  onStayLoggedIn,
  onLogoutNow
}) => {
  const { isDark } = useTheme()
  const [countdown, setCountdown] = useState(remainingSeconds)

  useEffect(() => {
    setCountdown(remainingSeconds)
  }, [remainingSeconds])

  useEffect(() => {
    if (!isVisible || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, countdown])

  if (!isVisible) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`
        max-w-md w-full mx-4 p-6 rounded-lg shadow-xl
        ${isDark 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
      `}>
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="ml-3">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Phiên đăng nhập sắp hết hạn
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Bạn sẽ được tự động đăng xuất do không hoạt động. 
            Nhấn "Tiếp tục" để duy trì phiên đăng nhập.
          </p>

          {/* Countdown */}
          <div className={`
            flex items-center justify-center p-4 rounded-lg
            ${isDark ? 'bg-gray-700' : 'bg-gray-100'}
          `}>
            <ClockIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className={`text-lg font-mono font-bold ${
              countdown <= 10 ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {formatTime(countdown)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onStayLoggedIn}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-md
              ${isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-colors duration-200
            `}
          >
            Tiếp tục phiên
          </button>
          
          <button
            onClick={onLogoutNow}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-md border
              ${isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-colors duration-200
            `}
          >
            Đăng xuất ngay
          </button>
        </div>

        {/* Progress bar */}
        <div className={`mt-4 w-full rounded-full h-5 flex items-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              countdown <= 10 ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{
              width: `${Math.max(0, (countdown / remainingSeconds) * 100)}%`
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default InactivityWarning
