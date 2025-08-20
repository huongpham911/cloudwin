import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon, CloudIcon, CogIcon } from '@heroicons/react/24/outline'
import { spacesApi, SpacesBucket } from '../../services/spacesApi'
import BucketSettings from './BucketSettings'
import toast from 'react-hot-toast'

const SpacesBuckets: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('nyc3')
  const [showCredentialsForm, setShowCredentialsForm] = useState(false)
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<SpacesBucket | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const queryClient = useQueryClient()

  const regions = [
    { value: 'nyc3', label: 'New York 3' },
    { value: 'ams3', label: 'Amsterdam 3' },
    { value: 'sgp1', label: 'Singapore 1' },
    { value: 'fra1', label: 'Frankfurt 1' },
    { value: 'sfo3', label: 'San Francisco 3' }
  ]

  // Fetch buckets
  const { data: bucketsData, isLoading, error } = useQuery({
    queryKey: ['spaces-buckets'],
    queryFn: spacesApi.listBuckets,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Create bucket mutation
  const createBucketMutation = useMutation({
    mutationFn: (request: { name: string; region: string; credentials?: { accessKey: string; secretKey: string } }) =>
      spacesApi.createBucket(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces-buckets'] })
      setIsCreateModalOpen(false)
      setNewBucketName('')
      setShowCredentialsForm(false)
      setAccessKey('')
      setSecretKey('')
      toast.success('Bucket created successfully!')
    },
    onError: (error: any) => {
      console.error('Create bucket error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create bucket'
      
      // If no credentials available, show credentials form
      if (errorMessage.includes('No Spaces access keys available')) {
        setShowCredentialsForm(true)
        toast.error('Please provide your Spaces credentials to create a bucket')
      } else {
        toast.error(errorMessage)
      }
    }
  })

  // Delete bucket mutation
  const deleteBucketMutation = useMutation({
    mutationFn: spacesApi.deleteBucket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces-buckets'] })
      toast.success('Bucket deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete bucket')
    }
  })

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBucketName.trim()) {
      toast.error('Please enter a bucket name')
      return
    }
    
    try {
      await createBucketMutation.mutateAsync({
        name: newBucketName.trim(),
        region: selectedRegion,
        credentials: showCredentialsForm ? { accessKey, secretKey } : undefined
      })
      setIsCreateModalOpen(false)
      setNewBucketName('')
      setSelectedRegion('nyc3')
      setShowCredentialsForm(false)
      setAccessKey('')
      setSecretKey('')
    } catch (error: any) {
      console.error('Failed to create bucket:', error)
      // Check if error indicates we need credentials
      if (error.message?.includes('No Spaces access keys available')) {
        setShowCredentialsForm(true)
        toast.error('Please provide your Spaces credentials to create a bucket')
      }
    }
  }

  const handleDeleteBucket = (bucketName: string) => {
    if (window.confirm(`Are you sure you want to delete bucket "${bucketName}"?`)) {
      deleteBucketMutation.mutate(bucketName)
    }
  }

  const handleOpenSettings = (bucket: SpacesBucket) => {
    setSelectedBucket(bucket)
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setSelectedBucket(null)
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Error loading buckets: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Buckets</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Store and deliver vast amounts of content
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Bucket</span>
        </button>
      </div>

      {/* Buckets List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading buckets...</p>
        </div>
      ) : bucketsData?.buckets?.length === 0 ? (
        <div className="text-center py-12">
          <CloudIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No buckets found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first Spaces bucket to get started.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Create a Spaces Bucket
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bucketsData?.buckets?.map((bucket: SpacesBucket) => (
            <div
              key={bucket.name}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex justify-between items-center"
            >
              <div className="flex-1">
                <h3 
                  className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                  onClick={() => handleOpenSettings(bucket)}
                >
                  {bucket.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Region: {bucket.region} • Created: {new Date(bucket.creation_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenSettings(bucket)}
                  className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-2"
                  title="Bucket Settings"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteBucket(bucket.name)}
                  className="text-red-600 hover:text-red-800 p-2"
                  disabled={deleteBucketMutation.isPending}
                  title="Delete Bucket"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Bucket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Bucket
            </h3>
            <form onSubmit={handleCreateBucket}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bucket Name
                </label>
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="my-bucket-name"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {regions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Credentials Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Spaces Credentials
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {showCredentialsForm ? 'Hide' : 'Provide manually'}
                  </button>
                </div>
                
                {showCredentialsForm && (
                  <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Access Key
                      </label>
                      <input
                        type="text"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        placeholder="DO001..."
                        required={showCredentialsForm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        placeholder="••••••••••••••••••••••••••••••••••••••••••••"
                        required={showCredentialsForm}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Your credentials will be used temporarily for this bucket creation only.
                    </p>
                  </div>
                )}
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
                  disabled={createBucketMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createBucketMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bucket Settings Modal */}
      {selectedBucket && (
        <BucketSettings
          bucket={selectedBucket}
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
        />
      )}
    </div>
  )
}

export default SpacesBuckets
