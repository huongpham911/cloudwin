import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  ServerIcon,
  ArrowPathIcon,
  TrashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CameraIcon,
  DocumentDuplicateIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { dropletsApi } from '../../services/api'
import DropletDetailTabs from './DropletDetailTabs'
import toast from 'react-hot-toast'

interface Droplet {
  id: string
  name: string
  status: string
  build_progress: number
  rdp_ip?: string
  rdp_port: number
  rdp_username?: string
  rdp_password?: string
  build_log?: string
  error_message?: string
  region: string | { slug?: string; name?: string; [key: string]: any }
  size: string | { slug?: string; name?: string; [key: string]: any }
  hourly_cost?: string
  monthly_cost?: string
  created_at: string
  updated_at: string
  account_id?: number
  account_token?: string
  vcpus?: number
  memory?: number
  disk?: number
  networks?: any
  kernel?: any
}

const DropletDetailSimple: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch droplet data from the new backend endpoint
  const { data: droplet, isLoading, error } = useQuery({
    queryKey: ['droplet', id],
    queryFn: () => fetch(`http://localhost:5000/api/v1/droplets/${id}`).then(r => r.json()),
    refetchInterval: 30000,
    enabled: !!id
  })

  // Fetch additional droplet details
  const { data: backups } = useQuery({
    queryKey: ['droplet-backups', id],
    queryFn: () => fetch(`http://localhost:5000/api/v1/droplets/${id}/backups`).then(r => r.json()),
    enabled: !!id && activeTab === 'backups'
  })

  const { data: neighbors } = useQuery({
    queryKey: ['droplet-neighbors', id],
    queryFn: () => fetch(`http://localhost:5000/api/v1/droplets/${id}/neighbors`).then(r => r.json()),
    enabled: !!id && activeTab === 'networking'
  })

  // Mutations
  const restartMutation = useMutation({
    mutationFn: () => dropletsApi.restart(id!),
    onSuccess: () => {
      toast.success('Droplet restart initiated')
      queryClient.invalidateQueries({ queryKey: ['droplet', id] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to restart droplet')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => dropletsApi.delete(id!),
    onSuccess: () => {
      toast.success('Droplet deleted successfully')
      navigate('/dashboard/droplets')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete droplet')
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'new':
      case 'creating':
        return 'bg-yellow-100 text-yellow-800'
      case 'off':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const handleDelete = () => {
    const regionText = typeof droplet?.region === 'object' ? droplet.region?.slug || droplet.region?.name : droplet?.region
    const sizeText = typeof droplet?.size === 'object' ? droplet.size?.slug || droplet.size?.name : droplet?.size
    
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `Droplet: "${droplet?.name}"\n` +
      `IP: ${droplet?.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}\n` +
      `Region: ${regionText}\n` +
      `Size: ${sizeText}\n` +
      `Account: ${droplet?.account_id !== undefined ? `Account ${droplet.account_id + 1}` : 'N/A'}\n\n` +
      `🔴 THIS WILL PERMANENTLY DELETE:\n` +
      `• The entire droplet and all data\n` +
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
        `This will permanently destroy "${droplet?.name}" and all its data.`
      )

      if (confirmText === 'DELETE') {
        deleteMutation.mutate()
      } else if (confirmText !== null) {
        toast.error('Deletion cancelled - confirmation text did not match')
      }
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: InformationCircleIcon },
    { id: 'graphs', name: 'Graphs', icon: ChartBarIcon },
    { id: 'snapshots', name: 'Snapshots', icon: CameraIcon },
    { id: 'backups', name: 'Backups', icon: DocumentDuplicateIcon },
    { id: 'networking', name: 'Networking', icon: GlobeAltIcon },
    { id: 'kernel', name: 'Kernel', icon: CpuChipIcon },
    { id: 'recovery', name: 'Recovery', icon: ShieldCheckIcon }
  ]

  const regionText = typeof droplet?.region === 'object' ? droplet.region?.slug || droplet.region?.name : droplet?.region
  const sizeText = typeof droplet?.size === 'object' ? droplet.size?.slug || droplet.size?.name : droplet?.size

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading droplet details...</p>
      </div>
    )
  }

  if (error || !droplet) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Droplet not found</h3>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          The droplet you're looking for doesn't exist or has been deleted.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard/droplets')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Droplets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard/droplets')}
            className={`mr-4 p-2 rounded-md ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeftIcon className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <div className="flex-shrink-0">
            <div className={`h-12 w-12 rounded-full ${isDark ? 'bg-blue-900' : 'bg-blue-100'} flex items-center justify-center`}>
              <ServerIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{droplet.name}</h1>
            <div className="flex items-center mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(droplet.status)}`}>
                {droplet.status}
              </span>
              <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {regionText} • {sizeText}
              </span>
              {droplet.account_id !== undefined && (
                <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  • Account {droplet.account_id + 1}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {droplet.status === 'active' && (
            <button
              onClick={() => restartMutation.mutate()}
              disabled={restartMutation.isPending}
              className={`inline-flex items-center px-3 py-2 border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Restart
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={`inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 ${isDark ? 'bg-gray-800 hover:bg-red-900' : 'bg-white hover:bg-red-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50`}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
        <div className="px-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? `border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                    : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <DropletDetailTabs 
            droplet={droplet}
            activeTab={activeTab}
            backups={backups}
            neighbors={neighbors}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(droplet.status)}`}>
                    {droplet.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Region:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{regionText}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Size:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{sizeText}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>vCPUs:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{droplet.vcpus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Memory:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{droplet.memory ? `${droplet.memory} MB` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Disk:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{droplet.disk ? `${droplet.disk} GB` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Created:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(droplet.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Quick Actions
              </h3>
              <div className="space-y-3">
                {droplet.status === 'active' && (
                  <button
                    onClick={() => restartMutation.mutate()}
                    disabled={restartMutation.isPending}
                    className={`w-full inline-flex justify-center items-center px-4 py-2 border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Restart Droplet
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 ${isDark ? 'bg-gray-800 hover:bg-red-900' : 'bg-white hover:bg-red-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50`}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Droplet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DropletDetailSimple 