import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { volumesApi, Volume } from '../../services/volumes'

interface AttachVolumeModalProps {
    isOpen: boolean
    onClose: () => void
    dropletId: string
    dropletRegion?: string
    isDark?: boolean
}

const AttachVolumeModal: React.FC<AttachVolumeModalProps> = ({
    isOpen,
    onClose,
    dropletId,
    dropletRegion,
    isDark = false
}) => {
    const [selectedVolumeId, setSelectedVolumeId] = useState('')
    const queryClient = useQueryClient()

    // Fetch all volumes
    const { data: volumesData, isLoading, error } = useQuery({
        queryKey: ['volumes'],
        queryFn: () => volumesApi.getAll(),
        enabled: isOpen
    })

    // Attach volume mutation
    const attachMutation = useMutation({
        mutationFn: ({ volumeId, dropletId }: { volumeId: string, dropletId: string }) =>
            volumesApi.attach(volumeId, dropletId),
        onSuccess: (response) => {
            console.log('Volume attached successfully:', response)
            const volumeName = availableVolumes.find(v => v.id === selectedVolumeId)?.name || selectedVolumeId
            toast.success(`✅ Volume "${volumeName}" đã được gắn vào droplet thành công!`)
            queryClient.invalidateQueries({ queryKey: ['volumes'] })
            queryClient.invalidateQueries({ queryKey: ['all-volumes'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-volumes', dropletId] })
            setSelectedVolumeId('')
            onClose()
        },
        onError: (error: any) => {
            console.error('Attach volume error:', error)
            const volumeName = availableVolumes.find(v => v.id === selectedVolumeId)?.name || selectedVolumeId
            const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown error'
            toast.error(`❌ Lỗi khi gắn volume "${volumeName}": ${errorMessage}`)
        }
    })

    const handleAttach = () => {
        if (!selectedVolumeId) {
            toast.error('Vui lòng chọn volume để gắn')
            return
        }

        attachMutation.mutate({ volumeId: selectedVolumeId, dropletId })
    }

    // Filter available volumes (not attached to any droplet and in same region)
    const availableVolumes = volumesData?.data?.filter((volume: Volume) => {
        // Only show volumes that are not attached to any droplet
        const isAvailable = !volume.droplet_ids || volume.droplet_ids.length === 0 ||
                            (Array.isArray(volume.droplet_ids) && !volume.droplet_ids.includes(parseInt(dropletId)))

        // Only show volumes in the same region
        const isSameRegion = !dropletRegion || volume.region?.slug === dropletRegion || volume.region === dropletRegion

        console.log('Volume filter:', {
            volumeName: volume.name,
            dropletIds: volume.droplet_ids,
            volumeRegion: volume.region,
            dropletRegion,
            isAvailable,
            isSameRegion
        })

        return isAvailable && isSameRegion
    }) || []

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white'}`}>
                <div className="mt-3">
                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                        🔗 Gắn Volume vào Droplet
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Chọn Volume để gắn
                            </label>
                            <select
                                value={selectedVolumeId}
                                onChange={(e) => setSelectedVolumeId(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDark 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                disabled={isLoading}
                            >
                                <option value="">
                                    {isLoading ? 'Đang tải...' : 'Chọn volume'}
                                </option>
                                {availableVolumes.map((volume: Volume) => (
                                    <option key={volume.id} value={volume.id}>
                                        {volume.name} ({volume.size_gigabytes}GB) - {volume.region?.name || 'Unknown region'}
                                    </option>
                                ))}
                            </select>
                            {error && (
                                <p className="text-sm text-red-500 mt-1">
                                    Lỗi khi tải danh sách volume: {(error as any)?.message || 'Unknown error'}
                                </p>
                            )}
                            {availableVolumes.length === 0 && !isLoading && !error && (
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                    Không có volume nào khả dụng trong region này
                                </p>
                            )}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <p>💡 <strong>Lưu ý:</strong></p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Chỉ volume cùng region mới có thể gắn vào droplet</li>
                                <li>Volume phải ở trạng thái available (chưa gắn)</li>
                                <li>Sau khi gắn, bạn cần mount volume trong OS</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex space-x-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={attachMutation.isPending}
                            className={`flex-1 px-4 py-2 rounded-md hover:bg-gray-400 ${
                                isDark 
                                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                                    : 'bg-gray-300 text-gray-700'
                            }`}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleAttach}
                            disabled={!selectedVolumeId || attachMutation.isPending || isLoading}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {attachMutation.isPending ? 'Đang gắn...' : '🔗 Gắn Volume'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AttachVolumeModal
