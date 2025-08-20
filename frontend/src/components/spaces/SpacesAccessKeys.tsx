import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon, KeyIcon, EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import { spacesApi, SpacesKey } from '../../services/spacesApi'
import toast from 'react-hot-toast'

const SpacesAccessKeys: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showSecrets, setShowSecrets] = useState<{ [accessKey: string]: boolean }>({})
  const queryClient = useQueryClient()

  // Fetch access keys
  const { data: keysData, isLoading, error } = useQuery({
    queryKey: ['spaces-keys'],
    queryFn: spacesApi.listKeys,
    refetchInterval: 30000,
  })

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: spacesApi.createKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces-keys'] })
      setIsCreateModalOpen(false)
      setNewKeyName('')
      toast.success('Access key created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create access key')
    }
  })

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: spacesApi.deleteKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces-keys'] })
      toast.success('Access key deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete access key')
    }
  })

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name')
      return
    }
    createKeyMutation.mutate({ name: newKeyName.trim() })
  }

  const handleDeleteKey = (accessKey: string, keyName: string) => {
    if (window.confirm(`Are you sure you want to delete access key "${keyName}"?`)) {
      deleteKeyMutation.mutate(accessKey)
    }
  }

  const toggleSecretVisibility = (accessKey: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [accessKey]: !prev[accessKey]
    }))
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Error loading access keys: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Keys</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage API access keys for your Spaces
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Access Key</span>
        </button>
      </div>

      {/* Access Keys List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading access keys...</p>
        </div>
      ) : keysData?.spaces_keys?.length === 0 ? (
        <div className="text-center py-12">
          <KeyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No access keys found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first access key to start using Spaces API.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Create Access Key
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {keysData?.spaces_keys?.map((key: SpacesKey) => (
            <div
              key={key.access_key}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
            >
              {/* Key Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg">{key.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Created: {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.access_key, key.name)}
                  className="text-red-600 hover:text-red-800 p-2"
                  disabled={deleteKeyMutation.isPending}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Access Key */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded text-sm font-mono">
                      {key.access_key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.access_key, 'Access key')}
                      className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <ClipboardIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
                {key.secret_key && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Secret Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded text-sm font-mono">
                        {showSecrets[key.access_key] 
                          ? key.secret_key 
                          : '•'.repeat(key.secret_key.length)
                        }
                      </code>
                      <button
                        onClick={() => toggleSecretVisibility(key.access_key)}
                        className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showSecrets[key.access_key] ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(key.secret_key!, 'Secret key')}
                        className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <ClipboardIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Access Key Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Access Key
            </h3>
            <form onSubmit={handleCreateKey}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="my-spaces-key"
                  required
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose a descriptive name to identify this key
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createKeyMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createKeyMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpacesAccessKeys
