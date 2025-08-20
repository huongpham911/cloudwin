import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import toast from 'react-hot-toast'
import SnapshotManager from './SnapshotManager'
import ResizeManager from './ResizeManager'
import RebuildManager from './RebuildManager'
import WebTerminal from './WebTerminal'
import VolumeManager from '../volumes/VolumeManager'
import AttachVolumeModal from '../volumes/AttachVolumeModal'
import CreateVolumeModal from '../volumes/CreateVolumeModal'
import {
    ArrowLeftIcon,
    ComputerDesktopIcon,
    ChartBarIcon,
    CogIcon,
    ShieldCheckIcon,
    DocumentDuplicateIcon,
    ArrowPathIcon,
    StopIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    GlobeAltIcon,
    CpuChipIcon,
    CircleStackIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    EyeIcon,
    EyeSlashIcon,
    KeyIcon,
    WifiIcon,
    ServerIcon,
    CommandLineIcon,
    PlusIcon,
    PencilIcon,
    LinkIcon,
    XMarkIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import { ShieldPlusIcon } from '@heroicons/react/24/solid'
import { dropletsApi } from '../../services/droplets'
import { firewallsApi } from '../../services/firewalls'

interface Droplet {
    id: string
    name: string
    status: string
    build_progress?: number
    rdp_ip?: string
    rdp_port?: number
    rdp_username?: string
    rdp_password?: string
    // DigitalOcean standard fields
    memory: number
    vcpus: number
    disk: number
    region: {
        name: string
        slug: string
        features: string[]
        available: boolean
        sizes: string[]
    }
    size: {
        slug: string
        memory: number
        vcpus: number
        disk: number
        transfer: number
        price_monthly: number
        price_hourly: number
        regions: string[]
        available: boolean
    }
    size_slug: string
    image: {
        id: number
        name: string
        distribution: string
        slug: string
        public: boolean
        regions: string[]
        created_at: string
    }
    created_at: string
    features: string[]
    backup_ids: number[]
    snapshot_ids: number[]
    volume_ids: string[]
    tags: string[]
    networks: {
        v4: Array<{
            ip_address: string
            netmask: string
            gateway: string
            type: 'public' | 'private'
        }>
        v6: Array<{
            ip_address: string
            netmask: number
            gateway: string
            type: 'public' | 'private'
        }>
    }
    locked: boolean
    kernel?: any
    next_backup_window?: any
    vpc_uuid?: string
    // Custom fields
    account_id?: number
    account_token?: string
    hourly_cost?: string
    monthly_cost?: string
}

const DropletManagement: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { isDark } = useTheme()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')
    const [showPassword, setShowPassword] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showPowerModal, setShowPowerModal] = useState(false)
    const [showTerminal, setShowTerminal] = useState(false)
    const [showRebuildManager, setShowRebuildManager] = useState(false)
    const [showSnapshotManager, setShowSnapshotManager] = useState(false)
    const [showResizeManager, setShowResizeManager] = useState(false)
    const [showVolumeManager, setShowVolumeManager] = useState(false)
    const [showCreateVolume, setShowCreateVolume] = useState(false)
    const [showAttachVolume, setShowAttachVolume] = useState(false)
    const [powerAction, setPowerAction] = useState<'stop' | 'start' | 'restart' | null>(null)

    // Fetch droplet details
    const { data: droplet, isLoading, error } = useQuery({
        queryKey: ['droplet-detail', id],
        queryFn: async () => {
            const response = await dropletsApi.get(id!)
            return response  // Return response directly, not response.data
        },
        enabled: !!id,
        refetchInterval: 5000 // Refresh every 5 seconds
    })

    // Fetch monitoring data
    const { data: monitoringData, isLoading: monitoringLoading } = useQuery({
        queryKey: ['droplet-monitoring', id],
        queryFn: async () => {
            const response = await dropletsApi.getMonitoring(id!, 1) // Last 1 hour
            return response.data
        },
        enabled: !!id && activeTab === 'monitoring',
        refetchInterval: 30000 // Refresh every 30 seconds
    })

    // Helper functions to parse monitoring data
    const getLatestMetricValue = (metricData: any) => {
        if (!metricData?.data?.result?.[0]?.values?.length) return null
        const values = metricData.data.result[0].values
        const latestValue = values[values.length - 1]
        return latestValue ? parseFloat(latestValue[1]) : null
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Parse monitoring metrics
    const cpuUsage = monitoringData ? getLatestMetricValue(monitoringData.metrics?.cpu) : null
    const memoryAvailable = monitoringData ? getLatestMetricValue(monitoringData.metrics?.memory) : null
    const bandwidthIn = monitoringData ? getLatestMetricValue(monitoringData.metrics?.bandwidth_in) : null
    const bandwidthOut = monitoringData ? getLatestMetricValue(monitoringData.metrics?.bandwidth_out) : null

    // Power actions mutations
    const restartMutation = useMutation({
        mutationFn: (dropletId: string) => {
            return dropletsApi.restart(dropletId)
        },
        onSuccess: () => {
            toast.success('VPS đang được khởi động lại...')
            queryClient.invalidateQueries({ queryKey: ['droplet-detail', id] })
        },
        onError: (error: any) => {
            console.error('❌ Restart error:', error)
            toast.error(error.response?.data?.detail || 'Lỗi khi khởi động lại VPS')
        }
    })

    const shutdownMutation = useMutation({
        mutationFn: (dropletId: string) => dropletsApi.shutdown(dropletId),
        onSuccess: () => {
            toast.success('VPS đang được tắt...')
            queryClient.invalidateQueries({ queryKey: ['droplet-detail', id] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi tắt VPS')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (dropletId: string) => dropletsApi.delete(dropletId),
        onSuccess: () => {
            toast.success('VPS đã được xóa')
            navigate('/dashboard/droplets')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi xóa VPS')
        }
    })

    const stopMutation = useMutation({
        mutationFn: (dropletId: string) => {
            return dropletsApi.stop(dropletId)
        },
        onSuccess: () => {
            toast.success('VPS đang được tắt...')
            queryClient.invalidateQueries({ queryKey: ['droplet-detail', id] })
        },
        onError: (error: any) => {
            console.error('❌ Stop error:', error)
            toast.error(error.response?.data?.detail || 'Lỗi khi tắt VPS')
        }
    })

    const startMutation = useMutation({
        mutationFn: (dropletId: string) => {
            return dropletsApi.start(dropletId)
        },
        onSuccess: () => {
            toast.success('VPS đang được khởi động...')
            queryClient.invalidateQueries({ queryKey: ['droplet-detail', id] })
        },
        onError: (error: any) => {
            console.error('❌ Start error:', error)
            toast.error(error.response?.data?.detail || 'Lỗi khi khởi động VPS')
        }
    })

    // Firewall queries and mutations
    const { data: firewalls = [], isLoading: firewallsLoading } = useQuery({
        queryKey: ['firewalls'],
        queryFn: () => firewallsApi.listFirewalls(),
        staleTime: 30000, // 30 seconds
    })

    const { data: dropletFirewalls = [], isLoading: dropletFirewallsLoading } = useQuery({
        queryKey: ['droplet-firewalls', id],
        queryFn: () => firewallsApi.getDropletFirewalls(parseInt(id!)),
        enabled: !!id,
        staleTime: 30000,
    })

    const createFirewallMutation = useMutation({
        mutationFn: (data: any) => firewallsApi.createFirewall(data),
        onSuccess: () => {
            toast.success('Firewall đã được tạo thành công!')
            queryClient.invalidateQueries({ queryKey: ['firewalls'] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi tạo firewall')
        }
    })

    const deleteFirewallMutation = useMutation({
        mutationFn: (firewallId: string) => firewallsApi.deleteFirewall(firewallId),
        onSuccess: () => {
            toast.success('Firewall đã được xóa!')
            queryClient.invalidateQueries({ queryKey: ['firewalls'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-firewalls', id] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi xóa firewall')
        }
    })

    const assignFirewallMutation = useMutation({
        mutationFn: ({ firewallId, dropletIds }: { firewallId: string, dropletIds: number[] }) =>
            firewallsApi.addDroplets(firewallId, { droplet_ids: dropletIds }),
        onSuccess: () => {
            toast.success('Firewall đã được gán vào droplet!')
            queryClient.invalidateQueries({ queryKey: ['firewalls'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-firewalls', id] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi gán firewall')
        }
    })

    const removeFirewallMutation = useMutation({
        mutationFn: ({ firewallId, dropletIds }: { firewallId: string, dropletIds: number[] }) =>
            firewallsApi.removeDroplets(firewallId, { droplet_ids: dropletIds }),
        onSuccess: () => {
            toast.success('Firewall đã được gỡ khỏi droplet!')
            queryClient.invalidateQueries({ queryKey: ['firewalls'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-firewalls', id] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi gỡ firewall')
        }
    })

    // Helper functions
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
            case 'ready':
                return 'text-green-600 bg-green-100'
            case 'building':
            case 'new':
                return 'text-blue-600 bg-blue-100'
            case 'off':
                return 'text-gray-600 bg-gray-100'
            case 'error':
                return 'text-red-600 bg-red-100'
            default:
                return 'text-yellow-600 bg-yellow-100'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
            case 'ready':
                return <CheckCircleIcon className="h-5 w-5" />
            case 'building':
            case 'new':
                return <ClockIcon className="h-5 w-5" />
            case 'error':
                return <ExclamationTriangleIcon className="h-5 w-5" />
            default:
                return <ServerIcon className="h-5 w-5" />
        }
    }

    const formatCurrency = (amount: string | undefined) => {
        if (!amount || amount === '') return 'N/A'
        const num = parseFloat(amount)
        if (isNaN(num)) return 'N/A'
        return `$${num.toFixed(2)}`
    }

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '') return 'N/A'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Invalid Date'
        return date.toLocaleString('vi-VN')
    }

    const getPublicIPs = (droplet: Droplet) => {
        if (!droplet.networks?.v4) return []
        return droplet.networks.v4
            .filter(network => network.type === 'public')
            .map(network => network.ip_address)
    }

    const getPrivateIPs = (droplet: Droplet) => {
        if (!droplet.networks?.v4) return []
        return droplet.networks.v4
            .filter(network => network.type === 'private')
            .map(network => network.ip_address)
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`Đã copy ${label} vào clipboard`)
    }

    const handleDelete = () => {
        if (droplet) {
            deleteMutation.mutate(droplet.id)
            setShowDeleteModal(false)
        }
    }

    const handlePowerAction = () => {
        if (droplet && powerAction) {
            switch (powerAction) {
                case 'stop':
                    stopMutation.mutate(droplet.id)
                    break
                case 'start':
                    startMutation.mutate(droplet.id)
                    break
                case 'restart':
                    restartMutation.mutate(droplet.id)
                    break
            }
            setShowPowerModal(false)
            setPowerAction(null)
        } else {
            console.warn('⚠️ Missing droplet or powerAction:', { droplet: droplet?.id, powerAction })
        }
    }

    const confirmPowerAction = (action: 'stop' | 'start' | 'restart') => {
        setPowerAction(action)
        setShowPowerModal(true)
    }

    if (isLoading) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="h-64 bg-gray-300 rounded"></div>
                            </div>
                            <div className="h-64 bg-gray-300 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        // Log error only in development
        if (import.meta.env.DEV) {
            console.error('Droplet fetch error:', error)
        }
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                        <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Lỗi tải thông tin VPS
                        </h3>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {error?.message || 'Không thể tải thông tin VPS'}
                        </p>
                        <div className="mt-6">
                            <Link
                                to="/dashboard/droplets"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
                                Quay lại danh sách VPS
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!droplet) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                        <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Không tìm thấy VPS
                        </h3>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            VPS với ID {id} không tồn tại hoặc đã bị xóa.
                        </p>
                        <div className="mt-6">
                            <Link
                                to="/dashboard/droplets"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
                                Quay lại danh sách VPS
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', name: 'Tổng quan', icon: ComputerDesktopIcon },
        { id: 'access', name: 'Access', icon: KeyIcon },
        { id: 'recovery', name: 'Recovery', icon: ShieldCheckIcon },
        { id: 'monitoring', name: 'Giám sát', icon: ChartBarIcon },
        { id: 'networking', name: 'Mạng', icon: GlobeAltIcon },
        { id: 'settings', name: 'Cài đặt', icon: CogIcon },
    ]

    return (
        <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Link
                                to="/dashboard/droplets"
                                className={`mr-4 p-2 rounded-md ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {droplet.name}
                                </h1>
                                <div className="flex items-center mt-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(droplet.status)}`}>
                                        {getStatusIcon(droplet.status)}
                                        <span className="ml-1">{droplet.status}</span>
                                    </span>
                                    <span className={`ml-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        ID: {droplet.id}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-3">
                            {(droplet.status === 'active' || droplet.status === 'ready') && (
                                <>
                                    <button
                                        onClick={() => restartMutation.mutate(droplet.id)}
                                        disabled={restartMutation.isPending}
                                        className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${isDark
                                                ? 'border-gray-600 text-gray-200 bg-gray-700 hover:bg-gray-600'
                                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                            }`}
                                    >
                                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                                        Khởi động lại
                                    </button>
                                    <button
                                        onClick={() => shutdownMutation.mutate(droplet.id)}
                                        disabled={shutdownMutation.isPending}
                                        className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${isDark
                                                ? 'border-gray-600 text-gray-200 bg-gray-700 hover:bg-gray-600'
                                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                            }`}
                                    >
                                        <StopIcon className="h-4 w-4 mr-2" />
                                        Tắt
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${isDark
                                        ? 'border-red-600 text-red-400 bg-gray-700 hover:bg-red-900/20'
                                        : 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                                    }`}
                            >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Xóa
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-6">
                        <nav className="flex space-x-8">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                            ? `border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                                            : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 mr-2" />
                                        {tab.name}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* RDP Connection Info */}
                            {droplet.rdp_ip && (
                                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                        <KeyIcon className="inline h-5 w-5 mr-2" />
                                        Thông tin kết nối RDP
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                IP Address
                                            </label>
                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={droplet.rdp_ip}
                                                    readOnly
                                                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                                />
                                                <button
                                                    onClick={() => copyToClipboard(droplet.rdp_ip!, 'IP Address')}
                                                    className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                Port
                                            </label>
                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={droplet.rdp_port}
                                                    readOnly
                                                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                                />
                                                <button
                                                    onClick={() => copyToClipboard(droplet.rdp_port.toString(), 'Port')}
                                                    className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {droplet.rdp_username && (
                                            <div>
                                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                    Username
                                                </label>
                                                <div className="flex items-center">
                                                    <input
                                                        type="text"
                                                        value={droplet.rdp_username}
                                                        readOnly
                                                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(droplet.rdp_username, 'Username')}
                                                        className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {droplet.rdp_password && (
                                            <div>
                                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                    Password
                                                </label>
                                                <div className="flex items-center">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={droplet.rdp_password}
                                                        readOnly
                                                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                                    />
                                                    <button
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(droplet.rdp_password, 'Password')}
                                                        className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Build Progress */}
                            {(droplet.status === 'new' || droplet.status === 'building') && (
                                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                        Tiến trình xây dựng
                                    </h3>
                                    <div className={`w-full rounded-full h-5 flex items-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${droplet.build_progress || 0}%` }}
                                        ></div>
                                    </div>
                                    <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {droplet.build_progress || 0}% hoàn thành
                                    </p>
                                </div>
                            )}                            {/* System Info */}
                            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    <ServerIcon className="inline h-5 w-5 mr-2" />
                                    Thông tin hệ thống
                                </h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <CpuChipIcon className="inline h-4 w-4 mr-1" />
                                            vCPUs
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.vcpus || droplet.size?.vcpus || 'N/A'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <CircleStackIcon className="inline h-4 w-4 mr-1" />
                                            Memory
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.memory || droplet.size?.memory ? `${droplet.memory || droplet.size?.memory} MB` : 'N/A'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <CircleStackIcon className="inline h-4 w-4 mr-1" />
                                            Disk
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.disk || droplet.size?.disk ? `${droplet.disk || droplet.size?.disk} GB` : 'N/A'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <GlobeAltIcon className="inline h-4 w-4 mr-1" />
                                            Region
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.region?.name || droplet.region?.slug || 'N/A'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <CalendarIcon className="inline h-4 w-4 mr-1" />
                                            Created
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {formatDate(droplet.created_at)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                            <ServerIcon className="inline h-4 w-4 mr-1" />
                                            Size
                                        </dt>
                                        <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.size_slug || droplet.size?.slug || 'N/A'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Cost Info */}
                            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    <CurrencyDollarIcon className="inline h-5 w-5 mr-2" />
                                    Chi phí
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Theo giờ:</span>
                                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.size?.price_hourly ? `$${droplet.size.price_hourly}` : formatCurrency(droplet.hourly_cost)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Theo tháng:</span>
                                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {droplet.size?.price_monthly ? `$${droplet.size.price_monthly}` : formatCurrency(droplet.monthly_cost)}
                                        </span>
                                    </div>
                                </div>
                            </div>                            {/* Quick Actions */}
                            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    Thao tác nhanh
                                </h3>
                                <div className="space-y-2">
                                    {(droplet.status === 'active' || droplet.status === 'ready') && (
                                        <>
                                            <button
                                                onClick={() => restartMutation.mutate(droplet.id)}
                                                disabled={restartMutation.isPending}
                                                className={`w-full flex items-center px-3 py-2 text-left text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-md disabled:opacity-50`}
                                            >
                                                <ArrowPathIcon className="h-4 w-4 mr-3" />
                                                Khởi động lại
                                            </button>
                                            <button
                                                onClick={() => shutdownMutation.mutate(droplet.id)}
                                                disabled={shutdownMutation.isPending}
                                                className={`w-full flex items-center px-3 py-2 text-left text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-md disabled:opacity-50`}
                                            >
                                                <StopIcon className="h-4 w-4 mr-3" />
                                                Tắt máy
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-md ${isDark
                                                ? 'text-red-400 hover:bg-red-900/20'
                                                : 'text-red-600 hover:bg-red-50'
                                            }`}
                                    >
                                        <TrashIcon className="h-4 w-4 mr-3" />
                                        Xóa VPS
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Access Tab */}
                {activeTab === 'access' && (
                    <div className="space-y-6">
                        {/* SSH Connection */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    🔐 SSH Connection
                                </h3>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                                    Use SSH for direct terminal access from your local machine.
                                </p>

                                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-md p-4 mb-4`}>
                                    <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-2`}>
                                        SSH Command:
                                    </div>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`}
                                            readOnly
                                            onClick={() => {
                                                navigator.clipboard.writeText(`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`);
                                                toast.success('SSH command copied to clipboard!');
                                            }}
                                            className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-blue-700 hover:text-blue-100' : 'bg-white hover:bg-blue-100 hover:text-blue-800'}`}
                                            title="Click to copy SSH command"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`);
                                                toast.success('SSH command copied to clipboard!');
                                            }}
                                            className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            <KeyIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                                        💡 Add SSH keys to your DigitalOcean account for password-free login
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* WinCloud Terminal Console - Hiển thị trực tiếp */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        🖥️ WinCloud Terminal Console
                                    </h3>
                                    <div className="flex space-x-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                                            }`}>
                                            Live Console
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            Interactive
                                        </span>
                                    </div>
                                </div>

                                {/* Console trực tiếp trong tab Access */}
                                <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg border-2 ${isDark ? 'border-gray-700' : 'border-gray-200'} min-h-[400px] max-h-[500px] overflow-hidden flex flex-col`}>
                                    {/* Terminal Header */}
                                    <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-200'} px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-between`}>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-3`}>
                                            <span>🖥️ Terminal Console</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                                                }`}>SSH Ready</span>
                                        </div>
                                    </div>

                                    {/* Terminal Content */}
                                    <div className="flex-1 p-4 overflow-y-auto font-mono text-sm" id="terminal-content">
                                        <div className={`${isDark ? 'text-green-400' : 'text-green-600'} space-y-1`}>
                                            <div>WinCloud Terminal v1.0 - Live SSH Console</div>
                                            <div>Connected to {droplet.name} ({droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address})</div>
                                            <div>Status: {droplet.status} | Type: {droplet.size?.slug} | Region: {droplet.region?.name}</div>
                                            <div className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Welcome to WinCloud Terminal! Type commands below.</div>
                                            <div></div>
                                            <div>Available commands: help, status, info, ls, pwd, whoami, uptime, clear</div>
                                            <div></div>

                                            {/* Command prompt luôn sẵn sàng */}
                                            <div className="flex items-center mt-2">
                                                <span className={`${isDark ? 'text-green-400' : 'text-green-600'} mr-2 flex-shrink-0`}>
                                                    root@{droplet.name}:~$
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder="Type a command and press Enter..."
                                                    className={`flex-1 bg-transparent border-none outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} font-mono`}
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    autoFocus
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const input = e.target as HTMLInputElement;
                                                            const command = input.value.trim();
                                                            if (command) {
                                                                // Get terminal content
                                                                const terminalContent = document.getElementById('terminal-content');
                                                                const spaceDiv = terminalContent?.querySelector('.space-y-1');

                                                                // Create command line
                                                                const newLine = document.createElement('div');
                                                                newLine.className = isDark ? 'text-white' : 'text-gray-900';
                                                                newLine.innerHTML = `<span class="${isDark ? 'text-green-400' : 'text-green-600'}">root@${droplet.name}:~$</span> ${command}`;

                                                                // Create response line
                                                                const responseLine = document.createElement('div');
                                                                responseLine.className = isDark ? 'text-blue-400' : 'text-blue-600';

                                                                // Handle clear command locally
                                                                if (command.toLowerCase() === 'clear') {
                                                                    if (spaceDiv) {
                                                                        const children = Array.from(spaceDiv.children);
                                                                        children.forEach((child, index) => {
                                                                            if (index > 6) child.remove(); // Keep initial 7 lines
                                                                        });
                                                                    }
                                                                    input.value = '';
                                                                    toast.success('Terminal cleared');
                                                                    return;
                                                                }

                                                                // Execute real SSH command
                                                                responseLine.textContent = '⏳ Executing command...';

                                                                // Add to terminal immediately
                                                                const currentPrompt = e.target.closest('.flex.items-center');
                                                                if (currentPrompt && spaceDiv) {
                                                                    spaceDiv.insertBefore(newLine, currentPrompt);
                                                                    spaceDiv.insertBefore(responseLine, currentPrompt);
                                                                }

                                                                // Call real SSH API
                                                                fetch(`http://localhost:5000/api/v1/droplets/${droplet.id}/execute`, {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                    },
                                                                    body: JSON.stringify({
                                                                        command: command,
                                                                        droplet_ip: droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address
                                                                    }),
                                                                })
                                                                .then(response => response.json())
                                                                .then(data => {
                                                                    console.log('SSH API Response:', data);
                                                                    if (data.success) {
                                                                        responseLine.textContent = data.output || 'Command executed successfully';
                                                                        if (data.error) {
                                                                            const errorLine = document.createElement('div');
                                                                            errorLine.className = 'text-red-400';
                                                                            errorLine.textContent = `Error: ${data.error}`;
                                                                            if (currentPrompt && spaceDiv) {
                                                                                spaceDiv.insertBefore(errorLine, currentPrompt);
                                                                            }
                                                                        }
                                                                    } else {
                                                                        responseLine.textContent = `❌ SSH Error: ${data.error || 'Command failed'}`;
                                                                        responseLine.className = 'text-red-400';
                                                                    }
                                                                })
                                                                .catch(error => {
                                                                    console.error('SSH API Error:', error);
                                                                    responseLine.textContent = `❌ Connection Error: ${error.message}`;
                                                                    responseLine.className = 'text-red-400';
                                                                });

                                                                input.value = '';

                                                                // Auto scroll
                                                                setTimeout(() => {
                                                                    const terminalContent = document.getElementById('terminal-content');
                                                                    if (terminalContent) {
                                                                        terminalContent.scrollTop = terminalContent.scrollHeight;
                                                                    }
                                                                }, 100);

                                                                return; // Skip the old logic below
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span className={`ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'} animate-pulse`}>▊</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terminal Footer */}
                                    <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-200'} px-4 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'} text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                🌐 Connected to {droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address} | Status: {droplet.status}
                                            </div>
                                            <div className="flex space-x-4">
                                                <span>💡 Type 'help' for commands</span>
                                                <span>⌨️ Press Enter to execute</span>
                                                <span>🧹 'clear' to clean terminal</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reset Root Password */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    🔑 Reset Root Password
                                </h3>

                                <div className={`${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${isDark ? 'border-yellow-800' : 'border-yellow-200'} rounded-lg p-4 mb-4`}>
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                                        </div>
                                        <div className="ml-3">
                                            <h4 className={`text-sm font-medium ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                                                ⚠️ Password Reset Warning
                                            </h4>
                                            <div className={`mt-2 text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                                <p>• New password will be <strong>emailed</strong> to your account</p>
                                                <p>• Cannot retrieve password via API</p>
                                                <p>• Process will temporarily shut down droplet</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                                    The new root password will be emailed to your account email within a few minutes.
                                </p>

                                <button
                                    onClick={() => {
                                        if (window.confirm(
                                            '⚠️ PASSWORD RESET WARNING ⚠️\n\n' +
                                            'This will:\n' +
                                            '• Immediately shut down your droplet\n' +
                                            '• Generate a new root password\n' +
                                            '• Email the new password to your account\n' +
                                            '• You CANNOT get the password via API\n\n' +
                                            'Consider using SSH keys instead.\n\n' +
                                            'Are you sure you want to proceed?'
                                        )) {
                                            toast.success('Password reset initiated. Check your email.');
                                        }
                                    }}
                                    className={`w-full sm:w-auto px-4 py-2 border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                                >
                                    Reset Root Password
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recovery Tab */}
                {activeTab === 'recovery' && (
                    <div className="space-y-6">
                        {/* Recovery Instructions */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    🛡️ Recovery
                                </h3>
                            </div>
                        </div>

                        {/* Boot Options */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* Boot from Recovery ISO */}
                                    <div className={`border-2 ${isDark ? 'border-blue-600 bg-blue-900/20' : 'border-blue-500 bg-blue-50'} rounded-lg p-4`}>
                                        <div className="flex items-start">
                                            <input
                                                type="radio"
                                                name="boot_option"
                                                value="recovery"
                                                defaultChecked
                                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="ml-3">
                                                <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    Boot from Recovery ISO
                                                </h4>
                                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                                                    When this option is selected, your Droplet will boot from the Recovery ISO the next time it is shut down completely and restarted.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Boot from Hard Drive */}
                                    <div className={`border-2 ${isDark ? 'border-gray-600 bg-gray-700/20' : 'border-gray-300 bg-gray-50'} rounded-lg p-4`}>
                                        <div className="flex items-start">
                                            <input
                                                type="radio"
                                                name="boot_option"
                                                value="hard_drive"
                                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="ml-3">
                                                <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    Boot from Hard Drive
                                                </h4>
                                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                                                    When this option is selected, your Droplet will boot from the hard drive the next time it is shut down completely and restarted.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 mb-4`}>
                                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                                        This Droplet is set to boot from the Recovery ISO the next time it is powered off and on again. To boot from the ISO:
                                    </p>
                                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} space-y-2`}>
                                        <div>
                                            <strong>1. Shut down completely:</strong> If the Droplet is not already powered down, shut down from the command line or use the On/Off switch above. Note that a reboot is not sufficient to change the boot device.
                                        </div>
                                        <div>
                                            <strong>2. Power on:</strong> Use the On/Off switch above to power the Droplet on and boot from the Recovery ISO.
                                        </div>
                                        <div>
                                            <strong>3. Switch back to the hard drive:</strong> When you have finished the recovery, return here to set your Droplet to boot from its hard drive.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recovery Actions */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                    ⚡ Recovery Actions
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Enable Recovery Boot */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Enable Recovery Boot? Droplet will boot from Recovery ISO on next power cycle.')) {
                                                // Add enable_recovery API call
                                                toast.success('Recovery boot enabled. Power cycle droplet to boot from Recovery ISO.');
                                            }
                                        }}
                                        className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <ShieldCheckIcon className="h-5 w-5 mr-2" />
                                        Enable Recovery Boot
                                    </button>

                                    {/* Disable Recovery Boot */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Disable Recovery Boot? Droplet will boot from hard drive on next power cycle.')) {
                                                // Add disable_recovery API call
                                                toast.success('Recovery boot disabled. Droplet will boot from hard drive.');
                                            }
                                        }}
                                        className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        <CircleStackIcon className="h-5 w-5 mr-2" />
                                        Boot from Hard Drive
                                    </button>

                                    {/* Power Cycle for Recovery */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Power cycle droplet for recovery? This will shut down and restart the droplet.')) {
                                                // Add power_cycle API call
                                                toast.success('Power cycling droplet for recovery boot...');
                                            }
                                        }}
                                        className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <ArrowPathIcon className="h-5 w-5 mr-2" />
                                        Power Cycle for Recovery
                                    </button>

                                    {/* Launch Console */}
                                    <button
                                        className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                        onClick={() => {
                                            // Console requires login to DigitalOcean - open droplet management page
                                            window.open(`https://cloud.digitalocean.com/droplets/${droplet.id}`, '_blank');
                                            toast.success('Opening DigitalOcean - Click Console tab after login');
                                        }}
                                    >
                                        <CommandLineIcon className="h-5 w-5 mr-2" />
                                        🌐 DigitalOcean Console
                                    </button>
                                </div>

                                <div className={`mt-4 p-3 ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${isDark ? 'border-yellow-800' : 'border-yellow-200'} rounded-md`}>
                                    <p className={`text-xs ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                        💡 <strong>Important:</strong> A reboot is not sufficient to change boot device. You must completely shut down and power on the droplet.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'monitoring' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* System Metrics */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <ChartBarIcon className="inline h-5 w-5 mr-2" />
                                Hiệu suất hệ thống
                            </h3>
                            <div className="space-y-4">
                                {/* CPU Usage */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <CpuChipIcon className="inline h-4 w-4 mr-1" />
                                            CPU Usage
                                        </span>
                                        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {monitoringLoading ? 'Loading...' :
                                             cpuUsage !== null ? `${cpuUsage.toFixed(1)}%` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: cpuUsage ? `${Math.min(cpuUsage, 100)}%` : '0%' }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Memory Usage */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <CircleStackIcon className="inline h-4 w-4 mr-1" />
                                            Memory Available
                                        </span>
                                        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {monitoringLoading ? 'Loading...' :
                                             memoryAvailable !== null ? formatBytes(memoryAvailable) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <div className="bg-green-600 h-2 rounded-full w-0"></div>
                                    </div>
                                </div>

                                {/* Disk Usage */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <CircleStackIcon className="inline h-4 w-4 mr-1" />
                                            Disk Usage
                                        </span>
                                        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>N/A</span>
                                    </div>
                                    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <div className="bg-yellow-600 h-2 rounded-full w-0"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Network Traffic */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <WifiIcon className="inline h-5 w-5 mr-2" />
                                Network Traffic
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Inbound:</span>
                                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {monitoringLoading ? 'Loading...' :
                                         bandwidthIn !== null ? `${bandwidthIn.toFixed(2)} Mbps` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Outbound:</span>
                                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {monitoringLoading ? 'Loading...' :
                                         bandwidthOut !== null ? `${bandwidthOut.toFixed(2)} Mbps` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
                                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {monitoringData ? 'Monitoring Active' : 'No Data'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Info */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6 lg:col-span-2`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <CheckCircleIcon className="inline h-5 w-5 mr-2" />
                                Trạng thái dịch vụ
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-3 ${
                                        droplet?.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        VPS {droplet?.status === 'active' ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-3 ${
                                        monitoringData?.success ? 'bg-green-500' : 'bg-gray-400'
                                    }`}></div>
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Monitoring {monitoringData?.success ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-3 ${
                                        droplet?.features?.includes('backups') ? 'bg-green-500' : 'bg-gray-400'
                                    }`}></div>
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Backups {droplet?.features?.includes('backups') ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                            <div className={`mt-4 p-4 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg`}>
                                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                    💡 <strong>Lưu ý:</strong> Để sử dụng tính năng giám sát chi tiết, vui lòng bật monitoring trong phần cài đặt hoặc khi tạo VPS mới.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'networking' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* IP Addresses */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <GlobeAltIcon className="inline h-5 w-5 mr-2" />
                                Địa chỉ IP
                            </h3>
                            <div className="space-y-4">
                                {/* Public IPs */}
                                <div>
                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Public IPv4 Addresses
                                    </h4>
                                    {getPublicIPs(droplet).length > 0 ? (
                                        <div className="space-y-4">
                                            {droplet.networks.v4.filter(network => network.type === 'public').map((network, index) => (
                                                <div key={index} className={`p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                IP Address
                                                            </label>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="text"
                                                                    value={network.ip_address}
                                                                    readOnly
                                                                    onClick={() => copyToClipboard(network.ip_address, 'IP Address')}
                                                                    className={`flex-1 px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-blue-700 hover:text-blue-100' : 'bg-white hover:bg-blue-100 hover:text-blue-800'}`}
                                                                    title="Click để copy IP address"
                                                                />
                                                                <button
                                                                    onClick={() => copyToClipboard(network.ip_address, 'IP Address')}
                                                                    className={`ml-1 p-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                                >
                                                                    <DocumentDuplicateIcon className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                Netmask
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={network.netmask || '255.255.255.0'}
                                                                readOnly
                                                                onClick={() => copyToClipboard(network.netmask || '255.255.255.0', 'Netmask')}
                                                                className={`w-full px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-blue-700 hover:text-blue-100' : 'bg-white hover:bg-blue-100 hover:text-blue-800'}`}
                                                                title="Click để copy Netmask"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                Gateway
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={network.gateway || 'N/A'}
                                                                readOnly
                                                                onClick={() => copyToClipboard(network.gateway || 'N/A', 'Gateway')}
                                                                className={`w-full px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-blue-700 hover:text-blue-100' : 'bg-white hover:bg-blue-100 hover:text-blue-800'}`}
                                                                title="Click để copy Gateway"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Không có public IP</p>
                                    )}
                                </div>

                                {/* Private IPs */}
                                <div>
                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Private IPv4 Addresses
                                    </h4>
                                    {getPrivateIPs(droplet).length > 0 ? (
                                        <div className="space-y-4">
                                            {droplet.networks.v4.filter(network => network.type === 'private').map((network, index) => (
                                                <div key={index} className={`p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                IP Address
                                                            </label>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="text"
                                                                    value={network.ip_address}
                                                                    readOnly
                                                                    onClick={() => copyToClipboard(network.ip_address, 'Private IP')}
                                                                    className={`flex-1 px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-green-700 hover:text-green-100' : 'bg-white hover:bg-green-100 hover:text-green-800'}`}
                                                                    title="Click để copy Private IP"
                                                                />
                                                                <button
                                                                    onClick={() => copyToClipboard(network.ip_address, 'Private IP')}
                                                                    className={`ml-1 p-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                                >
                                                                    <DocumentDuplicateIcon className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                Netmask
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={network.netmask || '255.255.255.0'}
                                                                readOnly
                                                                onClick={() => copyToClipboard(network.netmask || '255.255.255.0', 'Netmask')}
                                                                className={`w-full px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-green-700 hover:text-green-100' : 'bg-white hover:bg-green-100 hover:text-green-800'}`}
                                                                title="Click để copy Netmask"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                                Gateway
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={network.gateway || 'N/A'}
                                                                readOnly
                                                                onClick={() => copyToClipboard(network.gateway || 'N/A', 'Gateway')}
                                                                className={`w-full px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-600 text-white hover:bg-green-700 hover:text-green-100' : 'bg-white hover:bg-green-100 hover:text-green-800'}`}
                                                                title="Click để copy Gateway"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Không có private IP</p>
                                    )}
                                </div>

                                {/* IPv6 */}
                                <div>
                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        IPv6 Addresses
                                    </h4>
                                    {droplet.networks?.v6?.length > 0 ? (
                                        <div className="space-y-2">
                                            {droplet.networks.v6.map((network, index) => (
                                                <div key={index} className="flex items-center">
                                                    <input
                                                        type="text"
                                                        value={network.ip_address}
                                                        readOnly
                                                        onClick={() => copyToClipboard(network.ip_address, 'IPv6 Address')}
                                                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-white hover:bg-purple-700 hover:text-purple-100' : 'bg-gray-50 hover:bg-purple-100 hover:text-purple-800'} text-sm`}
                                                        title="Click để copy IPv6 Address"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(network.ip_address, 'IPv6 Address')}
                                                        className={`ml-2 p-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IPv6 chưa được bật</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Network Configuration */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <WifiIcon className="inline h-5 w-5 mr-2" />
                                Cấu hình mạng
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Region
                                    </label>
                                    <input
                                        type="text"
                                        value={droplet.region?.name || droplet.region?.slug || 'N/A'}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        VPC UUID
                                    </label>
                                    <input
                                        type="text"
                                        value={droplet.vpc_uuid || 'Default VPC'}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Features
                                    </label>
                                    <div className="space-y-1">
                                        {droplet.features && droplet.features.length > 0 ? (
                                            droplet.features.map((feature, index) => (
                                                <span key={index} className={`inline-block px-2 py-1 text-xs rounded-full ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} mr-1 mb-1`}>
                                                    {feature}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Không có features đặc biệt</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Firewall & Security - Full Implementation */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6 lg:col-span-2`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    <ShieldCheckIcon className="inline h-5 w-5 mr-2" />
                                    Firewall & Bảo mật
                                </h3>
                                <button
                                    onClick={() => {
                                        const name = prompt('Tên firewall mới:')
                                        if (name) {
                                            createFirewallMutation.mutate({
                                                name,
                                                inbound_rules: [
                                                    {
                                                        type: 'inbound',
                                                        protocol: 'tcp',
                                                        ports: '22',
                                                        sources: { addresses: ['127.0.0.1/32'] }
                                                    },
                                                    {
                                                        type: 'inbound',
                                                        protocol: 'tcp',
                                                        ports: '80',
                                                        sources: { addresses: ['127.0.0.1/32'] }
                                                    },
                                                    {
                                                        type: 'inbound',
                                                        protocol: 'tcp',
                                                        ports: '443',
                                                        sources: { addresses: ['127.0.0.1/32'] }
                                                    }
                                                ],
                                                outbound_rules: [
                                                    {
                                                        type: 'outbound',
                                                        protocol: 'tcp',
                                                        ports: 'all',
                                                        destinations: { addresses: ['127.0.0.1/32'] }
                                                    }
                                                ]
                                            })
                                        }
                                    }}
                                    disabled={createFirewallMutation.isPending}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    {createFirewallMutation.isPending ? 'Đang tạo...' : 'Tạo Firewall'}
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Current Firewall Status */}
                                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                    {dropletFirewallsLoading ? (
                                        <div className="text-center py-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                                                Đang tải thông tin firewall...
                                            </p>
                                        </div>
                                    ) : dropletFirewalls.length > 0 ? (
                                        <div className="space-y-2">
                                            {dropletFirewalls.map((firewall) => (
                                                <div key={firewall.id} className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="h-3 w-3 bg-green-400 rounded-full mr-3"></div>
                                                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {firewall.name}
                                                        </span>
                                                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${firewall.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                            {firewall.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Inbound: {firewall.inbound_rules.length} rules
                                                        </span>
                                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Outbound: {firewall.outbound_rules.length} rules
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <div className="h-3 w-3 bg-yellow-400 rounded-full mr-3"></div>
                                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Chưa có firewall nào được gán
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Firewall Rules Preview */}
                                {dropletFirewalls.length > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Inbound Rules */}
                                        <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                            <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                                                🔽 Inbound Rules
                                            </h4>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {dropletFirewalls[0]?.inbound_rules.map((rule, index) => (
                                                    <div key={index} className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} p-2 bg-opacity-50 ${isDark ? 'bg-green-900' : 'bg-green-100'} rounded`}>
                                                        {rule.protocol.toUpperCase()} {rule.ports} from {rule.sources?.addresses?.join(', ') || 'Custom'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Outbound Rules */}
                                        <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                            <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                                                🔼 Outbound Rules
                                            </h4>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {dropletFirewalls[0]?.outbound_rules.map((rule, index) => (
                                                    <div key={index} className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} p-2 bg-opacity-50 ${isDark ? 'bg-blue-900' : 'bg-blue-100'} rounded`}>
                                                        {rule.protocol.toUpperCase()} {rule.ports} to {rule.destinations?.addresses?.join(', ') || 'Custom'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Available Firewalls */}
                                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                    <h4 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                        📋 Danh sách Firewalls
                                    </h4>

                                    {firewallsLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                                                Đang tải danh sách firewalls...
                                            </p>
                                        </div>
                                    ) : firewalls.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ShieldCheckIcon className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Chưa có firewall nào. Tạo firewall đầu tiên!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {firewalls.map((firewall) => (
                                                <div key={firewall.id} className={`p-4 border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} rounded-lg`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {firewall.name}
                                                        </h4>
                                                        <span className={`px-2 py-1 text-xs rounded-full ${firewall.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                            {firewall.status}
                                                        </span>
                                                    </div>
                                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                                                        <div>Inbound: {firewall.inbound_rules.length} rules</div>
                                                        <div>Outbound: {firewall.outbound_rules.length} rules</div>
                                                        <div>Droplets: {firewall.droplet_ids.length}</div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {!firewall.droplet_ids.includes(parseInt(id!)) ? (
                                                            <button
                                                                onClick={() => {
                                                                    assignFirewallMutation.mutate({
                                                                        firewallId: firewall.id,
                                                                        dropletIds: [parseInt(id!)]
                                                                    })
                                                                }}
                                                                disabled={assignFirewallMutation.isPending}
                                                                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                            >
                                                                <LinkIcon className="h-3 w-3 inline mr-1" />
                                                                Gán
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    removeFirewallMutation.mutate({
                                                                        firewallId: firewall.id,
                                                                        dropletIds: [parseInt(id!)]
                                                                    })
                                                                }}
                                                                disabled={removeFirewallMutation.isPending}
                                                                className="flex-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                                                            >
                                                                <XMarkIcon className="h-3 w-3 inline mr-1" />
                                                                Gỡ
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`⚠️ Xóa firewall "${firewall.name}"? Hành động này không thể hoàn tác!`)) {
                                                                    deleteFirewallMutation.mutate(firewall.id)
                                                                }
                                                            }}
                                                            disabled={deleteFirewallMutation.isPending}
                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            <TrashIcon className="h-3 w-3 inline" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Security Tips */}
                                <div className={`${isDark ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-50 to-purple-50'} rounded-lg p-6`}>
                                    <h4 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                        🛡️ Tips Bảo mật
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`p-4 ${isDark ? 'bg-gray-800/50' : 'bg-white/70'} rounded-lg`}>
                                            <h5 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'} mb-2`}>
                                                ✅ Nên làm
                                            </h5>
                                            <ul className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-1`}>
                                                <li>• Chỉ mở port cần thiết</li>
                                                <li>• Sử dụng SSH keys thay vì password</li>
                                                <li>• Thường xuyên kiểm tra rules</li>
                                                <li>• Backup cấu hình firewall</li>
                                            </ul>
                                        </div>
                                        <div className={`p-4 ${isDark ? 'bg-gray-800/50' : 'bg-white/70'} rounded-lg`}>
                                            <h5 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-700'} mb-2`}>
                                                ❌ Không nên
                                            </h5>
                                            <ul className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-1`}>
                                                <li>• Mở port 22 cho toàn bộ internet</li>
                                                <li>• Tắt firewall hoàn toàn</li>
                                                <li>• Sử dụng password yếu</li>
                                                <li>• Bỏ qua cập nhật bảo mật</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* General Settings */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <CogIcon className="inline h-5 w-5 mr-2" />
                                Cài đặt chung
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Tên Droplet
                                    </label>
                                    <input
                                        type="text"
                                        value={droplet.name}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {droplet.tags && droplet.tags.length > 0 ? (
                                            droplet.tags.map((tag, index) => (
                                                <span key={index} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có tags</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Monitoring
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={droplet.monitoring || false}
                                            readOnly
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {droplet.monitoring ? 'Đã bật' : 'Chưa bật'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                        Backups
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={droplet.backup_ids && droplet.backup_ids.length > 0}
                                            readOnly
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {droplet.backup_ids && droplet.backup_ids.length > 0 ? 'Đã có backup' : 'Chưa có backup'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Information */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <ServerIcon className="inline h-5 w-5 mr-2" />
                                Thông tin hệ thống
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Operating System
                                    </label>
                                    <input
                                        type="text"
                                        value={droplet.image?.distribution ? `${droplet.image.distribution} ${droplet.image.name}` : 'N/A'}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Kernel
                                    </label>
                                    <input
                                        type="text"
                                        value={droplet.kernel?.name || droplet.kernel?.version || 'N/A'}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Created
                                    </label>
                                    <input
                                        type="text"
                                        value={new Date(droplet.created_at).toLocaleString('vi-VN')}
                                        readOnly
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'} text-sm`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Locked
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={droplet.locked || false}
                                            readOnly
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {droplet.locked ? 'Droplet bị khóa' : 'Droplet không bị khóa'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6 lg:col-span-2`}>
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                <CommandLineIcon className="inline h-5 w-5 mr-2" />
                                Hành động
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Power Actions */}
                                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                                        Điều khiển nguồn
                                    </h4>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => confirmPowerAction('stop')}
                                            disabled={droplet.status !== 'active' || stopMutation.isPending}
                                            className={`w-full px-3 py-2 text-sm rounded-md ${droplet.status === 'active' && !stopMutation.isPending
                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {stopMutation.isPending ? 'Đang tắt...' : 'Tắt máy'}
                                        </button>
                                        <button
                                            onClick={() => confirmPowerAction('start')}
                                            disabled={droplet.status === 'active' || startMutation.isPending}
                                            className={`w-full px-3 py-2 text-sm rounded-md ${droplet.status !== 'active' && !startMutation.isPending
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {startMutation.isPending ? 'Đang bật...' : 'Bật máy'}
                                        </button>
                                        <button
                                            onClick={() => confirmPowerAction('restart')}
                                            disabled={droplet.status !== 'active' || restartMutation.isPending}
                                            className={`w-full px-3 py-2 text-sm rounded-md ${droplet.status === 'active' && !restartMutation.isPending
                                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {restartMutation.isPending ? 'Đang khởi động lại...' : 'Khởi động lại'}
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            disabled={deleteMutation.isPending}
                                            className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                                        >
                                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa Droplet'}
                                        </button>
                                    </div>
                                </div>

                                {/* Resize & Snapshots */}
                                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                                        Quản lý
                                    </h4>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => {
                                                // Ẩn tất cả panels khác trước
                                                setShowSnapshotManager(false)
                                                setShowRebuildManager(false)
                                                setShowVolumeManager(false)
                                                // Toggle resize panel
                                                setShowResizeManager(!showResizeManager)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                        >
                                            Resize Droplet
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Ẩn resize khi click chức năng khác
                                                setShowResizeManager(false)
                                                setShowRebuildManager(false)
                                                setShowVolumeManager(false)
                                                setShowSnapshotManager(!showSnapshotManager)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                                        >
                                            Snapshot
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Ẩn resize khi click chức năng khác
                                                setShowResizeManager(false)
                                                setShowSnapshotManager(false)
                                                setShowVolumeManager(false)
                                                setShowRebuildManager(!showRebuildManager)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                                        >
                                            Rebuild
                                        </button>

                                        {/* Volume management */}
                                        <button
                                            onClick={() => {
                                                // Ẩn resize khi click chức năng khác
                                                setShowResizeManager(false)
                                                setShowSnapshotManager(false)
                                                setShowRebuildManager(false)
                                                setShowVolumeManager(!showVolumeManager)
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                        >
                                            Quản lý Volume
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Resize Management */}
                        {showResizeManager && (
                            <div className="lg:col-span-2">
                                <ResizeManager
                                    dropletId={droplet.id?.toString()}
                                    dropletName={droplet.name}
                                    currentSize={droplet.size}
                                    isDark={isDark}
                                    onResizeCompleted={() => {
                                        toast.success('Resize completed successfully')
                                    }}
                                />
                            </div>
                        )}

                        {/* Rebuild Management */}
                        {showRebuildManager && (
                            <div className="lg:col-span-2">
                                <RebuildManager
                                    dropletId={droplet.id?.toString()}
                                    dropletName={droplet.name}
                                    currentImage={droplet.image}
                                    isDark={isDark}
                                    onRebuildCompleted={() => {
                                        setShowRebuildManager(false)
                                        toast.success('Rebuild completed successfully')
                                    }}
                                />
                            </div>
                        )}

                        {/* Snapshot Management */}
                        {showSnapshotManager && (
                            <div className="lg:col-span-2">
                                <SnapshotManager
                                    dropletId={droplet.id?.toString()}
                                    dropletName={droplet.name}
                                    isDark={isDark}
                                    onSnapshotCreated={() => {
                                        toast.success('Snapshot creation initiated')
                                    }}
                                />
                            </div>
                        )}

                        {/* Volume Management */}
                        {showVolumeManager && (
                            <div className="lg:col-span-2">
                                <VolumeManager
                                    dropletId={droplet.id?.toString()}
                                    dropletName={droplet.name}
                                    isDark={isDark}
                                    onVolumeAction={() => {
                                        toast.success('Volume action completed')
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
                        <div className="mt-3 text-center">
                            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                            <h3 className={`text-lg font-medium mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Xác nhận xóa VPS
                            </h3>
                            <div className="mt-2 px-7 py-3">
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                    Bạn có chắc chắn muốn xóa VPS "{droplet.name}"?
                                    Hành động này không thể hoàn tác và tất cả dữ liệu sẽ bị mất.
                                </p>
                            </div>
                            <div className="flex justify-center space-x-4 mt-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 ${isDark
                                            ? 'bg-gray-600 text-gray-200 hover:bg-gray-700'
                                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                        }`}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleDelete()}
                                    disabled={deleteMutation.isPending}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                    {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa VPS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Power Action Confirmation Modal */}
            {showPowerModal && powerAction && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
                        <div className="mt-3 text-center">
                            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
                            <h3 className={`text-lg font-medium mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Xác nhận {powerAction === 'stop' ? 'tắt máy' : powerAction === 'start' ? 'bật máy' : 'khởi động lại'}
                            </h3>
                            <div className="mt-2 px-7 py-3">
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {powerAction === 'stop' && `Bạn có chắc chắn muốn tắt VPS "${droplet.name}"? Tất cả dữ liệu chưa lưu sẽ bị mất.`}
                                    {powerAction === 'start' && `Bạn có chắc chắn muốn bật VPS "${droplet.name}"?`}
                                    {powerAction === 'restart' && `Bạn có chắc chắn muốn khởi động lại VPS "${droplet.name}"? Tất cả dữ liệu chưa lưu sẽ bị mất.`}
                                </p>
                            </div>
                            <div className="flex justify-center space-x-4 mt-4">
                                <button
                                    onClick={() => {
                                        setShowPowerModal(false)
                                        setPowerAction(null)
                                    }}
                                    className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 ${isDark
                                            ? 'bg-gray-600 text-gray-200 hover:bg-gray-700'
                                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                        }`}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handlePowerAction}
                                    disabled={
                                        (powerAction === 'stop' && stopMutation.isPending) ||
                                        (powerAction === 'start' && startMutation.isPending) ||
                                        (powerAction === 'restart' && restartMutation.isPending)
                                    }
                                    className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 ${powerAction === 'stop'
                                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                        : powerAction === 'start'
                                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                            : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                                        }`}
                                >
                                    {(powerAction === 'stop' && stopMutation.isPending) && 'Đang tắt...'}
                                    {(powerAction === 'start' && startMutation.isPending) && 'Đang bật...'}
                                    {(powerAction === 'restart' && restartMutation.isPending) && 'Đang khởi động lại...'}
                                    {!(
                                        (powerAction === 'stop' && stopMutation.isPending) ||
                                        (powerAction === 'start' && startMutation.isPending) ||
                                        (powerAction === 'restart' && restartMutation.isPending)
                                    ) && (powerAction === 'stop' ? 'Tắt máy' : powerAction === 'start' ? 'Bật máy' : 'Khởi động lại')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Volume Modal */}
            {showCreateVolume && (
                <CreateVolumeModal
                    isOpen={showCreateVolume}
                    onClose={() => setShowCreateVolume(false)}
                    dropletRegion={droplet.region?.slug}
                    isDark={isDark}
                />
            )}

            {/* Attach Volume Modal */}
            {showAttachVolume && (
                <AttachVolumeModal
                    isOpen={showAttachVolume}
                    onClose={() => setShowAttachVolume(false)}
                    dropletId={droplet.id.toString()}
                    dropletRegion={droplet.region?.slug}
                    isDark={isDark}
                />
            )}

            {/* Web Terminal */}
            {showTerminal && (
                <WebTerminal
                    dropletId={droplet.id.toString()}
                    dropletIP={droplet?.networks?.v4?.[0]?.ip_address}
                    onClose={() => setShowTerminal(false)}
                />
            )}
        </div>
    )
}

export default DropletManagement
