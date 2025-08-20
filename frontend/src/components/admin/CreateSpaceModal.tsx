import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'

interface CreateSpaceModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (data: { name: string; region: string; userEmail: string }) => void
    loading?: boolean
    users?: Array<{ email: string; name: string }>
}

const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    loading = false,
    users = []
}) => {
    const { isDark } = useTheme()
    const [formData, setFormData] = useState({
        name: '',
        region: 'nyc3',
        userEmail: ''
    })

    const regions = [
        { value: 'nyc1', label: 'New York 1' },
        { value: 'nyc3', label: 'New York 3' },
        { value: 'ams3', label: 'Amsterdam 3' },
        { value: 'sfo3', label: 'San Francisco 3' },
        { value: 'sgp1', label: 'Singapore 1' },
        { value: 'lon1', label: 'London 1' },
        { value: 'fra1', label: 'Frankfurt 1' },
        { value: 'tor1', label: 'Toronto 1' },
        { value: 'blr1', label: 'Bangalore 1' }
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.name.trim() && formData.userEmail) {
            onCreate({
                name: formData.name.trim(),
                region: formData.region,
                userEmail: formData.userEmail
            })
        }
    }

    const handleClose = () => {
        setFormData({ name: '', region: 'nyc3', userEmail: '' })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <form onSubmit={handleSubmit}>
                        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Create New Space
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className={`rounded-md p-2 hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Form fields */}
                                    <div className="space-y-4">
                                        {/* User Selection */}
                                        <div>
                                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                                User Account
                                            </label>
                                            <select
                                                value={formData.userEmail}
                                                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark
                                                        ? 'bg-gray-700 border-gray-600 text-white'
                                                        : 'bg-white border-gray-300 text-gray-900'
                                                    }`}
                                                required
                                                disabled={loading}
                                            >
                                                <option value="">Select a user account</option>
                                                {users.map((user) => (
                                                    <option key={user.email} value={user.email}>
                                                        {user.name} ({user.email})
                                                    </option>
                                                ))}
                                            </select>
                                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Space will be created using this user's DigitalOcean token
                                            </p>
                                        </div>

                                        {/* Space Name */}
                                        <div>
                                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                                Space Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark
                                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                    }`}
                                                placeholder="my-space-name"
                                                required
                                                disabled={loading}
                                            />
                                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Must be unique across all DigitalOcean Spaces
                                            </p>
                                        </div>

                                        {/* Region */}
                                        <div>
                                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                                Region
                                            </label>
                                            <select
                                                value={formData.region}
                                                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark
                                                    ? 'bg-gray-700 border-gray-600 text-white'
                                                    : 'bg-white border-gray-300 text-gray-900'
                                                    }`}
                                                required
                                                disabled={loading}
                                            >
                                                {regions.map((region) => (
                                                    <option key={region.value} value={region.value}>
                                                        {region.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Choose the region closest to your users
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}>
                            <button
                                type="submit"
                                disabled={loading || !formData.name.trim() || !formData.userEmail}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Space'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${isDark
                                    ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CreateSpaceModal
