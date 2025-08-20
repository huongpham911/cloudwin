import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAutoLogout } from '../hooks/useAutoLogout'
import { useAuth } from './AuthContext'
import InactivityWarning from '../components/auth/InactivityWarning'

interface AutoLogoutContextType {
  isWarningVisible: boolean
  remainingTime: number
  resetTimer: () => void
  showWarning: () => void
  hideWarning: () => void
}

const AutoLogoutContext = createContext<AutoLogoutContextType | undefined>(undefined)

export const useAutoLogoutContext = () => {
  const context = useContext(AutoLogoutContext)
  if (context === undefined) {
    throw new Error('useAutoLogoutContext must be used within an AutoLogoutProvider')
  }
  return context
}

interface AutoLogoutProviderProps {
  children: ReactNode
  timeoutMinutes?: number
  warningMinutes?: number
}

export const AutoLogoutProvider: React.FC<AutoLogoutProviderProps> = ({
  children,
  timeoutMinutes = 5,
  warningMinutes = 1
}) => {
  const { logout, user } = useAuth()
  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [warningStartTime, setWarningStartTime] = useState<number>(0)

  const showWarning = useCallback(() => {
    if (!user) return

    if (import.meta.env.DEV) {
      console.log('Showing inactivity warning')
    }
    setIsWarningVisible(true)
    setWarningStartTime(Date.now())
  }, [user])

  const hideWarning = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('Hiding inactivity warning')
    }
    setIsWarningVisible(false)
    setWarningStartTime(0)
  }, [])

  const handleLogout = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('Auto-logout initiated')
    }
    hideWarning()

    try {
      await logout()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Auto-logout failed', error)
      }
    }
  }, [logout, hideWarning])

  const { resetTimer, getRemainingTime } = useAutoLogout({
    timeoutMinutes,
    warningMinutes,
    onWarning: showWarning,
    onLogout: handleLogout
  })

  const handleStayLoggedIn = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('User chose to stay logged in')
    }
    hideWarning()
    resetTimer()
  }, [hideWarning, resetTimer])

  const handleLogoutNow = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('User chose to logout immediately')
    }
    await handleLogout()
  }, [handleLogout])

  // Calculate remaining seconds for warning countdown
  const getRemainingSeconds = useCallback(() => {
    if (!isWarningVisible || !warningStartTime) return 0
    
    const warningDurationMs = warningMinutes * 60 * 1000
    const elapsed = Date.now() - warningStartTime
    return Math.max(0, Math.floor((warningDurationMs - elapsed) / 1000))
  }, [isWarningVisible, warningStartTime, warningMinutes])

  const contextValue: AutoLogoutContextType = {
    isWarningVisible,
    remainingTime: getRemainingTime(),
    resetTimer,
    showWarning,
    hideWarning
  }

  return (
    <AutoLogoutContext.Provider value={contextValue}>
      {children}
      
      {/* Inactivity Warning Modal */}
      <InactivityWarning
        isVisible={isWarningVisible}
        remainingSeconds={getRemainingSeconds()}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleLogoutNow}
      />
    </AutoLogoutContext.Provider>
  )
}

export default AutoLogoutProvider
