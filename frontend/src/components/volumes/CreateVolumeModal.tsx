import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { volumesApi, CreateVolumeRequest } from '../../services/volumes'

interface CreateVolumeModalProps {
    isOpen: boolean
    onClose: () => void
    dropletRegion?: string
    isDark?: boolean
}

const CreateVolumeModal: React.FC<CreateVolumeModalProps> = ({
    isOpen,
    onClose,
    dropletRegion,
    isDark = false
}) => {
    const [formData, setFormData] = useState({
        name: '',
        size_gigabytes: 10,
        description: '',
        region: dropletRegion || 'nyc1',
        filesystem_type: 'ext4'
    })

    const regions = [
        { slug: 'nyc1', name: 'New York 1' },
        { slug: 'nyc3', name: 'New York 3' },
        { slug: 'ams3', name: 'Amsterdam 3' },
        { slug: 'sfo3', name: 'San Francisco 3' },
        { slug: 'sgp1', name: 'Singapore 1' },
        { slug: 'lon1', name: 'London 1' },
        { slug: 'fra1', name: 'Frankfurt 1' },
        { slug: 'tor1', name: 'Toronto 1' },
        { slug: 'blr1', name: 'Bangalore 1' }
    ]

    const filesystemTypes = [
        { value: 'ext4', label: 'ext4' },
        { value: 'xfs', label: 'XFS' }
    ]
    const queryClient = useQueryClient()

    // Create volume mutation
    const createMutation = useMutation({
        mutationFn: (data: CreateVolumeRequest) => volumesApi.create(data),
        onSuccess: (response) => {
            console.log('Volume created successfully:', response)
            toast.success(`✅ Volume "${formData.name}" đã được tạo thành công! (${formData.size_gigabytes}GB)`)
            queryClient.invalidateQueries({ queryKey: ['volumes'] })
            queryClient.invalidateQueries({ queryKey: ['all-volumes'] })
            queryClient.invalidateQueries({ queryKey: ['droplet-volumes'] })
            onClose()
            setFormData({
                name: '',
                size_gigabytes: 10,
                description: '',
                region: dropletRegion || 'nyc1',
                filesystem_type: 'ext4'
            })
        },
        onError: (error: any) => {
            console.error('Create volume error:', error)
            const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown error'
            toast.error(`❌ Lỗi khi tạo volume "${formData.name}": ${errorMessage}`)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên volume')
            return
        }

        if (formData.size_gigabytes < 1 || formData.size_gigabytes > 16384) {
            toast.error('Kích thước volume phải từ 1GB đến 16,384GB')
            return
        }

        // Validate and format volume name (lowercase, alphanumeric only)
        const volumeName = formData.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

        const createData: CreateVolumeRequest = {
            name: volumeName,
            size_gigabytes: formData.size_gigabytes,
            description: formData.description.trim() || undefined,
            region: formData.region,
            filesystem_type: formData.filesystem_type
        }

        createMutation.mutate(createData)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'size_gigabytes' ? parseInt(value) || 1 : value
        }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white'}`}>
                <div className="mt-3">
                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                        🗄️ Tạo Volume mới
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Tên Volume *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="my-volume-name (chỉ chữ thường, số, dấu gạch ngang)"
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                required
                                disabled={createMutation.isPending}
                            />
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                Tên volume chỉ được chứa chữ thường, số và dấu gạch ngang
                            </p>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Kích thước (GB) *
                            </label>
                            <input
                                type="number"
                                name="size_gigabytes"
                                value={formData.size_gigabytes}
                                onChange={handleInputChange}
                                min="1"
                                max="16384"
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                required
                                disabled={createMutation.isPending}
                            />
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                Tối thiểu 1GB, tối đa 16,384GB
                            </p>
                        </div>

                        {/* Region Selection */}
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Region *
                            </label>
                            <select
                                name="region"
                                value={formData.region}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                                disabled={createMutation.isPending}
                            >
                                {regions.map(region => (
                                    <option key={region.slug} value={region.slug}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                Volume phải cùng region với droplet để có thể gắn
                            </p>
                        </div>

                        {/* Filesystem Type */}
                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Filesystem Type *
                            </label>
                            <select
                                name="filesystem_type"
                                value={formData.filesystem_type}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                                disabled={createMutation.isPending}
                            >
                                {filesystemTypes.map(fs => (
                                    <option key={fs.value} value={fs.value}>
                                        {fs.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Mô tả (tùy chọn)
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Mô tả volume..."
                                rows={3}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                disabled={createMutation.isPending}
                            />
                        </div>
                        {dropletRegion && (
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <p>📍 <strong>Region:</strong> {dropletRegion}</p>
                                <p className="text-xs mt-1">Volume sẽ được tạo trong cùng region với droplet</p>
                            </div>
                        )}
                        <div className="flex space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={createMutation.isPending}
                                className={`flex-1 px-4 py-2 rounded-md hover:bg-gray-400 ${isDark
                                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                    : 'bg-gray-300 text-gray-700'
                                    }`}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || !formData.name.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending ? 'Đang tạo...' : '🗄️ Tạo Volume'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CreateVolumeModal
