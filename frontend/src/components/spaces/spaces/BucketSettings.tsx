import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  XMarkIcon, 
  CloudIcon, 
  TrashIcon, 
  FolderIcon, 
  DocumentIcon, 
  ArrowUpTrayIcon, 
  PlusIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { spacesApi, SpacesBucket, CorsRule, CorsConfiguration } from '../../services/spacesApi'
import toast from 'react-hot-toast'

interface BucketSettingsProps {
  bucket: SpacesBucket
  isOpen: boolean
  onClose: () => void
}

interface CorsRuleEditorProps {
  rule: CorsRule | null
  isOpen: boolean
  onClose: () => void
  onSave: (rule: CorsRule) => void
}

const CorsRuleEditor: React.FC<CorsRuleEditorProps> = ({ rule, isOpen, onClose, onSave }) => {
  const [origin, setOrigin] = useState('')
  const [allowedMethods, setAllowedMethods] = useState<string[]>([])
  const [allowedHeaders, setAllowedHeaders] = useState<string[]>([])
  const [newHeader, setNewHeader] = useState('')
  const [maxAge, setMaxAge] = useState<number>(0)

  const methodOptions = ['GET', 'PUT', 'DELETE', 'POST', 'HEAD']

  // Initialize form with existing rule data
  React.useEffect(() => {
    if (rule) {
      setOrigin(rule.AllowedOrigins?.[0] || '')
      setAllowedMethods(rule.AllowedMethods || [])
      setAllowedHeaders(rule.AllowedHeaders || [])
      setMaxAge(rule.MaxAgeSeconds || 0)
    } else {
      // Reset form for new rule
      setOrigin('')
      setAllowedMethods([])
      setAllowedHeaders([])
      setMaxAge(0)
    }
  }, [rule])

  const handleMethodToggle = (method: string) => {
    setAllowedMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  const handleAddHeader = () => {
    if (newHeader.trim() && !allowedHeaders.includes(newHeader.trim())) {
      setAllowedHeaders(prev => [...prev, newHeader.trim()])
      setNewHeader('')
    }
  }

  const handleRemoveHeader = (header: string) => {
    setAllowedHeaders(prev => prev.filter(h => h !== header))
  }

  const handleSave = () => {
    if (!origin.trim()) {
      toast.error('Origin domain is required')
      return
    }
    if (allowedMethods.length === 0) {
      toast.error('At least one method is required')
      return
    }

    const newRule: CorsRule = {
      AllowedOrigins: [origin.trim()],
      AllowedMethods: allowedMethods,
      AllowedHeaders: allowedHeaders.length > 0 ? allowedHeaders : undefined,
      MaxAgeSeconds: maxAge > 0 ? maxAge : undefined
    }

    onSave(newRule)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {rule ? 'Edit CORS Rule' : 'Add CORS Rule'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Origin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Origin <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="http://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {!origin.trim() && (
              <p className="text-red-500 text-sm mt-1">Origin domain is required</p>
            )}
          </div>

          {/* Allowed Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed Methods <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {methodOptions.map(method => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allowedMethods.includes(method)}
                    onChange={() => handleMethodToggle(method)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{method}</span>
                </label>
              ))}
            </div>
            {allowedMethods.length === 0 && (
              <p className="text-red-500 text-sm mt-1">At least one method is required</p>
            )}
          </div>

          {/* Allowed Headers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed Headers
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newHeader}
                  onChange={(e) => setNewHeader(e.target.value)}
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddHeader()
                    }
                  }}
                />
                <button
                  onClick={handleAddHeader}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center space-x-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Header</span>
                </button>
              </div>
              {allowedHeaders.length > 0 && (
                <div className="space-y-1">
                  {allowedHeaders.map((header, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded">
                      <span className="text-sm text-gray-900 dark:text-white">{header}</span>
                      <button
                        onClick={() => handleRemoveHeader(header)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Access Control Max Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Control Max Age (seconds)
            </label>
            <input
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Save CORS Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

const BucketSettings: React.FC<BucketSettingsProps> = ({ bucket, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'files' | 'cdn' | 'cors'>('general')
  const [cdnTtl, setCdnTtl] = useState(3600)
  const [customDomain, setCustomDomain] = useState('')
  const [certificateId, setCertificateId] = useState('')
  const [currentPath, setCurrentPath] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  
  // CORS state
  const [corsRules, setCorsRules] = useState<CorsRule[]>([])
  const [editingRule, setEditingRule] = useState<CorsRule | null>(null)
  const [isAddingRule, setIsAddingRule] = useState(false)
  
  const queryClient = useQueryClient()

  // Fetch CDN status for this bucket
  const { data: cdnStatus, isLoading: cdnLoading } = useQuery({
    queryKey: ['bucket-cdn-status', bucket.name],
    queryFn: () => spacesApi.getBucketCdnStatus(bucket.name, bucket.region),
    enabled: isOpen && activeTab === 'cdn',
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  // Fetch files for this bucket
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['bucket-files', bucket.name, currentPath],
    queryFn: () => spacesApi.listFiles(bucket.name, bucket.region, currentPath || undefined),
    enabled: isOpen && activeTab === 'files',
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  // Fetch CORS configuration for this bucket
  const { data: corsData, isLoading: corsLoading } = useQuery({
    queryKey: ['bucket-cors', bucket.name],
    queryFn: () => spacesApi.getBucketCors(bucket.name, bucket.region),
    enabled: isOpen && activeTab === 'cors',
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  // Enable CDN mutation
  const enableCdnMutation = useMutation({
    mutationFn: (settings: { ttl: number; customDomain?: string; certificateId?: string }) =>
      spacesApi.enableBucketCdn(bucket.name, bucket.region, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket.name] })
      toast.success('CDN enabled successfully!')
    },
    onError: (error: any) => {
      console.error('Enable CDN error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to enable CDN'
      toast.error(errorMessage)
    },
  })

  // Disable CDN mutation
  const disableCdnMutation = useMutation({
    mutationFn: () => spacesApi.disableBucketCdn(bucket.name, bucket.region),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket.name] })
      toast.success('CDN disabled successfully!')
    },
    onError: (error: any) => {
      console.error('Disable CDN error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to disable CDN'
      toast.error(errorMessage)
    },
  })

  // Update CDN settings mutation
  const updateCdnMutation = useMutation({
    mutationFn: (settings: { ttl?: number; customDomain?: string; certificateId?: string }) =>
      spacesApi.updateBucketCdnSettings(bucket.name, bucket.region, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket.name] })
      toast.success('CDN settings updated successfully!')
    },
    onError: (error: any) => {
      console.error('Update CDN error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update CDN settings'
      toast.error(errorMessage)
    },
  })

  // Purge CDN cache mutation
  const purgeCacheMutation = useMutation({
    mutationFn: () => spacesApi.purgeBucketCdnCache(bucket.name, bucket.region),
    onSuccess: () => {
      toast.success('CDN cache purged successfully!')
    },
    onError: (error: any) => {
      console.error('Purge cache error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to purge CDN cache'
      toast.error(errorMessage)
    },
  })

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: (request: { file: File; key: string; acl?: string }) =>
      spacesApi.uploadFile(bucket.name, bucket.region, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket.name] })
      toast.success('File uploaded successfully!')
      setUploadFile(null)
    },
    onError: (error: any) => {
      console.error('Upload file error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file'
      toast.error(errorMessage)
    },
  })

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (request: { folder_name: string; path?: string }) =>
      spacesApi.createFolder(bucket.name, bucket.region, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket.name] })
      toast.success('Folder created successfully!')
      setNewFolderName('')
      setShowCreateFolder(false)
    },
    onError: (error: any) => {
      console.error('Create folder error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create folder'
      toast.error(errorMessage)
    },
  })

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (key: string) => spacesApi.deleteFile(bucket.name, bucket.region, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket.name] })
      toast.success('File deleted successfully!')
    },
    onError: (error: any) => {
      console.error('Delete file error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete file'
      toast.error(errorMessage)
    },
  })

  // CORS mutations
  const setCorsConfigMutation = useMutation({
    mutationFn: (corsConfig: CorsConfiguration) => 
      spacesApi.setBucketCors(bucket.name, bucket.region, corsConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cors', bucket.name] })
      toast.success('CORS configuration updated successfully!')
      setEditingRule(null)
      setIsAddingRule(false)
    },
    onError: (error: any) => {
      console.error('Set CORS error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update CORS configuration'
      toast.error(errorMessage)
    },
  })

  const deleteCorsConfigMutation = useMutation({
    mutationFn: () => spacesApi.deleteBucketCors(bucket.name, bucket.region),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cors', bucket.name] })
      toast.success('CORS configuration deleted successfully!')
      setCorsRules([])
    },
    onError: (error: any) => {
      console.error('Delete CORS error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete CORS configuration'
      toast.error(errorMessage)
    },
  })

  const handleEnableCdn = (e: React.FormEvent) => {
    e.preventDefault()
    const settings: any = { ttl: cdnTtl }
    if (customDomain) settings.customDomain = customDomain
    if (certificateId) settings.certificateId = certificateId
    enableCdnMutation.mutate(settings)
  }

  const handleUpdateCdn = () => {
    updateCdnMutation.mutate({ ttl: cdnTtl })
  }

  const handleDisableCdn = () => {
    if (window.confirm('Are you sure you want to disable CDN for this bucket?')) {
      disableCdnMutation.mutate()
    }
  }

  const handlePurgeCache = () => {
    if (window.confirm('Are you sure you want to purge all CDN cache for this bucket?')) {
      purgeCacheMutation.mutate()
    }
  }

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast.error('Please select a file to upload')
      return
    }

    const key = currentPath ? `${currentPath}/${uploadFile.name}` : uploadFile.name
    uploadFileMutation.mutate({
      file: uploadFile,
      key,
      acl: 'private'
    })
  }

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name')
      return
    }

    createFolderMutation.mutate({
      folder_name: newFolderName.trim(),
      path: currentPath || undefined
    })
  }

  const handleDeleteFile = (key: string) => {
    if (window.confirm(`Are you sure you want to delete "${key}"?`)) {
      deleteFileMutation.mutate(key)
    }
  }

  const handleNavigateToFolder = (folderKey: string) => {
    setCurrentPath(folderKey)
  }

  const handleBackNavigation = () => {
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    setCurrentPath(pathParts.join('/'))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  const ttlOptions = [
    { value: 60, label: '1 minute' },
    { value: 600, label: '10 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 86400, label: '1 day' },
    { value: 604800, label: '1 week' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Bucket Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{bucket.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab('cdn')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'cdn'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            CDN Settings
          </button>
          <button
            onClick={() => setActiveTab('cors')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'cors'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            CORS Configuration
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Bucket Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bucket Name
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                      {bucket.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Region
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                      {bucket.region}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Created Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                      {new Date(bucket.creation_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Endpoint
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded break-all">
                      {bucket.name}.{bucket.region}.digitaloceanspaces.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Danger Zone
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <TrashIcon className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                        Delete this bucket
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        Once you delete a bucket, there is no going back. Please be certain.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  File Management
                </h3>
                
                {/* File Upload Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Upload File</h4>
                  <form onSubmit={handleFileUpload} className="space-y-3">
                    <div>
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={!uploadFile || uploadFileMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        <span>{uploadFileMutation.isPending ? 'Uploading...' : 'Upload File'}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowCreateFolder(!showCreateFolder)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Create Folder</span>
                      </button>
                    </div>
                  </form>
                  
                  {/* Create Folder Form */}
                  {showCreateFolder && (
                    <form onSubmit={handleCreateFolder} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={!newFolderName.trim() || createFolderMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                        >
                          {createFolderMutation.isPending ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateFolder(false)
                            setNewFolderName('')
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Breadcrumb Navigation */}
                {currentPath && (
                  <div className="flex items-center space-x-2 mb-4">
                    <button
                      onClick={handleBackNavigation}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <span className="text-gray-600 dark:text-gray-400">
                      / {currentPath}
                    </span>
                  </div>
                )}

                {/* Files List */}
                {filesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading files...</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    {filesData?.files && filesData.files.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filesData.files.map((file, index) => (
                          <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div className="flex items-center space-x-3">
                              {file.is_folder ? (
                                <FolderIcon className="h-6 w-6 text-blue-500" />
                              ) : (
                                <DocumentIcon className="h-6 w-6 text-gray-500" />
                              )}
                              <div>
                                <p 
                                  className={`font-medium text-gray-900 dark:text-white ${
                                    file.is_folder ? 'cursor-pointer hover:text-blue-600' : ''
                                  }`}
                                  onClick={() => file.is_folder && handleNavigateToFolder(file.key)}
                                >
                                  {file.key.split('/').pop() || file.key}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {!file.is_folder && formatFileSize(file.size)} • {new Date(file.last_modified).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteFile(file.key)}
                              disabled={deleteFileMutation.isPending}
                              className="text-red-600 hover:text-red-800 p-2"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No files found in this bucket
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          Upload your first file to get started
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cdn' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  CDN Configuration
                </h3>
                
                {cdnLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading CDN status...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* CDN Status */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            CDN Status
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {cdnStatus?.cdn_enabled ? 'CDN is enabled for this bucket' : 'CDN is not enabled'}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cdnStatus?.cdn_enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                          {cdnStatus?.cdn_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      
                      {cdnStatus?.cdn_enabled && cdnStatus.cdn_url && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            CDN URL
                          </label>
                          <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded break-all">
                            {cdnStatus.cdn_url}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CDN Controls */}
                    {!cdnStatus?.cdn_enabled ? (
                      <form onSubmit={handleEnableCdn} className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Enable CDN
                        </h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cache TTL
                          </label>
                          <select
                            value={cdnTtl}
                            onChange={(e) => setCdnTtl(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            {ttlOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Custom Domain (Optional)
                          </label>
                          <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="cdn.example.com"
                          />
                        </div>

                        {customDomain && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Certificate ID
                            </label>
                            <input
                              type="text"
                              value={certificateId}
                              onChange={(e) => setCertificateId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              placeholder="cert-id"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={enableCdnMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <CloudIcon className="h-5 w-5" />
                          <span>{enableCdnMutation.isPending ? 'Enabling...' : 'Enable CDN'}</span>
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          CDN Management
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Current TTL
                            </label>
                            <select
                              value={cdnStatus?.ttl || 3600}
                              onChange={(e) => setCdnTtl(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                              {ttlOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleUpdateCdn}
                              disabled={updateCdnMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                            >
                              {updateCdnMutation.isPending ? 'Updating...' : 'Update TTL'}
                            </button>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={handlePurgeCache}
                            disabled={purgeCacheMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                          >
                            {purgeCacheMutation.isPending ? 'Purging...' : 'Purge Cache'}
                          </button>
                          
                          <button
                            onClick={handleDisableCdn}
                            disabled={disableCdnMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                          >
                            {disableCdnMutation.isPending ? 'Disabling...' : 'Disable CDN'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Advanced CORS Options
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Cross-origin resource sharing (CORS) allows client web applications loaded in one domain to interact with resources in another domain. 
                  Rules are processed in order from top to bottom until there is a match.
                </p>
                
                {corsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading CORS configuration...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current CORS Rules */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900 dark:text-white">CORS Rules</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setIsAddingRule(true)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span>Add Rule</span>
                            </button>
                            {corsData?.cors_rules && corsData.cors_rules.length > 0 && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete all CORS rules?')) {
                                    deleteCorsConfigMutation.mutate()
                                  }
                                }}
                                disabled={deleteCorsConfigMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span>{deleteCorsConfigMutation.isPending ? 'Deleting...' : 'Delete All'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {corsData?.cors_rules && corsData.cors_rules.length > 0 ? (
                          <div className="space-y-4">
                            {corsData.cors_rules.map((rule, index) => (
                              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Origins
                                    </label>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {rule.AllowedOrigins.join(', ')}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Methods
                                    </label>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {rule.AllowedMethods.join(', ')}
                                    </div>
                                  </div>
                                  {rule.AllowedHeaders && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Headers
                                      </label>
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        {rule.AllowedHeaders.join(', ')}
                                      </div>
                                    </div>
                                  )}
                                  {rule.MaxAgeSeconds && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Max Age
                                      </label>
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        {rule.MaxAgeSeconds} seconds
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => setEditingRule(rule)}
                                    className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this CORS rule?')) {
                                        const updatedRules = corsData.cors_rules.filter((_, i) => i !== index)
                                        setCorsConfigMutation.mutate({ rules: updatedRules })
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">No CORS rules configured</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              Add a rule to enable cross-origin access
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add/Edit CORS Rule Modal */}
                    {(isAddingRule || editingRule) && (
                      <CorsRuleEditor
                        rule={editingRule}
                        isOpen={isAddingRule || !!editingRule}
                        onClose={() => {
                          setIsAddingRule(false)
                          setEditingRule(null)
                        }}
                        onSave={(newRule) => {
                          const currentRules = corsData?.cors_rules || []
                          let updatedRules
                          
                          if (editingRule) {
                            // Update existing rule
                            const ruleIndex = currentRules.findIndex(r => 
                              JSON.stringify(r) === JSON.stringify(editingRule)
                            )
                            updatedRules = [...currentRules]
                            updatedRules[ruleIndex] = newRule
                          } else {
                            // Add new rule
                            updatedRules = [...currentRules, newRule]
                          }
                          
                          setCorsConfigMutation.mutate({ rules: updatedRules })
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BucketSettings
