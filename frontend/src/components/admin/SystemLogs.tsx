import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { adminApi, AuditLog } from '../../services/adminApi'
import { useTheme } from '../../contexts/ThemeContext'

const SystemLogs: React.FC = () => {
  const { isDark } = useTheme()
  const [currentPage, setCurrentPage] = useState(1)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', currentPage],
    queryFn: () => adminApi.getAuditLogs(currentPage, 50),
    keepPreviousData: true,
  })

  const filteredLogs = data?.logs?.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || log.resource === filterType
    
    return matchesSearch && matchesFilter
  }) || []

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={`h-8 rounded w-1/4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`h-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`border rounded-md p-4 ${
        isDark 
          ? 'bg-red-900/20 border-red-800 text-red-400' 
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        <p>Lỗi tải system logs. Vui lòng thử lại.</p>
      </div>
    )
  }

  const totalPages = Math.ceil((data?.total || 0) / 50)
  const resourceTypes = [...new Set(data?.logs?.map(log => log.resource) || [])]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>System Logs</h1>
        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Xem và theo dõi tất cả hoạt động trong hệ thống ({data?.total || 0} logs)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-500">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{data?.total || 0}</p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Logs</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {data?.logs?.filter(log => log.action.includes('create') || log.action.includes('success')).length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Success Actions</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-yellow-500">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {data?.logs?.filter(log => log.action.includes('delete') || log.action.includes('deactivate')).length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Warning Actions</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-purple-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {data?.logs?.filter(log => {
                  const logDate = new Date(log.timestamp)
                  const today = new Date()
                  return logDate.toDateString() === today.toDateString()
                }).length || 0}
              </p>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Today's Logs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Tìm kiếm action, resource type, user ID..."
                className={`pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="sm:w-64">
            <div className="relative">
              <FunnelIcon className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">Tất cả resource types</option>
                {resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className={`shadow overflow-hidden sm:rounded-md ${
        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Thời gian
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  User Email
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Action
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Resource
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Details
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {filteredLogs.map((log) => (
                <LogRow key={log.id} log={log} isDark={isDark} />
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                Không có logs
              </h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchTerm || filterType !== 'all' 
                  ? 'Không tìm thấy logs phù hợp với filter' 
                  : 'Chưa có logs nào trong hệ thống'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`px-4 py-3 flex items-center justify-between border-t sm:px-6 rounded-lg shadow ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 ${
                isDark
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 ${
                isDark
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
                Hiển thị <span className="font-medium">{(currentPage - 1) * 50 + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(currentPage * 50, data?.total || 0)}</span> của{' '}
                <span className="font-medium">{data?.total || 0}</span> logs
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? isDark 
                            ? 'z-10 bg-blue-900 border-blue-600 text-blue-300'
                            : 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } ${page === 1 ? 'rounded-l-md' : ''} ${page === totalPages ? 'rounded-r-md' : ''}`}
                    >
                      {page}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface LogRowProps {
  log: AuditLog
  isDark: boolean
}

const LogRow: React.FC<LogRowProps> = ({ log, isDark }) => {
  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('success')) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    } else if (action.includes('delete') || action.includes('deactivate')) {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
    } else {
      return <InformationCircleIcon className="h-4 w-4 text-blue-500" />
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('success')) {
      return isDark ? 'text-green-300 bg-green-900' : 'text-green-700 bg-green-100'
    } else if (action.includes('delete') || action.includes('deactivate')) {
      return isDark ? 'text-red-300 bg-red-900' : 'text-red-700 bg-red-100'
    } else {
      return isDark ? 'text-blue-300 bg-blue-900' : 'text-blue-700 bg-blue-100'
    }
  }

  return (
    <tr className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
        <div className="flex flex-col">
          <span>{new Date(log.timestamp).toLocaleDateString('vi-VN')}</span>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {log.user_email}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {getActionIcon(log.action)}
          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
            {log.action}
          </span>
        </div>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
        <div className="flex flex-col">
          <span className="font-medium">{log.resource}</span>
          {log.resource && (
            <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {log.resource.length > 8 ? log.resource.substring(0, 8) + '...' : log.resource}
            </span>
          )}
        </div>
      </td>
      <td className={`px-6 py-4 text-sm max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
        <div className="truncate" title={log.details}>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {log.details || 'No details'}
          </span>
        </div>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {log.ip_address}
      </td>
    </tr>
  )
}

export default SystemLogs
