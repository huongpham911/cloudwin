import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { adminApi, User } from '../../services/adminApi'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

const AdminManagement: React.FC = () => {
  const { isDark } = useTheme()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: admins, isLoading, error } = useQuery<User[]>({
    queryKey: ['adminAdmins'],
    queryFn: adminApi.getAdmins,
  })

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className={`h-8 rounded w-1/4 mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-48 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`border rounded-md p-4 ${
        isDark 
          ? 'bg-red-900/20 border-red-700 text-red-300' 
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        <p>Lỗi tải danh sách admins. Vui lòng thử lại.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Quản lý Admins
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Quản lý tất cả administrators trong hệ thống ({admins?.length || 0} admins)
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Tạo Admin mới
          </button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-purple-500">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {admins?.length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                Tổng Admins
              </p>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-500">
              <CheckIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {admins?.filter(admin => admin.is_active).length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                Hoạt động
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-500">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {admins?.filter(admin => {
                  const createdDate = new Date(admin.created_at)
                  const thirtyDaysAgo = new Date()
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                  return createdDate > thirtyDaysAgo
                }).length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                Mới (30 ngày)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins?.map((admin) => (
          <AdminCard key={admin.id} admin={admin} isDark={isDark} />
        ))}
      </div>

      {admins?.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheckIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chưa có admins
          </h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            Bắt đầu bằng cách tạo admin đầu tiên.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tạo Admin mới
            </button>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateForm && (
        <CreateAdminModal 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            queryClient.invalidateQueries({ queryKey: ['adminAdmins'] })
          }}
          isDark={isDark}
        />
      )}
    </div>
  )
}

interface AdminCardProps {
  admin: User
  isDark: boolean
}

const AdminCard: React.FC<AdminCardProps> = ({ admin, isDark }) => {
  return (
    <div className={`rounded-lg shadow hover:shadow-md transition-shadow ${
      isDark ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isDark ? 'bg-purple-900/30' : 'bg-purple-100'
            }`}>
              <ShieldCheckIcon className={`h-6 w-6 ${
                isDark ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {admin.full_name || 'N/A'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{admin.email}</p>
          </div>
          <div className="ml-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              admin.is_active
                ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                : isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
            }`}>
              {admin.is_active ? (
                <>
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Hoạt động
                </>
              ) : (
                <>
                  <XMarkIcon className="h-3 w-3 mr-1" />
                  Vô hiệu hóa
                </>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Ngày tạo:</span>
            <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
              {new Date(admin.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Role ID:</span>
            <span className={`font-mono text-xs ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              {admin.role_id}
            </span>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <Link
            to={`/admin/users/edit/${admin.id}`}
            className={`flex-1 text-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Chỉnh sửa
          </Link>
          <Link
            to={`/admin/users/${admin.id}`}
            className={`flex-1 text-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              isDark
                ? 'border-purple-600 text-purple-400 hover:bg-purple-900/20'
                : 'border-purple-300 text-purple-700 hover:bg-purple-50'
            }`}
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  )
}

interface CreateAdminModalProps {
  onClose: () => void
  onSuccess: () => void
  isDark: boolean
}

const CreateAdminModal: React.FC<CreateAdminModalProps> = ({ onClose, onSuccess, isDark }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  })

  const createAdminMutation = useMutation({
    mutationFn: adminApi.createAdmin,
    onSuccess: () => {
      toast.success('Admin đã được tạo thành công')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(`Lỗi tạo admin: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    createAdminMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit}>
            <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                  isDark ? 'bg-purple-900/30' : 'bg-purple-100'
                }`}>
                  <ShieldCheckIcon className={`h-6 w-6 ${
                    isDark ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Tạo Admin mới
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        required
                        value={formData.full_name}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Nguyễn Văn Admin"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mật khẩu
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Ít nhất 6 ký tự"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <button
                type="submit"
                disabled={createAdminMutation.isPending}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {createAdminMutation.isPending ? 'Đang tạo...' : 'Tạo Admin'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                  isDark
                    ? 'border-gray-600 bg-gray-600 text-gray-200 hover:bg-gray-500'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminManagement
