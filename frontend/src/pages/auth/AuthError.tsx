import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const AuthError: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const provider = searchParams.get('provider')
  const error = searchParams.get('error')

  useEffect(() => {
    // Auto redirect to login after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login')
    }, 5000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            OAuth Authentication Failed
          </h2>
          
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              Failed to authenticate with <span className="font-semibold text-red-600 capitalize">{provider}</span>
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Error:</span> {error.replace(/_/g, ' ')}
                </p>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              Redirecting to login page in 5 seconds...
            </p>
          </div>
          
          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthError
