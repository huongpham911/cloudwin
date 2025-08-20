import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { adminApi, UserUpdateRequest, User } from '../../services/adminApi'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

const EditUser: React.FC = () => {
  const { isDark } = useTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<UserUpdateRequest>({
    email: '',
    full_name: '',
    monthly_build_limit: 50,
    max_droplets: 10
  })

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Fetch user data
  const { data: user, isLoading: userLoading, error } = useQuery<User>({
    queryKey: ['adminUser', id],
    queryFn: () => adminApi.getUser(id!),
    enabled: !!id,
  })

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        monthly_build_limit: user.monthly_build_limit,
        max_droplets: user.max_droplets
      })
    }
  }, [user])

  const updateUserMutation = useMutation({
    mutationFn: (data: UserUpdateRequest) => adminApi.updateUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      queryClient.invalidateQueries(['adminUser', id])
      toast.success('User đã được cập nhật thành công')
      navigate('/admin/users')
    },
    onError: (error: any) => {
      toast.error(`Lỗi cập nhật user: ${error.response?.data?.detail || error.message}`)
    }
  })

  const changeRoleMutation = useMutation({
    mutationFn: (roleName: string) => adminApi.changeUserRole(id!, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      queryClient.invalidateQueries(['adminUser', id])
      toast.success('Vai trò đã được thay đổi')
    },
    onError: (error: any) => {
      toast.error(`Lỗi thay đổi vai trò: ${error.response?.data?.detail || error.message}`)
    }
  })

  const changePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => adminApi.changeUserPassword(id!, newPassword),
    onSuccess: () => {
      setPasswordData({ new_password: '', confirm_password: '' })
      toast.success('Mật khẩu đã được thay đổi thành công')
    },
    onError: (error: any) => {
      toast.error(`Lỗi thay đổi mật khẩu: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.email || !formData.full_name) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email không hợp lệ')
      return
    }

    if (formData.monthly_build_limit && formData.monthly_build_limit < 0) {
      toast.error('Giới hạn builds phải >= 0')
      return
    }

    if (formData.max_droplets && formData.max_droplets < 0) {
      toast.error('Giới hạn droplets phải >= 0')
      return
    }

    updateUserMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleRoleChange = (newRole: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn thay đổi vai trò thành "${newRole}"?`)) {
      changeRoleMutation.mutate(newRole)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!passwordData.new_password || !passwordData.confirm_password) {
      toast.error('Vui lòng điền đầy đủ thông tin mật khẩu')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    if (window.confirm('Bạn có chắc chắn muốn thay đổi mật khẩu cho user này?')) {
      changePasswordMutation.mutate(passwordData.new_password)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (userLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className={`h-8 rounded w-1/4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-12 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className={`border rounded-md p-4 ${
        isDark 
          ? 'bg-red-900/20 border-red-700 text-red-300' 
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        <p>Không thể tải thông tin user. Vui lòng thử lại.</p>
        <Link to="/admin/users" className={`underline mt-2 inline-block ${
          isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
        }`}>
          Quay lại danh sách users
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/admin/users"
          className={`inline-flex items-center ${
            isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Quay lại danh sách users
        </Link>
      </div>

      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Chỉnh sửa User
        </h1>
        <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Cập nhật thông tin cho {user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Form */}
          <div className={`shadow sm:rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label htmlFor="full_name" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        id="full_name"
                        required
                        value={formData.full_name}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className={`border-t pt-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Giới hạn sử dụng
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="monthly_build_limit" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Giới hạn builds/tháng
                      </label>
                      <input
                        type="number"
                        name="monthly_build_limit"
                        id="monthly_build_limit"
                        min="0"
                        value={formData.monthly_build_limit}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>0 = không giới hạn</p>
                    </div>

                    <div>
                      <label htmlFor="max_droplets" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Giới hạn droplets đồng thời
                      </label>
                      <input
                        type="number"
                        name="max_droplets"
                        id="max_droplets"
                        min="0"
                        value={formData.max_droplets}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>0 = không giới hạn</p>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className={`flex justify-end space-x-3 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Link
                    to="/admin/users"
                    className={`py-2 px-4 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    disabled={updateUserMutation.isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateUserMutation.isLoading ? 'Đang cập nhật...' : 'Cập nhật User'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Password Change Form */}
          <div className={`shadow sm:rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Thay đổi mật khẩu
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="new_password" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="new_password"
                          id="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                            isDark 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          placeholder="Nhập mật khẩu mới"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                            isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm_password" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          id="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                            isDark 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          placeholder="Nhập lại mật khẩu"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                            isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mật khẩu phải có ít nhất 6 ký tự
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {changePasswordMutation.isLoading ? 'Đang thay đổi...' : 'Thay đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* User Info Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className={`shadow sm:rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Trạng thái hiện tại
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Vai trò:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role_name === 'admin' 
                      ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                      : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role_name === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trạng thái:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active 
                      ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                      : isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ngày tạo:</span>
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(user.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Role Management */}
          <div className={`shadow sm:rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Quản lý vai trò
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleRoleChange('user')}
                  disabled={user.role_name === 'user' || changeRoleMutation.isLoading}
                  className={`w-full flex justify-between items-center p-3 border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>Chuyển thành User</span>
                  {user.role_name === 'user' && (
                    <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>✓ Hiện tại</span>
                  )}
                </button>
                <button
                  onClick={() => handleRoleChange('admin')}
                  disabled={user.role_name === 'admin' || changeRoleMutation.isLoading}
                  className={`w-full flex justify-between items-center p-3 border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>Chuyển thành Admin</span>
                  {user.role_name === 'admin' && (
                    <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>✓ Hiện tại</span>
                  )}
                </button>
              </div>
              {changeRoleMutation.isLoading && (
                <div className="mt-3 text-center">
                  <div className={`inline-flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang thay đổi vai trò...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className={`shadow sm:rounded-lg border-l-4 ${
            isDark 
              ? 'bg-gray-800 border-red-600' 
              : 'bg-white border-red-400'
          }`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg leading-6 font-medium mb-4 ${isDark ? 'text-red-400' : 'text-red-900'}`}>
                Vùng nguy hiểm
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                Các hành động này không thể hoàn tác. Hãy cẩn thận!
              </p>
              <div className="space-y-3">
                <Link
                  to={`/admin/users/${id}/delete`}
                  className={`w-full inline-flex justify-center py-2 px-4 border shadow-sm text-sm font-medium rounded-md transition-colors ${
                    isDark
                      ? 'border-red-600 text-red-300 bg-red-900/30 hover:bg-red-900/50'
                      : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  Xóa User này
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditUser
