import React from 'react'
import {
  UsersIcon,
  ServerIcon,
  ChartBarIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/adminApi'
import { useTheme } from '../../contexts/ThemeContext'

interface SystemStats {
  users: {
    total: number
    active: number
    admins: number
  }
  droplets: {
    total: number
    active: number
    utilization_rate: number
  }
  spaces?: {
    total: number
    active: number
  }
  regional_distribution: Array<{
    region: string
    total_droplets: number
    active_droplets: number
    utilization_rate: number
  }>
  top_users: Array<{
    user_id: string
    email: string
    full_name: string
    total_droplets: number
    active_droplets: number
  }>
}

const AdminDashboard: React.FC = () => {
  const { isDark } = useTheme()
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['adminStats'],
    queryFn: adminApi.getSystemStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow h-32`}></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-md p-4`}>
        <div className="flex">
          <ExclamationTriangleIcon className={`h-5 w-5 ${isDark ? 'text-red-400' : 'text-red-400'}`} />
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
              Không thể tải dữ liệu hệ thống
            </h3>
            <div className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <p>Vui lòng thử lại sau.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Tổng Users',
      value: stats?.users?.total || 0,
      subtitle: `${stats?.users?.active || 0} hoạt động`,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      name: 'Tổng Droplets',
      value: stats?.droplets?.total || 0,
      subtitle: `${stats?.droplets?.active || 0} đang chạy`,
      icon: ServerIcon,
      color: 'green',
    },
    {
      name: 'AI Agents',
      value: stats?.agents?.total || 0,
      subtitle: `${stats?.agents?.active || 0} đang hoạt động`,
      icon: SparklesIcon,
      color: 'purple',
    },
    {
      name: 'Tổng Spaces',
      value: stats?.spaces?.total || 0,
      subtitle: `${stats?.spaces?.active || 0} đang hoạt động`,
      icon: CloudIcon,
      color: 'indigo',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Tổng quan hệ thống WinCloud Builder
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <StatCard key={stat.name} {...stat} isDark={isDark} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            Phân bổ theo Region
          </h3>
          <div className="space-y-3">
            {stats?.regional_distribution?.map((region) => (
              <div key={region.region} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    {region.region}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    {region.active_droplets}/{region.total_droplets}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {region.utilization_rate.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            Top Users
          </h3>
          <div className="space-y-3">
            {stats?.top_users?.slice(0, 5).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full flex items-center justify-center mr-3`}>
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {user.full_name || user.email}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    {user.active_droplets}/{user.total_droplets}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>droplets</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
        <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Tạo User mới"
            description="Thêm user mới vào hệ thống"
            href="/admin/users/create"
            color="blue"
            isDark={isDark}
          />
          <QuickActionCard
            title="Tạo Admin mới"
            description="Thêm admin mới"
            href="/admin/admins/create"
            color="purple"
            isDark={isDark}
          />
          <QuickActionCard
            title="Xem System Logs"
            description="Kiểm tra hoạt động hệ thống"
            href="/admin/logs"
            color="gray"
            isDark={isDark}
          />
        </div>
      </div>

      {/* System Health */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>System Health</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthMetric label="API Status" status="healthy" value="200ms" isDark={isDark} />
          <HealthMetric label="Database" status="healthy" value="5ms" isDark={isDark} />
          <HealthMetric label="DigitalOcean API" status="healthy" value="150ms" isDark={isDark} />
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  name: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  isDark: boolean
}

const StatCard: React.FC<StatCardProps> = ({ name, value, subtitle, icon: Icon, color, isDark }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    indigo: 'bg-indigo-500',
  }

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{name}</p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  color: string
  isDark: boolean
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, href, color, isDark }) => {
  const colorClasses = {
    blue: isDark
      ? 'border-blue-600 hover:border-blue-500 hover:bg-blue-900/20'
      : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
    purple: isDark
      ? 'border-purple-600 hover:border-purple-500 hover:bg-purple-900/20'
      : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
    gray: isDark
      ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
  }

  return (
    <a
      href={href}
      className={`block p-4 border rounded-lg transition-colors ${colorClasses[color as keyof typeof colorClasses]} ${isDark ? 'bg-gray-800' : 'bg-white'
        }`}
    >
      <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{description}</p>
    </a>
  )
}

interface HealthMetricProps {
  label: string
  status: 'healthy' | 'warning' | 'error'
  value: string
  isDark: boolean
}

const HealthMetric: React.FC<HealthMetricProps> = ({ label, status, value, isDark }) => {
  const statusColors = {
    healthy: isDark ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-100',
    warning: isDark ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-600 bg-yellow-100',
    error: isDark ? 'text-red-400 bg-red-900/30' : 'text-red-600 bg-red-100',
  }

  return (
    <div className="text-center">
      <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
        {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Error'}
      </div>
      <div className="mt-2">
        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</div>
        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{value}</div>
      </div>
    </div>
  )
}

export default AdminDashboard
