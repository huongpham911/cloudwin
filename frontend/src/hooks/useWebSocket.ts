import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  error: string | null
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!token) {
      return
    }

    const connectSocket = () => {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:7000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      })

      newSocket.on('connect', () => {
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
      })

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false)

        // Auto-reconnect logic
        if (reason === 'io server disconnect') {
          // Server disconnected, don't reconnect automatically
          setError('Server disconnected')
        } else if (reconnectAttempts.current < maxReconnectAttempts) {
          // Client disconnected, try to reconnect
          setTimeout(() => {
            reconnectAttempts.current++
            newSocket.connect()
          }, 2000 * reconnectAttempts.current) // Exponential backoff
        } else {
          setError('Failed to reconnect after multiple attempts')
        }
      })

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setError(`Connection error: ${error.message}`)
        setIsConnected(false)
      })

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error)
        setError(`Socket error: ${error}`)
      })

      // Custom events
      newSocket.on('build_progress', (_data) => {
        // Handle build progress update
        // Could trigger UI updates here
      })

      newSocket.on('droplet_status', (_data) => {
        // Handle droplet status update  
        // Could trigger data refetch here
      })

      setSocket(newSocket)
    }

    connectSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [token])

  return { socket, isConnected, error }
}