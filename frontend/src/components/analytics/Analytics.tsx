import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ServerIcon,
  ClockIcon,
  UsersIcon,
  CpuChipIcon,
  CloudIcon,
  FolderIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'
import { maskToken } from '../../utils/tokenUtils'
import Logger from '../../utils/logger'
import LoadingSpinner from '../ui/LoadingSpinner'



const Analytics: React.FC = () => {
  const { isDark } = useTheme()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Only log in development mode
        Logger.loading('Loading analytics data...')

        // Get auth token from localStorage (optional for some endpoints)
        const token = localStorage.getItem('token')
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json'
        }

        // Add auth header only if token exists
        if (token) {
          authHeaders['Authorization'] = `Bearer ${token}`
        }

        const [dropletsRes, healthRes, bucketsRes] = await Promise.allSettled([
          fetch('http://localhost:5000/api/v1/droplets'),
          fetch('http://localhost:5000/health'),
          fetch('http://localhost:5000/api/v1/spaces/buckets/')
        ])

        // Debug info
        setDebugInfo({
          token: token ? 'Present' : 'Missing',
          dropletsStatus: dropletsRes.status === 'fulfilled' ? dropletsRes.value.status : 'Failed',
          healthStatus: healthRes.status === 'fulfilled' ? healthRes.value.status : 'Failed',
          bucketsStatus: bucketsRes.status === 'fulfilled' ? bucketsRes.value.status : 'Failed',
          timestamp: new Date().toLocaleTimeString()
        })

        let totalDroplets = 0
        let activeDroplets = 0
        let totalAccounts = 0
        let totalBuckets = 0
        let bucketsWithCdn = 0
        let totalFiles = 0
        let regions = new Set()
        let sizes = new Set()
        let bucketRegions = new Set()

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
          if (import.meta.env.DEV) {
            Logger.success('Droplets loaded:', { totalDroplets, activeDroplets })
          }
        }

        if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
          const health = await healthRes.value.json()
          totalAccounts = health.total_tokens || 0
          if (import.meta.env.DEV) {
            Logger.success('Health loaded:', { totalAccounts })
          }
        }

        // Load buckets data
        if (bucketsRes.status === 'fulfilled' && bucketsRes.value.ok) {
          const bucketsData = await bucketsRes.value.json()
          if (bucketsData?.buckets && Array.isArray(bucketsData.buckets)) {
            totalBuckets = bucketsData.buckets.length

            bucketsData.buckets.forEach((bucket: any) => {
              if (bucket.region) bucketRegions.add(bucket.region)
            })

            // Check CDN status for each bucket
            for (const bucket of bucketsData.buckets) {
              try {
                const cdnRes = await fetch(`http://localhost:5000/api/v1/spaces/buckets/${bucket.name}/cdn`)
                if (cdnRes.ok) {
                  const cdnData = await cdnRes.json()
                  if (cdnData?.cdn_enabled || cdnData?.enabled) {
                    bucketsWithCdn++
                  }
                }

                // Get file count for each bucket
                try {
                  const filesRes = await fetch(`http://localhost:5000/api/v1/spaces/buckets/${bucket.name}/files`)
                  if (filesRes.ok) {
                    const filesData = await filesRes.json()
                    if (filesData?.files && Array.isArray(filesData.files)) {
                      totalFiles += filesData.files.length
                    }
                  }
                } catch (fileErr) {
                  Logger.debug(`Could not get files for bucket ${bucket.name}`, fileErr)
                }
              } catch (err) {
                Logger.debug(`Could not check CDN for bucket ${bucket.name}`, err)
              }
            }

            if (import.meta.env.DEV) {
              Logger.success('Buckets loaded:', { totalBuckets, bucketsWithCdn, bucketRegions: bucketRegions.size })
            }
          }
        } else if (bucketsRes.status === 'fulfilled') {
          // Handle API error response (like "No Spaces access keys available")
          const bucketsError = await bucketsRes.value.json()
          Logger.warn('Buckets API warning:', bucketsError?.error || 'Unknown error')
          // Continue with 0 buckets instead of failing
          totalBuckets = 0
        } else {
          Logger.warn('Buckets API failed:', bucketsRes.reason)
          totalBuckets = 0
        }

        setAnalytics({
          overview: {
            total_droplets: totalDroplets,
            active_droplets: activeDroplets,
            total_accounts: totalAccounts,
            total_buckets: totalBuckets,
            total_files: totalFiles,
            buckets_with_cdn: bucketsWithCdn,
            regions_count: regions.size,
            bucket_regions_count: bucketRegions.size,
            sizes_count: sizes.size
          },
          last_updated: new Date().toLocaleString()
        })

        if (import.meta.env.DEV) {
          Logger.success('Analytics data ready')
        }

      } catch (err) {
        Logger.error('Analytics error:', err)
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
        <LoadingSpinner
          size="lg"
          message="Đang tải analytics..."
          className="min-h-[50vh]"
        />
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

        {/* Debug Info */}
        {debugInfo && (
          <div className={`mt-4 p-3 rounded-lg text-xs ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            <div className="flex justify-between items-center">
              <div>
                <strong>🔍 Debug Info:</strong> Token: {maskToken(debugInfo.token)} |
                Droplets: {debugInfo.dropletsStatus} |
                Health: {debugInfo.healthStatus} |
                Buckets: {debugInfo.bucketsStatus} |
                Updated: {debugInfo.timestamp}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                🔄 Hard Reload
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          title="Tổng Buckets"
          value={analytics?.overview?.total_buckets || 0}
          icon={CloudIcon}
          color="bg-cyan-500"
          description="Tổng số Spaces buckets"
        />

        <StatCard
          title="Total Files"
          value={analytics?.overview?.total_files || 0}
          icon={FolderIcon}
          color="bg-emerald-500"
          description="Tổng số files trong buckets"
        />

        <StatCard
          title="Bucket Regions"
          value={analytics?.overview?.bucket_regions_count || 0}
          icon={FolderIcon}
          color="bg-teal-500"
          description="Regions chứa buckets"
        />

        <StatCard
          title="Tài Khoản DO"
          value={analytics?.overview?.total_accounts || 0}
          icon={UsersIcon}
          color="bg-purple-500"
          description="Số tài khoản DigitalOcean"
        />

        <StatCard
          title="Droplet Regions"
          value={analytics?.overview?.regions_count || 0}
          icon={ChartBarIcon}
          color="bg-yellow-500"
          description="Regions droplets"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <li>• Regions: {analytics?.overview?.regions_count || 0}</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Thống kê Spaces
            </h3>
            <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Tổng số buckets: {analytics?.overview?.total_buckets || 0}</li>
              <li>• Total files: {analytics?.overview?.total_files || 0}</li>
              <li>• Bucket regions: {analytics?.overview?.bucket_regions_count || 0}</li>
              <li>• Buckets có CDN: {analytics?.overview?.buckets_with_cdn || 0}</li>
              <li>• Tỉ lệ CDN: {
                analytics?.overview?.total_buckets > 0
                  ? Math.round(((analytics.overview.buckets_with_cdn || 0) / analytics.overview.total_buckets) * 100)
                  : 0
              }%</li>
              <li>• Avg files/bucket: {
                analytics?.overview?.total_buckets > 0
                  ? Math.round((analytics?.overview?.total_files || 0) / analytics.overview.total_buckets)
                  : 0
              }</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Cấu hình hệ thống
            </h3>
            <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Tài khoản DigitalOcean: {analytics?.overview?.total_accounts || 0}</li>
              <li>• Droplet sizes: {analytics?.overview?.sizes_count || 0}</li>
              <li>• Tổng regions: {(analytics?.overview?.regions_count || 0) + (analytics?.overview?.bucket_regions_count || 0)}</li>
              <li>• Uptime: 99.9%</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bucket Details Section */}
      <div className={`shadow rounded-lg p-6 mt-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📊 Chi tiết Spaces & Buckets
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bucket Overview */}
          <div>
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              🗂️ Tổng quan Buckets
            </h3>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <CloudIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Total Buckets
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tổng số buckets được tạo
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {analytics?.overview?.total_buckets || 0}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-teal-500 rounded-full flex items-center justify-center">
                      <FolderIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Bucket Regions
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Số regions chứa buckets
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {analytics?.overview?.bucket_regions_count || 0}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <FolderIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Total Files
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tổng số files trong tất cả buckets
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {analytics?.overview?.total_files || 0}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                      <ChartBarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        CDN Enabled
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Buckets có CDN được kích hoạt
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {analytics?.overview?.buckets_with_cdn || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div>
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              📈 Thống kê sử dụng
            </h3>

            <div className="space-y-4">
              {/* CDN Usage Percentage */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    CDN Adoption Rate
                  </span>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {analytics?.overview?.total_buckets > 0
                      ? Math.round(((analytics.overview.buckets_with_cdn || 0) / analytics.overview.total_buckets) * 100)
                      : 0
                    }%
                  </span>
                </div>
                <div className={`w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2`}>
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${analytics?.overview?.total_buckets > 0
                        ? Math.round(((analytics.overview.buckets_with_cdn || 0) / analytics.overview.total_buckets) * 100)
                        : 0
                        }%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  📋 Activity Summary
                </h4>
                <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className="flex justify-between">
                    <span>Buckets created:</span>
                    <span className="font-medium">{analytics?.overview?.total_buckets || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Total files:</span>
                    <span className="font-medium">{analytics?.overview?.total_files || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>CDN configurations:</span>
                    <span className="font-medium">{analytics?.overview?.buckets_with_cdn || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Regions utilized:</span>
                    <span className="font-medium">{analytics?.overview?.bucket_regions_count || 0}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Avg. files per bucket:</span>
                    <span className="font-medium">
                      {analytics?.overview?.total_buckets > 0
                        ? Math.round((analytics?.overview?.total_files || 0) / analytics.overview.total_buckets)
                        : 0
                      }
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Avg. buckets per region:</span>
                    <span className="font-medium">
                      {analytics?.overview?.bucket_regions_count > 0
                        ? Math.round((analytics.overview.total_buckets || 0) / analytics.overview.bucket_regions_count)
                        : 0
                      }
                    </span>
                  </li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className={`p-4 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50/50'}`}>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  🚀 Quick Actions
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => window.open('/dashboard/spaces', '_blank')}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    📂 Manage Your Buckets
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full text-left px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    🔄 Refresh Analytics Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
