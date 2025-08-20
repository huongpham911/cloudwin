import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { adminApi, User } from '../../services/adminApi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

const UserManagement: React.FC = () => {
  const { isDark } = useTheme()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers', currentPage, searchTerm],
    queryFn: () => adminApi.getUsers({ page: currentPage, limit: 20, search: searchTerm }),
    keepPreviousData: true,
  })

  const deleteUserMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('User đã được xóa thành công')
    },
    onError: (error: any) => {
      toast.error(`Lỗi xóa user: ${error.response?.data?.detail || error.message}`)
    }
  })

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string, action: 'activate' | 'deactivate' }) =>
      action === 'activate' ? adminApi.activateUser(userId) : adminApi.deactivateUser(userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['adminUsers'])
      toast.success(`User đã được ${variables.action === 'activate' ? 'kích hoạt' : 'vô hiệu hóa'}`)
    },
    onError: (error: any) => {
      toast.error(`Lỗi cập nhật trạng thái: ${error.response?.data?.detail || error.message}`)
    }
  })

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa user này?')) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleToggleUserStatus = (userId: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate'
    toggleUserStatusMutation.mutate({ userId, action })
  }

  const handleBulkAction = (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('Vui lòng chọn ít nhất một user')
      return
    }

    if (action === 'delete') {
      if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedUsers.length} user(s)?`)) {
        selectedUsers.forEach(userId => {
          deleteUserMutation.mutate(userId)
        })
        setSelectedUsers([])
      }
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === data?.users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(data?.users.map(user => user.id) || [])
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className={`h-8 rounded w-1/4 mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    // Log error only in development
    if (import.meta.env.DEV) {
      console.error('UserManagement: Error state', error)
    }
    return (
      <div className={`border rounded-md p-4 ${isDark
          ? 'bg-red-900/20 border-red-700 text-red-300'
          : 'bg-red-50 border-red-200 text-red-700'
        }`}>
        <p>Lỗi tải danh sách users. Vui lòng thử lại.</p>
      </div>
    )
  }

  const users = data?.users || []
  const totalPages = Math.ceil((data?.total || 0) / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Quản lý Users
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Quản lý tất cả users trong hệ thống ({data?.total || 0} users)
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/admin/users/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Tạo User mới
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'
                }`} />
              <input
                type="text"
                placeholder="Tìm kiếm theo email hoặc tên..."
                className={`pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500 ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('delete')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDark
                    ? 'text-red-300 bg-red-900/30 hover:bg-red-900/50'
                    : 'text-red-700 bg-red-100 hover:bg-red-200'
                  }`}
              >
                Xóa ({selectedUsers.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className={`shadow sm:rounded-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  User
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  Role
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  Trạng thái
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  Giới hạn
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  Ngày tạo
                </th>
                <th className={`px-2 py-3 text-right text-xs font-medium uppercase tracking-wider w-64 min-w-64 ${isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {users.map((user) => (
                <tr key={user.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'
                          }`}>
                          <UserIcon className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-400'}`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {user.full_name || 'N/A'}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role_name === 'admin'
                        ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                        : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {user.role_name === 'admin' && <ShieldCheckIcon className="h-3 w-3 mr-1" />}
                      {user.role_name === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active
                        ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                        : isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                      }`}>
                      {user.is_active ? (
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
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div>Build: {user.monthly_build_limit}/tháng</div>
                    <div>Droplets: {user.max_droplets}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    {new Date(user.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-right text-sm font-medium w-64 min-w-64">
                    <div className="flex items-center justify-end space-x-2 min-w-max">
                      {/* Edit Button */}
                      <Link
                        to={`/admin/users/edit/${user.id}`}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-colors ${isDark
                            ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700 border-blue-500'
                            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-500'
                          }`}
                        title="Chỉnh sửa user"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Sửa
                      </Link>

                      {/* Toggle Status Button */}
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-colors ${user.is_active
                            ? isDark
                              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 border-yellow-500'
                              : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-500'
                            : isDark
                              ? 'text-green-400 hover:text-green-300 hover:bg-gray-700 border-green-500'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-500'
                          }`}
                        title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        {user.is_active ? (
                          <>
                            <XMarkIcon className="h-3 w-3 mr-1" />
                            Tắt
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Bật
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-colors ${isDark
                            ? 'text-red-400 hover:text-red-300 hover:bg-gray-700 border-red-500'
                            : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-500'
                          }`}
                        title="Xóa user"
                      >
                        <TrashIcon className="h-3 w-3 mr-1" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Không có users
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
              {searchTerm ? 'Không tìm thấy users phù hợp' : 'Chưa có users nào trong hệ thống'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`px-4 py-3 flex items-center justify-between border-t sm:px-6 rounded-lg shadow ${isDark
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
          }`}>
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${isDark
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${isDark
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Hiển thị <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(currentPage * 20, data?.total || 0)}</span> của{' '}
                <span className="font-medium">{data?.total || 0}</span> kết quả
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${page === currentPage
                        ? isDark
                          ? 'z-10 bg-blue-900/50 border-blue-500 text-blue-300'
                          : 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } ${page === 1 ? 'rounded-l-md' : ''} ${page === totalPages ? 'rounded-r-md' : ''}`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
