import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ServerIcon,
  CpuChipIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { dropletsApi, analyticsApi } from '../../services/api'
import { genaiService } from '../../services/genaiService'

const DashboardHome: React.FC = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()

  // Fetch user's droplets
  const { data: dropletsResponse, isLoading: dropletsLoading, error: dropletsError } = useQuery({
    queryKey: ['droplets'],
    queryFn: dropletsApi.list,
    refetchInterval: 30000,
    retry: false
  })

  const droplets = Array.isArray(dropletsResponse?.data) ? dropletsResponse.data : []

  // Fetch usage stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: analyticsApi.getUsageStats,
    select: (response) => response.data,
    refetchInterval: 60000,
    retry: false
  })

  // Fetch AI Agents
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['genai-agents'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching agents...')
        console.log('🔑 Current token:', localStorage.getItem('token') ? 'Token exists' : 'No token')
        const result = await genaiService.listAgents()
        console.log('✅ Agents result:', result)
        return result
      } catch (error: any) {
        console.error('❌ Error fetching agents:', error)
        console.error('❌ Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        })
        // Return empty agents array on error
        return { success: false, agents: [], error: error.message }
      }
    },
    refetchInterval: 60000,
    retry: false
  })

  const agents = Array.isArray(agentsData?.agents) ? agentsData.agents : []
  console.log('📊 Dashboard agents data:', {
    agentsData,
    agents,
    agentsLoading,
    agentsError,
    agentsCount: agents.length
  })

  const dashboardStats = [
    {
      name: 'Total Droplets',
      value: (stats?.total_droplets !== undefined ? stats.total_droplets.toString() : droplets?.length?.toString()) || '0',
      icon: ServerIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase'
    },
    {
      name: 'Active Droplets',
      value: (stats?.active_droplets !== undefined ? stats.active_droplets.toString() : droplets?.filter((d: any) => d.status === 'active')?.length?.toString()) || '0',
      icon: CpuChipIcon,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'increase'
    },
    {
      name: 'Building',
      value: (stats?.building_droplets !== undefined ? stats.building_droplets.toString() : (Array.isArray(droplets) ? droplets.filter((d: any) => d.status === 'building').length.toString() : '0')) || '0',
      icon: ClockIcon,
      color: 'bg-yellow-500',
      change: '-2%',
      changeType: 'decrease'
    },
    {
      name: 'Monthly Cost',
      value: (stats?.total_cost_month !== undefined ? `$${stats.total_cost_month.toFixed(2)}` : '$0.00'),
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'increase'
    }
  ]

  const recentDroplets = Array.isArray(droplets) ? droplets.slice(0, 5) : []

  return (
    <div className={`p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Welcome to your WinCloud Builder dashboard
        </p>

        {/* User Info Card */}
        {user && (
          <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border`}>
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`}>
                  {(user.full_name || user.username || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user.full_name || user.username || user.email}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {user.email} • Logged in via {user.provider || 'email'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-400'}`} aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>Total Droplets</dt>
                  <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.total_droplets || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>Active</dt>
                  <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.active_droplets || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>Building</dt>
                  <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.building_droplets || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>Monthly Cost</dt>
                  <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>${stats?.total_cost_month || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>AI Agents</dt>
                  <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {agentsLoading ? '...' : agents.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Droplets */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Droplets</h3>
            <Link
              to="/dashboard/droplets"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </Link>
          </div>

          {Array.isArray(droplets) && droplets.length > 0 ? (
            <div className="space-y-3">
              {droplets.slice(0, 5).map((droplet: any) => (
                <div key={droplet.id} className={`flex items-center justify-between p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center">
                    <ServerIcon className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-400'} mr-3`} />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{droplet.name || 'Unknown'}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {typeof droplet.region === 'object' ? droplet.region?.slug || droplet.region?.name || 'Unknown Region' : droplet.region || 'Unknown Region'} • {' '}
                        {typeof droplet.size === 'object' ? droplet.size?.slug || droplet.size?.name || 'Unknown Size' : droplet.size || 'Unknown Size'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${droplet.status === 'ready' || droplet.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : droplet.status === 'building'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                      {droplet.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <ServerIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No droplets</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Get started by creating a new droplet.</p>
              <div className="mt-6">
                <Link
                  to="/dashboard/create-vps-do"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  New Droplet
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent AI Agents */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300 mt-8`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent AI Agents</h3>
            <Link
              to="/dashboard/ai-agents"
              className="text-sm font-medium text-purple-600 hover:text-purple-500"
            >
              View all
            </Link>
          </div>

          {agentsLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading AI agents...</p>
            </div>
          ) : Array.isArray(agents) && agents.length > 0 ? (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent: any) => (
                <div key={agent.uuid || agent.id} className={`flex items-center justify-between p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                  <div className="flex items-center">
                    <SparklesIcon className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-500'} mr-3`} />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{agent.name || 'Unknown Agent'}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {agent.description || 'No description'} • {' '}
                        {typeof agent.model === 'string' ? agent.model : (agent.model as any)?.name || 'No model'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.status === 'active' || agent.deployment?.status === 'STATUS_RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.deployment?.status === 'STATUS_RUNNING' ? 'running' : (agent.status || 'active')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : agentsError ? (
            <div className="text-center py-6">
              <SparklesIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-red-400' : 'text-red-400'}`} />
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Failed to load AI agents</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Please check your connection and try again.</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <SparklesIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No AI agents</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Get started by creating your first AI agent.</p>
              <div className="mt-6">
                <Link
                  to="/dashboard/ai-agents"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Create AI Agent
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
