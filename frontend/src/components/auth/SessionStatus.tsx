import React, { useState, useEffect } from 'react'
import { useAutoLogoutContext } from '../../contexts/AutoLogoutContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { ClockIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

/**
 * Component to display session status and remaining time
 * Can be placed in header or sidebar for debugging/admin purposes
 */
const SessionStatus: React.FC = () => {
  const { user } = useAuth()
  const { remainingTime } = useAutoLogoutContext()
  const { isDark } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Don't show if user is not logged in
  if (!user) return null

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getRemainingMinutes = () => {
    // This is a simplified calculation - in real implementation,
    // you'd get this from the auto-logout hook
    return Math.max(0, Math.floor(remainingTime / 60000))
  }

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-2 rounded-md text-xs
      ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}
      ${isVisible ? 'opacity-100' : 'opacity-50 hover:opacity-100'}
      transition-opacity duration-200
    `}>
      {/* Toggle visibility button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          p-1 rounded hover:bg-opacity-20 hover:bg-gray-500
          ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        `}
        title={isVisible ? 'Hide session info' : 'Show session info'}
      >
        {isVisible ? (
          <EyeSlashIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>

      {/* Session info */}
      {isVisible && (
        <>
          <ClockIcon className="h-4 w-4" />
          <span className="font-mono">
            Session: ~{getRemainingMinutes()}m
          </span>
          <span className={`
            px-2 py-1 rounded text-xs font-medium
            ${getRemainingMinutes() <= 1 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : getRemainingMinutes() <= 2
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }
          `}>
            {getRemainingMinutes() <= 1 ? 'Expiring' : 'Active'}
          </span>
        </>
      )}
    </div>
  )
}

export default SessionStatus
