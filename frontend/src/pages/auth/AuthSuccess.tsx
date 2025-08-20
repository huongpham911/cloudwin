import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface UserData {
  user_id: string
  email: string
  username: string
  full_name: string
  avatar_url: string
  provider: string
  created_at: string
  expires_at: string
}

const AuthSuccess: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setToken, setUser } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const provider = searchParams.get('provider')
  const email = searchParams.get('email')
  const username = searchParams.get('username')
  const access_token = searchParams.get('access_token')
  const user_id = searchParams.get('user_id')

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        if (access_token && user_id) {
          // Save token to localStorage and context
          localStorage.setItem('token', access_token)
          setToken(access_token)
          
          // Fetch real user data from backend using the user_id
          try {
            const response = await fetch(`http://localhost:5000/api/v1/auth/me?user_id=${user_id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
              }
            })
            
            if (response.ok) {
              const userData = await response.json()
              
              // Check if response contains error
              if (userData.error) {
                throw new Error(userData.error)
              }
              
              // Set user data from backend response
              const user = {
                id: userData.user_id || userData.id || user_id,
                email: userData.email || email || '',
                username: userData.username || username || '',
                full_name: userData.full_name || userData.display_name || username || email || '',
                avatar_url: userData.avatar_url || null,
                provider: userData.provider || provider || 'oauth'
              }
              
              setUser(user)
              setUserData(userData)
              
              // Navigate to dashboard after successful login
              setTimeout(() => {
                navigate('/dashboard')
              }, 500)
              
            } else {
              // Fallback: create user object from URL params
              const user = {
                id: user_id,
                email: email || '',
                username: username || '',
                full_name: username || email || '',
                avatar_url: null,
                provider: provider || 'oauth'
              }
              setUser(user)
              setTimeout(() => {
                navigate('/dashboard')
              }, 1000)
            }
          } catch (fetchError) {
            // Fallback: still navigate to dashboard with URL params
            const user = {
              id: user_id,
              email: email || '',
              username: username || '',
              full_name: username || email || '',
              avatar_url: null,
              provider: provider || 'oauth'
            }
            setUser(user)
            setTimeout(() => {
              navigate('/dashboard')
            }, 1000)
          }
        } else {
          // Even if missing params, try to navigate anyway
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        }
      } catch (error) {
        // Silent error handling in production
      } finally {
        setLoading(false)
        // Auto navigate after loading is done
        setTimeout(() => {
          navigate('/dashboard')
        }, 500)
      }
    }

    handleOAuthSuccess()
  }, [navigate, provider, email, username, access_token, user_id, setToken, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 text-green-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            OAuth Login Successful! 🎉
          </h2>
          
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              Successfully authenticated with <span className="font-semibold text-blue-600 capitalize">{provider}</span>
            </p>
            
            {loading ? (
              <p className="text-sm text-gray-500">Loading user data...</p>
            ) : userData ? (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
                <div className="flex items-center space-x-3">
                  {userData.avatar_url && (
                    <img 
                      src={userData.avatar_url} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{userData.full_name}</p>
                    <p className="text-sm text-gray-600">@{userData.username}</p>
                    {userData.email && (
                      <p className="text-xs text-gray-500">{userData.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-600">User data not found in session</p>
            )}
            
            <p className="text-sm text-gray-600">
              Redirecting to dashboard in 1 second...
            </p>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthSuccess
