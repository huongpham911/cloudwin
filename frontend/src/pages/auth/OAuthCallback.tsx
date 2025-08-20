import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CloudIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const OAuthCallback: React.FC = () => {
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setToken, setUser } = useAuth()

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const provider = state // provider is passed as state parameter
        
        if (!code || !provider) {
          throw new Error('Missing OAuth parameters')
        }

        // Call backend OAuth callback endpoint
        const response = await api.get(`/api/v1/auth/callback`, {
          params: { provider, code, state }
        })

        const { access_token, user } = response.data

        // Store token and user data
        localStorage.setItem('token', access_token)
        setToken(access_token)
        setUser(user)

        // Redirect to dashboard
        navigate('/dashboard')
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || 'OAuth authentication failed')
        
        // Redirect to login page after error
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }

    handleOAuthCallback()
  }, [searchParams, navigate, setToken, setUser])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 bg-red-600">
              <CloudIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Authentication Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 bg-blue-600">
            <CloudIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Authenticating...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we sign you in
          </p>
          
          {/* Loading spinner */}
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OAuthCallback
