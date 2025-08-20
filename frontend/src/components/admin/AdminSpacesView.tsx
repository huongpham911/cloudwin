import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import {
    CloudIcon,
    FolderIcon,
    DocumentIcon,
    PlusIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    EyeIcon,
    PencilIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { adminSpacesApi, AdminSpace, AdminSpaceFile } from '../../services/adminSpacesApi'
import { spacesApi } from '../../services/spacesApi'
import { api } from '../../services/api'
import Logger from '../../utils/logger'
import CreateSpaceModal from './CreateSpaceModal'
import toast from 'react-hot-toast'

// Types are imported from adminSpacesApi

const AdminSpacesView: React.FC = () => {
    const { isDark } = useTheme()
    const { user } = useAuth()
    const queryClient = useQueryClient()


    const [selectedSpace, setSelectedSpace] = useState<AdminSpace | null>(null)
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Fetch admin analytics to check tokens
    const { data: spacesResponse, isLoading: spacesLoading, error: spacesError } = useQuery({
        queryKey: ['admin-all-spaces'],
        queryFn: async () => {

            try {
                const response = await adminSpacesApi.getAllSpaces()

                return response
            } catch (error) {
                Logger.error('Admin spaces fetch error', error)
                throw error
            }
        },
        retry: 1,

        onError: (error) => {
            Logger.error('Admin spaces error', error)
        }
    })

    // Extract spaces data from response
    const spaces = spacesResponse?.data?.spaces || []
    const totalSpaces = spacesResponse?.data?.total_spaces || 0
    const totalTokens = spacesResponse?.data?.total_tokens || 0
    const usersWithTokens = spacesResponse?.data?.users_with_tokens || 0

    // Check if we have data
    const hasSpaces = spaces.length > 0
    const isLoading = spacesLoading



    // Fetch all buckets from all users
    const { data: bucketsResponse, isLoading: bucketsLoading } = useQuery({
        queryKey: ['admin-all-buckets'],
        queryFn: () => adminSpacesApi.getAllBuckets(),
        enabled: Boolean(hasSpaces),
        retry: 2
    })

    // Fetch files for selected bucket
    const { data: filesResponse, isLoading: filesLoading } = useQuery({
        queryKey: ['admin-bucket-files', selectedBucket, selectedSpace?.user_email, selectedSpace?.region],
        queryFn: () => selectedBucket && selectedSpace?.user_email ?
            adminSpacesApi.getBucketFiles(selectedBucket, selectedSpace.user_email, selectedSpace.region) : null,
        enabled: Boolean(hasSpaces && !!selectedBucket && !!selectedSpace?.user_email),
        retry: 2
    })

    // Spaces data is already extracted above
    const buckets = bucketsResponse?.data?.buckets || []
    const spaceFiles: AdminSpaceFile[] = filesResponse?.data?.files || []



    // Create mutation for new spaces - need to select user
    const createSpaceMutation = useMutation({
        mutationFn: (data: { name: string; region: string; userEmail: string }) =>
            adminSpacesApi.createSpace({ name: data.name, region: data.region }, data.userEmail),
        onSuccess: () => {
            toast.success('Space created successfully!')
            queryClient.invalidateQueries({ queryKey: ['admin-all-spaces'] })
            setShowCreateModal(false)
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to create space')
        }
    })

    // Delete mutation
    const deleteSpaceMutation = useMutation({
        mutationFn: (data: { spaceId: string; userEmail: string }) =>
            adminSpacesApi.deleteSpace(data.spaceId, data.userEmail),
        onSuccess: () => {
            toast.success('Space deleted successfully!')
            queryClient.invalidateQueries({ queryKey: ['admin-all-spaces'] })
            setSelectedSpace(null)
            setSelectedBucket(null)
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to delete space')
        }
    })

    const handleSpaceClick = (space: AdminSpace) => {
        setSelectedSpace(space)
        // For now, we'll show the first bucket from this user or let user select
        const userBuckets = buckets.filter(bucket => bucket.user_email === space.user_email)
        if (userBuckets.length > 0) {
            setSelectedBucket(userBuckets[0]?.name || null)
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800'
            case 'inactive':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const filteredSpaces = spaces.filter(space =>
        space.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.region?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Loading state
    if (spacesLoading && !spaces.length) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className={`ml-3 text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Loading Admin Spaces...
                    </span>
                </div>
            </div>
        )
    }

    // No spaces state  
    if (!hasSpaces && !isLoading) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
                        <h3 className={`mt-2 text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            No DigitalOcean Spaces
                        </h3>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            No Spaces found from user tokens
                        </p>
                        <div className={`mt-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <p>Total Tokens: {totalTokens}</p>
                            <p>Users with Tokens: {usersWithTokens}</p>
                            <p>Total Spaces: {totalSpaces}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (spacesError || analyticsError) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                        <h3 className={`mt-2 text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Error Loading Admin Data
                        </h3>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {spacesError?.message || analyticsError?.message || 'Failed to load admin data'}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Spaces Storage Management
                        </h1>
                        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Manage DigitalOcean Spaces object storage
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Space
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 ${isDark
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Search spaces..."
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spaces List */}
                <div className="lg:col-span-2">
                    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Spaces ({filteredSpaces.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {filteredSpaces.map((space) => (
                                <div
                                    key={space.id}
                                    className={`p-6 hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} cursor-pointer transition-colors duration-200`}
                                    onClick={() => handleSpaceClick(space)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <CloudIcon className="h-8 w-8 text-blue-500 mr-4" />
                                            <div>
                                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {space.name}
                                                </h3>
                                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {space.endpoint}
                                                </p>
                                                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    Owner: {space.user_name || space.user_email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(space.status)}`}>
                                                {space.status}
                                            </span>
                                            <EyeIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-4">
                                        <div>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Size</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {space.size_gb ? `${space.size_gb} GB` : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Files</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {space.files_count || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Region</p>
                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {space.region?.toUpperCase() || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Space Details / Files */}
                <div>
                    {selectedSpace ? (
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedSpace.name}
                                </h3>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Files & Objects
                                </p>
                            </div>
                            <div className="p-6">
                                {filesLoading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Loading files...
                                        </span>
                                    </div>
                                ) : spaceFiles.length > 0 ? (
                                    <div className="space-y-3">
                                        {spaceFiles.map((file, index) => (
                                            <div
                                                key={file.id || file.key || index}
                                                className={`flex items-center justify-between p-3 rounded-md ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                                            >
                                                <div className="flex items-center">
                                                    <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                                                    <div>
                                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {file.name || file.key}
                                                        </p>
                                                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button className="p-1 text-gray-400 hover:text-blue-500">
                                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-1 text-gray-400 hover:text-red-500">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : selectedBucket ? (
                                    <div className="text-center py-8">
                                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            No files found
                                        </h3>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            This bucket is empty or files couldn't be loaded
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <CloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Select a bucket
                                        </h3>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Choose a bucket to view its files
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
                            <div className="text-center">
                                <CloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Select a Space
                                </h3>
                                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Choose a space to view its files and details
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CloudIcon className="h-6 w-6 text-blue-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                        Total Spaces
                                    </dt>
                                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {spaces.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ChartBarIcon className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                        Total Storage
                                    </dt>
                                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {spaces.reduce((acc, space) => acc + (space.size_gb || 0), 0).toFixed(1)} GB
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FolderIcon className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                        Total Files
                                    </dt>
                                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {spaces.reduce((acc, space) => acc + (space.files_count || 0), 0)}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ChartBarIcon className="h-6 w-6 text-blue-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                        Active Spaces
                                    </dt>
                                    <dd className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {spaces.filter(space => space.status === 'active').length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Space Modal */}
            <CreateSpaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={(data) => createSpaceMutation.mutate(data)}
                loading={createSpaceMutation.isPending}
                users={analytics?.tokens?.tokens_list?.map(token => ({
                    email: token.user_email,
                    name: token.user_name || token.user_email
                })) || []}
            />
        </div>
    )
}

export default AdminSpacesView
