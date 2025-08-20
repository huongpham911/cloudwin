import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ServerIcon,
  ClockIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { analyticsApi } from '../../services/analytics'

const Analytics: React.FC = () => {
  const { isDark } = useTheme()
  
  // Fetch dashboard analytics data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    select: (response) => response.data,
    refetchInterval: 60000,
  })

  // Fetch cost analytics
  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ['analytics-costs'],
    queryFn: () => analyticsApi.getCosts(),
    select: (response) => response.data,
    refetchInterval: 60000,
  })

  // Fetch performance analytics
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['analytics-performance'],
    queryFn: () => analyticsApi.getPerformance(),
    select: (response) => response.data,
    refetchInterval: 60000,
  })

  const isLoading = dashboardLoading || costLoading || performanceLoading

  if (dashboardError) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className={`${isDark ? 'text-red-400' : 'text-red-800'}`}>
                  Failed to load analytics data. Please check your API connection.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link 
                to="/dashboard" 
                className={`flex items-center ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} mr-4 transition-colors duration-300`}
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Analytics
              </h1>
            </div>
            {isLoading && (
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                🔄 Loading real data from DigitalOcean...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Real-time Stats from DigitalOcean */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Droplets */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 transition-colors duration-300`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total Droplets
                  </p>
                  <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardData?.overview?.total_droplets || 0}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {dashboardData?.overview?.active_droplets || 0} active
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Cost */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 transition-colors duration-300`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Daily Cost
                  </p>
                  <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ${costData?.current_costs?.daily?.toFixed(2) || '0.00'}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ${costData?.current_costs?.monthly?.toFixed(2) || '0.00'}/month
                  </p>
                </div>
              </div>
            </div>

            {/* Build Performance */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 transition-colors duration-300`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Avg Build Time
                  </p>
                  <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {performanceData?.build_performance?.average_build_time_minutes?.toFixed(1) || '0'}m
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {performanceData?.build_performance?.total_builds || 0} builds
                  </p>
                </div>
              </div>
            </div>

            {/* Active Regions */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 transition-colors duration-300`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GlobeAltIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Active Regions
                  </p>
                  <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {performanceData?.region_performance?.length || 0}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    regions used
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Activity Chart */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-300`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Daily Activity (Real DO Data)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData?.daily_activity?.slice(-7).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} w-16`}>
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="ml-4 flex-1">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min((item.builds / 10) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.builds} builds
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      📊 Loading activity data from DigitalOcean...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Regional Performance */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-300`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Regional Performance (Real DO Data)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {performanceData?.region_performance?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.region}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.total_builds} builds
                        </span>
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.success_rate}% success
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      🌍 Loading regional data from DigitalOcean...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Analytics from DigitalOcean */}
          {costData && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-300 mb-8`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  💰 Cost Analytics (Real DigitalOcean Data)
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      ${costData.current_costs?.daily?.toFixed(2) || '0.00'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Daily Cost</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      ${costData.current_costs?.monthly?.toFixed(2) || '0.00'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monthly Cost</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      ${costData.projections?.next_30_days?.toFixed(2) || '0.00'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Projected (30d)</p>
                  </div>
                </div>
                
                {/* Cost trend */}
                {costData.daily_history && (
                  <div className="space-y-2">
                    <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Daily Cost Trend (Last 7 days)
                    </h4>
                    {costData.daily_history.slice(-7).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          ${item.cost}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts and Optimization */}
          {(costData?.alerts?.length > 0 || costData?.optimization_suggestions?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Alerts */}
              {costData?.alerts?.length > 0 && (
                <div className={`${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg`}>
                  <div className={`px-6 py-4 border-b ${isDark ? 'border-red-700' : 'border-red-200'}`}>
                    <h3 className={`text-lg font-medium ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                      🚨 Alerts
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {costData.alerts.map((alert: string, index: number) => (
                        <div key={index} className={`flex items-start ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optimization Suggestions */}
              {costData?.optimization_suggestions?.length > 0 && (
                <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                  <div className={`px-6 py-4 border-b ${isDark ? 'border-blue-700' : 'border-blue-200'}`}>
                    <h3 className={`text-lg font-medium ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                      💡 Optimization Tips
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {costData.optimization_suggestions.map((suggestion: string, index: number) => (
                        <div key={index} className={`flex items-start ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                          <ChartBarIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Droplets */}
          {dashboardData?.recent_droplets?.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-300`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  🚀 Recent Activity (Live from DigitalOcean)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recent_droplets.map((droplet: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ServerIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {droplet.name}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {droplet.region} • {droplet.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          droplet.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : droplet.status === 'building'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {droplet.status}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(droplet.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {!isLoading && !dashboardData && !costData && !performanceData && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-8 text-center`}>
              <ChartBarIcon className={`h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-400'} mx-auto mb-4`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                No Analytics Data Yet
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                Create some VPS instances to see analytics data here.
              </p>
              <Link
                to="/dashboard/create-vps-do"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First VPS
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Analytics
