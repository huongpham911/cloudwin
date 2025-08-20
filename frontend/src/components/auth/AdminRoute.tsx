import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user has admin role
  const isAdmin = user.role === 'admin' || user.is_admin === true
  
  if (!isAdmin) {
    // Redirect to dashboard if not admin
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          error: "Bạn không có quyền truy cập vào trang quản trị."
        }} 
        replace 
      />
    )
  }

  return <>{children}</>
}

export default AdminRoute
