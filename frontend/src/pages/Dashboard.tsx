import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  PlusIcon,
  ServerIcon,
  CpuChipIcon,
  ChartBarIcon,
  CircleStackIcon,
  CloudIcon,
  KeyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { userApi } from '../services/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useTokens } from '../hooks/useTokens'
import { tokenService } from '../services/tokenService'
import { genaiService } from '../services/genaiService'
import { spacesApi } from '../services/spacesApi'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // Load tokens into tokenService when available (keep for compatibility)
  const { tokens: userTokens } = useTokens()
  useEffect(() => {
    if (userTokens && userTokens.length > 0) {
      const doTokens = userTokens.map(t => ({
        name: t.name,
        token: t.token || '',
        added_at: new Date().toISOString(),
        is_valid: t.status === 'valid'
      }))
      tokenService.setTokens(doTokens)
    }
  }, [userTokens])

  // Fetch user's dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['user-dashboard', userApi.getCurrentUserId()],
    queryFn: () => userApi.getDashboard(userApi.getCurrentUserId()),
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  })

  // Fetch GenAI data with better error handling
  const { data: genaiData, isLoading: genaiLoading } = useQuery({
    queryKey: ['genai-dashboard'],
    queryFn: async () => {
      try {
        const [workspaces, agents, models] = await Promise.all([
          genaiService.listWorkspaces().catch(() => ({ workspaces: [] })),
          genaiService.listAgents().catch(() => ({ agents: [] })),
          genaiService.listModels().catch(() => ({ models: [] }))
        ])
        return { workspaces, agents, models }
      } catch (error) {
        console.error('GenAI data fetch failed:', error)
        return { workspaces: { workspaces: [] }, agents: { agents: [] }, models: { models: [] } }
      }
    },
    enabled: true,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // 30 seconds stale time
    retry: false, // Don't retry on failure
    onError: (error) => {
      console.error('GenAI query failed:', error)
    }
  })

  // Fetch Spaces buckets using the same API as SpacesBuckets component
  const { data: spacesData, isLoading: spacesLoading } = useQuery({
    queryKey: ['spaces-buckets-dashboard'],
    queryFn: async () => {
      try {
        const result = await spacesApi.listBuckets()
        console.log('✅ Spaces buckets result:', result)
        return result
      } catch (error) {
        console.error('❌ Error fetching spaces buckets:', error)
        return { buckets: [] }
      }
    },
    refetchInterval: 60000,
    retry: false
  })

  // Extract data from dashboard response
  const droplets = dashboardData?.droplets || []
  const volumes = dashboardData?.volumes || []
  const tokens = dashboardData?.tokens || []
  const summary = dashboardData?.summary

  // Use spaces data from dedicated API call
  const buckets = Array.isArray(spacesData?.buckets) ? spacesData.buckets : []

  // Debug logging for dashboard data (only in development)
  if (import.meta.env.DEV) {
    console.log('📊 Dashboard Data:', {
      dashboardData,
      droplets: droplets.length,
      volumes: volumes.length,
      buckets: buckets.length,
      tokens: tokens.length,
      isLoading
    })

    // Debug logging for spaces data
    console.log('☁️ Spaces Data:', {
      spacesData,
      buckets,
      bucketsCount: buckets.length,
      spacesLoading
    })
  }

  // Extract GenAI data
  const genaiWorkspaces = genaiData?.workspaces?.workspaces || []
  const genaiAgents = genaiData?.agents?.agents || []
  const genaiModels = genaiData?.models?.models || []

  // Debug logging
  console.log('🔍 Dashboard GenAI Data:', {
    genaiData,
    genaiAgents,
    agentsCount: genaiAgents.length,
    genaiLoading
  })

  const isEmptyState = droplets.length === 0 && !isLoading

  const stats = [
    {
      name: 'Total Droplets',
      value: summary?.total_droplets?.toString() || '0',
      icon: ServerIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Droplets',
      value: droplets.filter(d => d.status === 'active').length.toString(),
      icon: CpuChipIcon,
      color: 'bg-green-500',
    },
    {
      name: 'AI Agents',
      value: genaiAgents.length.toString(),
      icon: SparklesIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Volumes',
      value: summary?.total_volumes?.toString() || '0',
      icon: CircleStackIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Spaces Buckets',
      value: summary?.total_buckets?.toString() || '0',
      icon: CloudIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'API Tokens',
      value: (userTokens?.length || 0).toString(),
      icon: KeyIcon,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6 bg-gray-900 min-h-screen">
      {/* Welcome Section */}
      <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user?.username}!
              </h1>
              <p className="mt-1 text-sm text-gray-300">
                Manage your Windows VPS instances with ease
              </p>
            </div>
            <Link
              to="/dashboard/create-vps-do"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Droplet
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-300 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-white">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Droplets */}
      <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-white">
              Recent Droplets
            </h3>
            <Link
              to="/dashboard/droplets"
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-700">
          {isLoading ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : isEmptyState ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">No droplets found</h3>
              <p className="mt-1 text-sm text-gray-400">
                Your DigitalOcean account has no droplets yet. Create your first Windows VPS!
              </p>
              <div className="mt-6">
                <Link
                  to="/dashboard/create-vps-do"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Droplet
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {droplets.slice(0, 5).map((droplet) => (
                <li key={droplet.id}>
                  <Link to={`/dashboard/droplets/${droplet.id}`} className="block hover:bg-gray-700">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <ServerIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {droplet.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {droplet.region?.name || droplet.region?.slug} • {droplet.size?.slug}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${droplet.status === 'active' ? 'bg-green-900 text-green-200' :
                              droplet.status === 'building' ? 'bg-yellow-900 text-yellow-200' :
                                'bg-red-900 text-red-200'
                            }`}>
                            {droplet.status}
                          </span>
                          <div className="ml-4 text-sm text-gray-400">
                            {droplet.networks?.v4?.[0]?.ip_address && (
                              <div>{droplet.networks.v4[0].ip_address}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI Agents Section */}
      <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-white">
              AI Agents
            </h3>
            <div className="flex items-center space-x-3">
              <Link
                to="/dashboard/ai-agents"
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                View all
              </Link>
              <button
                onClick={() => {/* TODO: Open create agent modal */}}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                Create Agent
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700">
          {genaiLoading ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : genaiAgents.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <SparklesIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">No AI agents found</h3>
              <p className="mt-1 text-sm text-gray-400">
                Create your first AI agent to start generating content and stories.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {/* TODO: Open create agent modal */}}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Create AI Agent
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {genaiAgents.slice(0, 5).map((agent: any) => (
                <li key={agent.uuid || agent.id} className="px-4 py-4 hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <SparklesIcon className="h-5 w-5 text-purple-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-white">{agent.name || 'Unknown Agent'}</p>
                        <p className="text-xs text-gray-400">
                          {agent.description || 'No description'} • {' '}
                          {typeof agent.model === 'string' ? agent.model : (agent.model as any)?.name || 'No model'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.deployment?.status === 'STATUS_RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.deployment?.status === 'STATUS_RUNNING' ? 'running' : (agent.status || 'active')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Volumes & Buckets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Volumes */}
        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white">
                Recent Volumes
              </h3>
              <Link
                to="/dashboard/volumes"
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-700">
            {isLoading ? (
              <div className="px-4 py-5 sm:px-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ) : volumes.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center">
                <CircleStackIcon className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No volumes found</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Create your first volume for additional storage.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {volumes.slice(0, 3).map((volume) => (
                  <li key={volume.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <CircleStackIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {volume.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {volume.size_gigabytes} GB • {volume.region?.name || volume.region?.slug}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            volume.status === 'available' ? 'bg-green-900 text-green-200' :
                            volume.status === 'attached' ? 'bg-blue-900 text-blue-200' :
                            'bg-yellow-900 text-yellow-200'
                          }`}>
                            {volume.status}
                          </span>
                          {volume.droplet_ids?.length > 0 && (
                            <div className="ml-4 text-sm text-gray-400">
                              Attached to {volume.droplet_ids.length} droplet(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Buckets */}
        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white">
                Spaces Buckets
              </h3>
              <Link
                to="/dashboard/spaces"
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-700">
            {isLoading ? (
              <div className="px-4 py-5 sm:px-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ) : buckets.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center">
                <CloudIcon className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No buckets found</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Create your first Spaces bucket for object storage.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {buckets.slice(0, 3).map((bucket, index) => (
                  <li key={`${bucket.name}-${index}`}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <CloudIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {bucket.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {bucket.region} • {bucket.creation_date ? new Date(bucket.creation_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* API Tokens */}
      <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-white">
              API Tokens
            </h3>
            <Link
              to="/dashboard/settings"
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Manage tokens
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-700">
          {userTokens && userTokens.length > 0 ? (
            <ul className="divide-y divide-gray-700">
              {userTokens.slice(0, 3).map((token, index) => (
                <li key={`${token.name}-${index}`}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <KeyIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {token.name}
                          </div>
                          <div className="text-sm text-gray-400 font-mono">
                            {token.masked_token || '••••••••••••••••'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          token.status === 'valid' ? 'bg-green-900 text-green-200' :
                          token.status === 'invalid' ? 'bg-red-900 text-red-200' :
                          'bg-yellow-900 text-yellow-200'
                        }`}>
                          {token.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">No API tokens</h3>
              <p className="mt-1 text-sm text-gray-400">
                Add DigitalOcean API tokens to manage your resources.
              </p>
              <div className="mt-6">
                <Link
                  to="/dashboard/settings"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Token
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/dashboard/create-vps-do"
              className="relative group bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-600"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-primary-900 text-primary-300 group-hover:bg-primary-800">
                  <PlusIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white">
                  Create Droplet
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Start a new Windows VPS instance
                </p>
              </div>
            </Link>

            <Link
              to="/droplets"
              className="relative group bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-600"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-900 text-blue-300 group-hover:bg-blue-800">
                  <ServerIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white">
                  Manage Droplets
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  View and manage all droplets
                </p>
              </div>
            </Link>

            <Link
              to="/analytics"
              className="relative group bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-600"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-900 text-green-300 group-hover:bg-green-800">
                  <ChartBarIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white">
                  Analytics
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  View usage and performance
                </p>
              </div>
            </Link>

            <button
              onClick={() => {/* TODO: Open create agent modal */}}
              className="relative group bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-600 text-left w-full"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-900 text-purple-300 group-hover:bg-purple-800">
                  <SparklesIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white">
                  Create AI Agent
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Build intelligent AI assistants
                </p>
              </div>
            </button>

            <div className="relative group bg-gray-700 p-6 rounded-lg border border-gray-600">{/* Coming Soon moved to last position */}
              <div>
                <span className="rounded-lg inline-flex p-3 bg-gray-800 text-gray-500">
                  <CpuChipIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-400">
                  Coming Soon
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  More features coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
