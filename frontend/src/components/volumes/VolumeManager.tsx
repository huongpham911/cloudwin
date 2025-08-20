import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { volumesApi, Volume } from '../../services/volumes'
import {
    TrashIcon,
    PlusIcon,
    ArrowPathIcon,
    ServerIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

interface VolumeManagerProps {
    dropletId: string
    dropletName: string
    isDark: boolean
    onVolumeAction?: () => void
}

const VolumeManager: React.FC<VolumeManagerProps> = ({
    dropletId,
    dropletName,
    isDark,
    onVolumeAction
}) => {
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showAttachForm, setShowAttachForm] = useState(false)
    const [newVolumeName, setNewVolumeName] = useState('')
    const [newVolumeSize, setNewVolumeSize] = useState(10)
    const [selectedVolumeId, setSelectedVolumeId] = useState('')

    const queryClient = useQueryClient()

    // Fetch volumes attached to this droplet
    const { data: attachedVolumes = [], isLoading: volumesLoading } = useQuery({
        queryKey: ['droplet-volumes', dropletId],
        queryFn: async () => {
            try {
                const response = await volumesApi.getByDroplet(dropletId)
                return Array.isArray(response.data) ? response.data : []
            } catch (error) {
                console.error('Error fetching droplet volumes:', error)
                return []
            }
        },
        enabled: !!dropletId
    })

    // Fetch all available volumes
    const { data: allVolumes = [], isLoading: allVolumesLoading } = useQuery({
        queryKey: ['all-volumes'],
        queryFn: async () => {
            try {
                const response = await volumesApi.getAll()
                return Array.isArray(response.data) ? response.data : []
            } catch (error) {
                console.error('Error fetching all volumes:', error)
                return []
            }
        }
    })

    // Create volume mutation
    const createVolumeMutation = useMutation({
        mutationFn: async (volumeData: { name: string; size: number }) => {
            const response = await volumesApi.create({
                name: volumeData.name,
                size_gigabytes: volumeData.size,
                region: 'nyc1', // Default region
                filesystem_type: 'ext4'
            })
            return response.data
        },
        onSuccess: () => {
            toast.success('Volume đã được tạo thành công!')
            setShowCreateForm(false)
            setNewVolumeName('')
            setNewVolumeSize(10)
            queryClient.invalidateQueries({ queryKey: ['all-volumes'] })
            onVolumeAction?.()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi tạo volume')
        }
    })

    // Attach volume mutation
    const attachVolumeMutation = useMutation({
        mutationFn: async (volumeId: string) => {
            const response = await volumesApi.attach(volumeId, dropletId)
            return response.data
        },
        onSuccess: () => {
            toast.success('Volume đã được gắn vào droplet!')
            setShowAttachForm(false)
            setSelectedVolumeId('')
            queryClient.invalidateQueries({ queryKey: ['droplet-volumes', dropletId] })
            onVolumeAction?.()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi gắn volume')
        }
    })

    // Detach volume mutation
    const detachVolumeMutation = useMutation({
        mutationFn: async (volumeId: string) => {
            const response = await volumesApi.detach(volumeId)
            return response.data
        },
        onSuccess: () => {
            toast.success('Volume đã được tháo khỏi droplet!')
            queryClient.invalidateQueries({ queryKey: ['droplet-volumes', dropletId] })
            onVolumeAction?.()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi tháo volume')
        }
    })

    // Delete volume mutation
    const deleteVolumeMutation = useMutation({
        mutationFn: async (volumeId: string) => {
            const response = await volumesApi.delete(volumeId)
            return response.data
        },
        onSuccess: () => {
            toast.success('Volume đã được xóa!')
            queryClient.invalidateQueries({ queryKey: ['all-volumes'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-volumes', dropletId] })
            onVolumeAction?.()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Lỗi khi xóa volume')
        }
    })

    const formatFileSize = (sizeGB: number) => {
        return `${sizeGB} GB`
    }

    const availableVolumes = allVolumes.filter(vol =>
        !vol.droplet_ids.includes(parseInt(dropletId))
    )

    return (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <ServerIcon className="inline h-5 w-5 mr-2" />
                        Quản lý Volume cho {dropletName}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                        Tổng số volumes: {allVolumes.length} | Đã gắn: {attachedVolumes.length} | Khả dụng: {availableVolumes.length}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
                    >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Tạo mới
                    </button>
                    <button
                        onClick={() => setShowAttachForm(!showAttachForm)}
                        className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                        Gắn Volume
                    </button>
                </div>
            </div>

            {/* Create Volume Form */}
            {showCreateForm && (
                <div className={`p-4 mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border`}>
                    <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                        Tạo Volume mới
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Tên Volume
                            </label>
                            <input
                                type="text"
                                value={newVolumeName}
                                onChange={(e) => setNewVolumeName(e.target.value)}
                                placeholder="data-volume-1"
                                className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Kích thước (GB)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="16384"
                                value={newVolumeSize}
                                onChange={(e) => setNewVolumeSize(parseInt(e.target.value))}
                                className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className={`px-4 py-2 text-sm ${isDark ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} rounded-md`}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => createVolumeMutation.mutate({ name: newVolumeName, size: newVolumeSize })}
                            disabled={!newVolumeName || createVolumeMutation.isPending}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                        >
                            {createVolumeMutation.isPending ? 'Đang tạo...' : 'Tạo Volume'}
                        </button>
                    </div>
                </div>
            )}

            {/* Attach Volume Form */}
            {showAttachForm && (
                <div className={`p-4 mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border`}>
                    <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                        Gắn Volume có sẵn
                    </h4>
                    <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            Chọn Volume
                        </label>
                        <select
                            value={selectedVolumeId}
                            onChange={(e) => setSelectedVolumeId(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                        >
                            <option value="">-- Chọn Volume --</option>
                            {availableVolumes.map(volume => (
                                <option key={volume.id} value={volume.id}>
                                    {volume.name} ({formatFileSize(volume.size_gigabytes)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button
                            onClick={() => setShowAttachForm(false)}
                            className={`px-4 py-2 text-sm ${isDark ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} rounded-md`}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => attachVolumeMutation.mutate(selectedVolumeId)}
                            disabled={!selectedVolumeId || attachVolumeMutation.isPending}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                        >
                            {attachVolumeMutation.isPending ? 'Đang gắn...' : 'Gắn Volume'}
                        </button>
                    </div>
                </div>
            )}

            {/* All Volumes Overview */}
            <div className="mb-8">
                <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                    Tất cả Volumes ({allVolumes.length})
                </h4>

                {volumesLoading ? (
                    <div className="flex justify-center py-4">
                        <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                ) : allVolumes.length === 0 ? (
                    <div className={`text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <ServerIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>Chưa có volume nào được tạo</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allVolumes.map(volume => {
                            const isAttached = volume.droplet_ids.includes(parseInt(dropletId))
                            return (
                                <div
                                    key={volume.id}
                                    className={`p-4 border rounded-lg ${
                                        isAttached
                                            ? isDark ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-200'
                                            : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <DocumentDuplicateIcon className={`h-5 w-5 mr-2 ${
                                                    isAttached ? 'text-green-500' : 'text-blue-500'
                                                }`} />
                                                <h5 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {volume.name}
                                                </h5>
                                                {isAttached && (
                                                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                        Đã gắn
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                                                <span>{formatFileSize(volume.size_gigabytes)}</span>
                                                <span className="mx-2">•</span>
                                                <span>{volume.region?.name || 'Unknown region'}</span>
                                                <span className="mx-2">•</span>
                                                <span>{volume.filesystem_type}</span>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {!isAttached && (
                                                <button
                                                    onClick={() => attachVolumeMutation.mutate(volume.id)}
                                                    disabled={attachVolumeMutation.isPending}
                                                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                                                >
                                                    Gắn
                                                </button>
                                            )}
                                            {isAttached && (
                                                <button
                                                    onClick={() => detachVolumeMutation.mutate(volume.id)}
                                                    disabled={detachVolumeMutation.isPending}
                                                    className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-md disabled:opacity-50"
                                                >
                                                    Tháo
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Bạn có chắc chắn muốn xóa volume "${volume.name}"? Hành động này không thể hoàn tác.`)) {
                                                        deleteVolumeMutation.mutate(volume.id)
                                                    }
                                                }}
                                                disabled={deleteVolumeMutation.isPending}
                                                className="px-2 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                                                title="Xóa volume"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Attached Volumes List */}
            <div>
                <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                    Volume đã gắn vào droplet này ({attachedVolumes.length})
                </h4>

                {volumesLoading ? (
                    <div className="flex justify-center py-8">
                        <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                ) : attachedVolumes.length === 0 ? (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có volume nào được gắn vào droplet này</p>
                        <p className="text-sm mt-2">Tạo volume mới hoặc gắn volume có sẵn</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {attachedVolumes.map(volume => (
                            <div
                                key={volume.id}
                                className={`p-4 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <DocumentDuplicateIcon className="h-5 w-5 text-blue-500 mr-2" />
                                            <h5 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {volume.name}
                                            </h5>
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                                            <span>Kích thước: {formatFileSize(volume.size_gigabytes)}</span>
                                            <span className="mx-2">•</span>
                                            <span>Loại: {volume.filesystem_type}</span>
                                            <span className="mx-2">•</span>
                                            <span>Vùng: {volume.region.name}</span>
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                            Tạo: {new Date(volume.created_at).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => detachVolumeMutation.mutate(volume.id)}
                                            disabled={detachVolumeMutation.isPending}
                                            className="px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-md disabled:opacity-50"
                                        >
                                            {detachVolumeMutation.isPending ? 'Đang tháo...' : 'Tháo'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Bạn có chắc chắn muốn xóa volume "${volume.name}"? Hành động này không thể hoàn tác.`)) {
                                                    deleteVolumeMutation.mutate(volume.id)
                                                }
                                            }}
                                            disabled={deleteVolumeMutation.isPending}
                                            className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default VolumeManager
