import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  PlusIcon,
  ServerIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  KeyIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { dropletsApi } from '../../services/droplets'
import { analyticsApi } from '../../services/analytics'
import { accountsApi } from '../../services/accounts'
import { tokenService } from '../../services/tokenService'
import { api } from '../../services/api'
import NoTokenMessage from '../common/NoTokenMessage'
import AccountCard from './AccountCard'
import toast from 'react-hot-toast'

interface Droplet {
  id: string
  name: string
  status: string
  build_progress: number
  rdp_ip?: string
  rdp_port: number
  region: string | { slug?: string; name?: string;[key: string]: any }
  size: string | { slug?: string; name?: string;[key: string]: any }
  hourly_cost?: string
  monthly_cost?: string
  created_at: string
  updated_at: string
  account_id?: number
  account_token?: string
}

const DropletsList: React.FC = () => {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tokensLoaded, setTokensLoaded] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(true)
  const queryClient = useQueryClient()

  const isAdmin = user?.role === 'admin' || user?.is_admin === true

  // Auto-load tokens when component mounts
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoadingTokens(true)

        // Load tokens from backend
        const response = await api.get(`/api/v1/settings/tokens?t=${Date.now()}`)

        if (response.data.tokens && response.data.tokens.length > 0) {
          // Transform to frontend format
          const transformedTokens = response.data.tokens.map((token: any, index: number) => ({
            name: `Account ${index + 1}`,
            token: token.token,
            added_at: new Date().toISOString(),
            is_valid: token.status === 'valid'
          }))

          // Update token service
          tokenService.setTokens(transformedTokens)

          // Trigger backend reload
          try {
            await api.post('/api/v1/settings/tokens/reload')
          } catch (reloadError) {
            console.warn('⚠️ Failed to reload backend clients:', reloadError)
          }

          setTokensLoaded(true)
        } else {
          setTokensLoaded(false)
        }
      } catch (error) {
        console.error('❌ Failed to auto-load tokens:', error)
        setTokensLoaded(false)
      } finally {
        setIsLoadingTokens(false)
      }
    }

    loadTokens()
  }, [])

  // Check if we have valid tokens
  const hasValidTokens = tokensLoaded && tokenService.hasValidTokens()

  // Fetch droplets (user-scoped for regular users) - enabled conditionally
  const { data: droplets = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['droplets', user?.id, tokensLoaded],
    queryFn: dropletsApi.list,
    select: (response) => Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: tokensLoaded && hasValidTokens, // Only run when tokens are loaded
  })

  // Fetch analytics for statistics - enabled conditionally
  const { data: analytics, isFetching: isAnalyticsFetching } = useQuery({
    queryKey: ['analytics-overview', tokensLoaded],
    queryFn: () => analyticsApi.getOverview('7d'),
    select: (response) => response.data,
    refetchInterval: 60000, // Refresh every minute
    enabled: tokensLoaded && hasValidTokens,
  })

  // Fetch accounts information - enabled conditionally
  const { data: accounts, isFetching: isAccountsFetching } = useQuery({
    queryKey: ['accounts', tokensLoaded],
    queryFn: accountsApi.getAccounts,
    select: (response) => response.data,
    refetchInterval: 60000, // Refresh every minute
    enabled: tokensLoaded && hasValidTokens,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: dropletsApi.delete,
    onSuccess: () => {
      toast.success('Droplet deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['droplets'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete droplet')
    }
  })

  // Restart mutation
  const restartMutation = useMutation({
    mutationFn: dropletsApi.restart,
    onSuccess: () => {
      toast.success('Droplet restart initiated')
      queryClient.invalidateQueries({ queryKey: ['droplets'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to restart droplet')
    }
  })

  // Show loading state while checking tokens
  if (isLoadingTokens) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Đang tải cấu hình tokens...</p>
        </div>
      </div>
    )
  }

  // Show token message if no valid tokens
  if (!hasValidTokens) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NoTokenMessage
          message="Bạn cần cấu hình DigitalOcean API token để quản lý VPS. Vào Settings để thêm token."
        />
      </div>
    )
  }

  // Filter droplets
  const filteredDroplets = Array.isArray(droplets) ? droplets.filter((droplet: Droplet) => {
    const matchesSearch = droplet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      droplet.region.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || droplet.status === statusFilter
    return matchesSearch && matchesStatus
  }) : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'building':
      case 'creating':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'stopped':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const handleDelete = (droplet: Droplet) => {
    const regionText = typeof droplet.region === 'object' ? droplet.region?.slug || droplet.region?.name || 'Unknown' : droplet.region || 'Unknown'
    const sizeText = typeof droplet.size === 'object' ? droplet.size?.slug || droplet.size?.name || 'Unknown' : droplet.size || 'Unknown'

    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `Droplet: "${droplet.name}"\n` +
      `Status: ${droplet.status}\n` +
      `Region: ${regionText}\n` +
      `Size: ${sizeText}\n` +
      `Account: ${droplet.account_id !== undefined ? `Account ${droplet.account_id + 1}` : 'N/A'}\n\n` +
      `🔴 THIS WILL PERMANENTLY DELETE:\n` +
      `• The entire VPS and all data\n` +
      `• All files, applications, and configurations\n` +
      `• All snapshots and backups (if any)\n` +
      `• The assigned IP address\n\n` +
      `💾 DATA RECOVERY: IMPOSSIBLE after deletion\n\n` +
      `Are you absolutely sure you want to continue?\n\n` +
      `Type 'DELETE' in the next prompt to confirm.`
    )

    if (confirmed) {
      const confirmText = prompt(
        `Final confirmation required.\n\n` +
        `Type exactly: DELETE\n\n` +
        `This will permanently destroy "${droplet.name}" and all its data.`
      )

      if (confirmText === 'DELETE') {
        deleteMutation.mutate(droplet.id)
      } else if (confirmText !== null) {
        toast.error('Deletion cancelled - confirmation text did not match')
      }
    }
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load droplets</div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['droplets'] })}
          className="text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isAdmin ? 'My Droplets' : 'Droplets'}
              {(isFetching || isAnalyticsFetching || isAccountsFetching) && (
                <span className="ml-2 text-blue-500">
                  <ArrowPathIcon className="inline w-5 h-5 animate-spin" />
                </span>
              )}
            </h1>
            {isAdmin && (
              <div className="ml-3 flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                Admin View
              </div>
            )}
          </div>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {isAdmin
              ? `Your personal VPS instances${analytics?.overview?.total_accounts ? ` across ${analytics.overview.total_accounts} accounts` : ''}`
              : `Manage your Windows VPS instances${analytics?.overview?.total_accounts ? ` across ${analytics.overview.total_accounts} DigitalOcean accounts` : ''}`
            }
            {(isFetching || isAnalyticsFetching || isAccountsFetching) && (
              <span className="ml-1 text-blue-500">• Refreshing data...</span>
            )}
          </p>
          {isAdmin && (
            <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
              <span>💡 Viewing your personal droplets only. Visit</span>
              <Link
                to="/admin/droplets"
                className="mx-1 text-blue-500 hover:text-blue-400 font-medium"
              >
                Admin Panel
              </Link>
              <span>to manage all system droplets.</span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['droplets'] })
              queryClient.invalidateQueries({ queryKey: ['analytics-overview'] })
              queryClient.refetchQueries({ queryKey: ['droplets'] })
              queryClient.refetchQueries({ queryKey: ['analytics-overview'] })
            }}
            className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isDark
              ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
          <Link
            to="/dashboard/create-vps-do"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Droplet
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      {analytics?.overview && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Droplets */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center">
                    <ServerIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                      Total Droplets
                    </dt>
                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.overview.total_droplets}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Droplets */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-md bg-green-500 flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                      Active
                    </dt>
                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.overview.active_droplets}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Building/Inactive */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-md bg-yellow-500 flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                      Building/Other
                    </dt>
                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.overview.total_droplets - analytics.overview.active_droplets}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Accounts */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-md bg-purple-500 flex items-center justify-center">
                    <KeyIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                      Accounts
                    </dt>
                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.overview.total_accounts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DigitalOcean Accounts */}
      {accounts && accounts.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            DigitalOcean Accounts
          </h3>
          <div className="space-y-4">
            {accounts.map((account) => {
              // Find account breakdown for this account
              const accountBreakdown = analytics?.account_breakdown?.find(
                breakdown => breakdown.account_id === account.account_id
              )

              return (
                <AccountCard
                  key={account.account_id}
                  account={account}
                  totalDroplets={accountBreakdown?.total_droplets || 0}
                  activeDroplets={accountBreakdown?.active_droplets || 0}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Regional & Size Distribution */}
      {analytics?.regional_distribution && analytics.regional_distribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Distribution */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Regional Distribution
              </h3>
              <div className="space-y-3">
                {analytics.regional_distribution.map((region) => (
                  <div key={region.region} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full bg-blue-500 mr-3`}></div>
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {region.region.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {region.count} droplets
                      </span>
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {region.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Size Distribution */}
          {analytics?.size_distribution && analytics.size_distribution.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Size Distribution
                </h3>
                <div className="space-y-3">
                  {analytics.size_distribution.map((size) => (
                    <div key={size.size} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full bg-green-500 mr-3`}></div>
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {size.size}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {size.count} droplets
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Search
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} aria-hidden="true" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md`}
                  placeholder="Search droplets..."
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="building">Building</option>
                <option value="error">Error</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Droplets List */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden sm:rounded-md transition-colors duration-300`}>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading droplets...</p>
          </div>
        ) : filteredDroplets.length === 0 ? (
          <div className="text-center py-12">
            <ServerIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {searchTerm || statusFilter !== 'all' ? 'No droplets found' : 'No droplets'}
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new Windows droplet.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="mt-6">
                <Link
                  to="/dashboard/create-vps-do"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create your first droplet
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredDroplets.map((droplet: Droplet) => (
              <li key={droplet.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full ${isDark ? 'bg-blue-900' : 'bg-blue-100'} flex items-center justify-center`}>
                          <ServerIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center">
                          <Link
                            to={`/dashboard/droplets/${droplet.id}`}
                            className={`text-sm font-medium ${isDark ? 'text-white hover:text-blue-300' : 'text-gray-900 hover:text-blue-600'} truncate cursor-pointer transition-colors duration-200`}
                          >
                            {droplet.name}
                          </Link>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(droplet.status)
                            }`}>
                            {droplet.status}
                          </span>
                        </div>
                        <div className={`mt-1 flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span>
                            {typeof droplet.region === 'object' ? droplet.region?.slug || droplet.region?.name || 'Unknown Region' : droplet.region || 'Unknown Region'} • {' '}
                            {typeof droplet.size === 'object' ? droplet.size?.slug || droplet.size?.name || 'Unknown Size' : droplet.size || 'Unknown Size'}
                          </span>
                          {droplet.rdp_ip && (
                            <span className="ml-2">• {droplet.rdp_ip}</span>
                          )}
                          {droplet.monthly_cost && (
                            <span className="ml-2">• ${droplet.monthly_cost}/month</span>
                          )}
                          {droplet.account_id !== undefined && (
                            <span className="ml-2">• Account {droplet.account_id + 1}</span>
                          )}
                        </div>
                        {droplet.status === 'building' && (
                          <div className="mt-2">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${droplet.build_progress}%` }}
                                />
                              </div>
                              <span className="ml-2 text-xs text-gray-500">
                                {droplet.build_progress}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/dashboard/droplets/${droplet.id}`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      {droplet.status === 'ready' && (
                        <button
                          onClick={() => restartMutation.mutate(droplet.id)}
                          disabled={restartMutation.isPending}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(droplet)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary */}
      {filteredDroplets.length > 0 && (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
          <div className="px-4 py-5 sm:p-6">
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Showing {filteredDroplets.length} of {droplets.length} droplets
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-500"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DropletsList