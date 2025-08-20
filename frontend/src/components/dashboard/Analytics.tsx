import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ServerIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UsersIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'

const Analytics: React.FC = () => {
  const { isDark } = useTheme()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const [dropletsRes, healthRes] = await Promise.allSettled([
          fetch('http://localhost:5000/api/v1/droplets'),
          fetch('http://localhost:5000/health')
        ])

        let totalDroplets = 0
        let activeDroplets = 0
        let totalAccounts = 0
        let regions = new Set()
        let sizes = new Set()

        if (dropletsRes.status === 'fulfilled' && dropletsRes.value.ok) {
          const droplets = await dropletsRes.value.json()
          if (Array.isArray(droplets)) {
            totalDroplets = droplets.length
            activeDroplets = droplets.filter(d => d.status === 'active').length

            droplets.forEach(d => {
              if (d.region?.slug) regions.add(d.region.slug)
              if (d.size?.slug) sizes.add(d.size.slug)
            })
          }
        }

        if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
          const health = await healthRes.value.json()
          totalAccounts = health.total_tokens || 0
        }

        setAnalytics({
          overview: {
            total_droplets: totalDroplets,
            active_droplets: activeDroplets,
            total_accounts: totalAccounts,
            regions_count: regions.size,
            sizes_count: sizes.size
          },
          last_updated: new Date().toLocaleString()
        })

      } catch (err) {
        console.error('❌ Analytics error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  const StatCard: React.FC<{
    title: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    description?: string
  }> = ({ title, value, icon: Icon, color, description }) => (
    <div className={`overflow-hidden shadow rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-md ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                {title}
              </dt>
              <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {value}
              </dd>
              {description && (
                <dd className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {description}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium text-lg">Lỗi tải analytics</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Analytics Dashboard
        </h1>
        <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Tổng quan về hệ thống WinCloud Builder
        </p>
        {analytics?.last_updated && (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Cập nhật lần cuối: {analytics.last_updated}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Tổng Droplets"
          value={analytics?.overview?.total_droplets || 0}
          icon={ServerIcon}
          color="bg-blue-500"
          description="Tổng số droplets được tạo"
        />

        <StatCard
          title="Droplets Hoạt Động"
          value={analytics?.overview?.active_droplets || 0}
          icon={CpuChipIcon}
          color="bg-green-500"
          description="Droplets đang chạy"
        />

        <StatCard
          title="Tài Khoản DO"
          value={analytics?.overview?.total_accounts || 0}
          icon={UsersIcon}
          color="bg-purple-500"
          description="Số tài khoản DigitalOcean"
        />

        <StatCard
          title="Regions"
          value={analytics?.overview?.regions_count || 0}
          icon={ChartBarIcon}
          color="bg-yellow-500"
          description="Số regions được sử dụng"
        />

        <StatCard
          title="Sizes"
          value={analytics?.overview?.sizes_count || 0}
          icon={CurrencyDollarIcon}
          color="bg-red-500"
          description="Số loại size droplet"
        />

        <StatCard
          title="Uptime"
          value="99.9%"
          icon={ClockIcon}
          color="bg-indigo-500"
          description="Thời gian hoạt động"
        />
      </div>

      <div className={`shadow rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Tóm tắt hệ thống
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Thống kê droplets
            </h3>
            <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Tổng số droplets: {analytics?.overview?.total_droplets || 0}</li>
              <li>• Droplets hoạt động: {analytics?.overview?.active_droplets || 0}</li>
              <li>• Tỉ lệ hoạt động: {
                analytics?.overview?.total_droplets > 0
                  ? Math.round((analytics.overview.active_droplets / analytics.overview.total_droplets) * 100)
                  : 0
              }%</li>
            </ul>
          </div>
          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Cấu hình hệ thống
            </h3>
            <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Tài khoản DigitalOcean: {analytics?.overview?.total_accounts || 0}</li>
              <li>• Regions: {analytics?.overview?.regions_count || 0}</li>
              <li>• Sizes: {analytics?.overview?.sizes_count || 0}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics