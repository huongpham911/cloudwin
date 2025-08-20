import { useState, useEffect } from 'react'
import { tokenService } from '../services/tokenService'

export const useTokenStatus = () => {
  const [hasValidTokens, setHasValidTokens] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkTokens = () => {
      const hasTokens = tokenService.hasValidTokens()
      setHasValidTokens(hasTokens)
      setIsLoading(false)
    }

    checkTokens()

    // Listen for token changes
    const interval = setInterval(checkTokens, 1000)

    return () => clearInterval(interval)
  }, [])

  return { hasValidTokens, isLoading }
}
