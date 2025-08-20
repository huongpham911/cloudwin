import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UseAutoLogoutOptions {
  timeoutMinutes?: number
  warningMinutes?: number
  onWarning?: () => void
  onLogout?: () => void
}

/**
 * Hook to automatically logout user after inactivity
 * @param options Configuration options
 */
export const useAutoLogout = (options: UseAutoLogoutOptions = {}) => {
  const {
    timeoutMinutes = 5,
    warningMinutes = 1,
    onWarning,
    onLogout
  } = options

  const { logout, user, token } = useAuth()
  const timeoutRef = useRef<number | null>(null)
  const warningTimeoutRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000
  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
  }, [])

  const handleLogout = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('Auto-logout triggered due to inactivity')
    }
    clearTimeouts()

    try {
      await logout()
      onLogout?.()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Auto-logout failed', error)
      }
    }
  }, [logout, onLogout, clearTimeouts])

  const handleWarning = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('Inactivity warning triggered')
    }
    onWarning?.()
  }, [onWarning])

  const resetTimer = useCallback(() => {
    if (!user || !token) return

    lastActivityRef.current = Date.now()
    clearTimeouts()

    // Set warning timeout
    if (warningMs > 0) {
      warningTimeoutRef.current = window.setTimeout(handleWarning, warningMs)
    }

    // Set logout timeout
    timeoutRef.current = window.setTimeout(handleLogout, timeoutMs)

    if (import.meta.env.DEV) {
      console.log(`Auto-logout timer reset. Will logout in ${timeoutMinutes} minutes`)
    }
  }, [user, token, timeoutMs, warningMs, handleLogout, handleWarning, timeoutMinutes, clearTimeouts])

  const updateActivity = useCallback(() => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    // Only reset if enough time has passed (prevent excessive resets)
    if (timeSinceLastActivity > 1000) { // 1 second threshold
      resetTimer()
    }
  }, [resetTimer])

  // Activity event listeners
  useEffect(() => {
    if (!user || !token) {
      clearTimeouts()
      return
    }

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ]

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Initial timer setup
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      clearTimeouts()
    }
  }, [user, token, updateActivity, resetTimer, clearTimeouts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  return {
    resetTimer,
    clearTimeouts,
    getRemainingTime: () => {
      if (!timeoutRef.current) return 0
      const elapsed = Date.now() - lastActivityRef.current
      return Math.max(0, timeoutMs - elapsed)
    },
    getLastActivity: () => lastActivityRef.current
  }
}

export default useAutoLogout
