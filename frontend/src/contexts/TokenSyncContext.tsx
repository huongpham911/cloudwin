import React, { createContext, useContext, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface TokenSyncContextType {
  refreshAllData: () => void
}

const TokenSyncContext = createContext<TokenSyncContextType | undefined>(undefined)

export const useTokenSync = () => {
  const context = useContext(TokenSyncContext)
  if (!context) {
    throw new Error('useTokenSync must be used within TokenSyncProvider')
  }
  return context
}

interface TokenSyncProviderProps {
  children: ReactNode
}

export const TokenSyncProvider: React.FC<TokenSyncProviderProps> = ({ children }) => {
  const queryClient = useQueryClient()

  const refreshAllData = () => {
    // Invalidate all queries that depend on DigitalOcean API
    queryClient.invalidateQueries({ queryKey: ['droplets'] })
    queryClient.invalidateQueries({ queryKey: ['analytics-overview'] })
    queryClient.invalidateQueries({ queryKey: ['analytics-usage-stats'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['account-billing'] })
    queryClient.invalidateQueries({ queryKey: ['regions'] })
    queryClient.invalidateQueries({ queryKey: ['sizes'] })
    queryClient.invalidateQueries({ queryKey: ['images'] })

    // Force refetch all data
    queryClient.refetchQueries({ queryKey: ['droplets'] })
    queryClient.refetchQueries({ queryKey: ['analytics-overview'] })
    queryClient.refetchQueries({ queryKey: ['analytics-usage-stats'] })
    queryClient.refetchQueries({ queryKey: ['accounts'] })
  }

  return (
    <TokenSyncContext.Provider value={{ refreshAllData }}>
      {children}
    </TokenSyncContext.Provider>
  )
} 