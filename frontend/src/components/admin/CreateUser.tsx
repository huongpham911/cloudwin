import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { adminApi, UserCreateRequest } from '../../services/adminApi'
import toast from 'react-hot-toast'

const CreateUser: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<UserCreateRequest>({
    email: '',
    password: '',
    full_name: '',
    role_name: 'user'
  })
  
  const [showPassword, setShowPassword] = useState(false)

  const createUserMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('User đã được tạo thành công')
      navigate('/admin/users')
    },
    onError: (error: any) => {
      toast.error(`Lỗi tạo user: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email không hợp lệ')
      return
    }

    createUserMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/admin/users"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Quay lại danh sách users
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tạo User mới</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Thêm user mới vào hệ thống WinCloud Builder
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Thông tin cơ bản
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ít nhất 6 ký tự"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="role_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role_name"
                    id="role_name"
                    value={formData.role_name}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="user">User - Người dùng thường</option>
                    <option value="admin">Admin - Quản trị viên</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Role Information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Thông tin vai trò
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                {formData.role_name === 'admin' ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quyền Admin:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Quản lý tất cả users trong hệ thống</li>
                      <li>Tạo và xóa users</li>
                      <li>Xem tất cả droplets và analytics</li>
                      <li>Truy cập admin panel</li>
                      <li>Không giới hạn builds và droplets</li>
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quyền User:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Tạo và quản lý droplets cá nhân</li>
                      <li>Xem analytics cá nhân</li>
                      <li>Giới hạn builds: 50/tháng</li>
                      <li>Giới hạn droplets: 10</li>
                      <li>Không thể truy cập admin panel</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Lưu ý bảo mật
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <ul className="list-disc list-inside">
                        <li>Mật khẩu sẽ được mã hóa an toàn</li>
                        <li>User sẽ nhận email thông báo tài khoản</li>
                        <li>Hãy đảm bảo email là chính xác</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/admin/users"
                className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={createUserMutation.isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createUserMutation.isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tạo...
                  </>
                ) : (
                  'Tạo User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateUser
