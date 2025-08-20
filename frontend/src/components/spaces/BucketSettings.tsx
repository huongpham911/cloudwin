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
  bucket: SpacesBucket | null
  buckets: SpacesBucket[]
  onClose: () => void
  onSelectBucket: (bucket: SpacesBucket) => void
}

const BucketSettings: React.FC<BucketSettingsProps> = ({ bucket, buckets, onClose, onSelectBucket }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'files' | 'cdn' | 'cors' | 'guide'>('general')
  const [cdnTtl, setCdnTtl] = useState(3600)
  const [customDomain, setCustomDomain] = useState('')
  const [certificateId, setCertificateId] = useState('')
  const [currentPath, setCurrentPath] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [corsRules, setCorsRules] = useState<CorsRule[]>([])
  const [showAdvancedCors, setShowAdvancedCors] = useState(false)
  
  const queryClient = useQueryClient()

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - Move all hooks to top
  // Fetch CDN status for this bucket
  const { data: cdnStatus, isLoading: cdnLoading } = useQuery({
    queryKey: ['bucket-cdn-status', bucket?.name || 'none'],
    queryFn: () => bucket ? spacesApi.getBucketCdnStatus(bucket.name, bucket.region) : Promise.resolve(null),
    enabled: !!bucket,
    refetchInterval: activeTab === 'cdn' ? 10000 : false,
  })

  // Fetch files for this bucket
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['bucket-files', bucket?.name || 'none', currentPath],
    queryFn: () => bucket ? spacesApi.listFiles(bucket.name, bucket.region, currentPath || undefined) : Promise.resolve(null),
    enabled: !!bucket,
    refetchInterval: activeTab === 'files' ? 5000 : false,
  })

  // Fetch CORS configuration for this bucket
  const { data: corsData, isLoading: corsLoading } = useQuery({
    queryKey: ['bucket-cors', bucket?.name || 'none'],
    queryFn: () => bucket ? spacesApi.getBucketCors(bucket.name, bucket.region) : Promise.resolve(null),
    enabled: !!bucket,
    refetchInterval: activeTab === 'cors' ? 10000 : false,
  })

  // Enable CDN mutation
  const enableCdnMutation = useMutation({
    mutationFn: (settings: { ttl: number; customDomain?: string; certificateId?: string }) =>
      bucket ? spacesApi.enableBucketCdn(bucket.name, bucket.region, settings) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket?.name] })
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
    mutationFn: () => bucket ? spacesApi.disableBucketCdn(bucket.name, bucket.region) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket?.name] })
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
      bucket ? spacesApi.updateBucketCdnSettings(bucket.name, bucket.region, settings) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cdn-status', bucket?.name] })
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
    mutationFn: () => bucket ? spacesApi.purgeBucketCdnCache(bucket.name, bucket.region) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      toast.success('CDN cache purged successfully!')
    },
    onError: (error: any) => {
      console.error('Purge cache error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to purge CDN cache'
      toast.error(errorMessage)
    },
  })

  // Update CORS configuration mutation
  const updateCorsMutation = useMutation({
    mutationFn: (corsConfig: CorsConfiguration) =>
      bucket ? spacesApi.setBucketCors(bucket.name, corsConfig, bucket.region) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-cors', bucket?.name] })
      toast.success('CORS configuration updated successfully!')
    },
    onError: (error: any) => {
      console.error('Update CORS error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update CORS configuration'
      toast.error(errorMessage)
    },
  })

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: (request: { file: File; key: string; acl?: 'private' | 'public-read' | 'public-read-write'; onProgress?: (progress: number) => void }) => {
      if (!bucket) return Promise.reject('No bucket selected')
      setIsUploading(true)
      setUploadProgress(0)
      return spacesApi.uploadFile(bucket.name, bucket.region, request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket?.name] })
      setIsUploading(false)
      setUploadProgress(100)
      
      // Enhanced success notification with file details
      const uploadedFile = uploadFile
      if (uploadedFile && bucket) {
        const fileSize = (uploadedFile.size / (1024 * 1024)).toFixed(2) // Convert to MB
        toast.success(
          `✅ File uploaded successfully!\n📁 ${uploadedFile.name}\n📊 Size: ${fileSize} MB\n🌐 Bucket: ${bucket.name}`,
          { duration: 5000 }
        )
      } else {
        toast.success('File uploaded successfully!')
      }
      
      setUploadFile(null)
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 2000)
    },
    onError: (error: any) => {
      console.error('Upload file error:', error)
      setIsUploading(false)
      setUploadProgress(0)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file'
      toast.error(`❌ Upload failed: ${errorMessage}`)
    },
  })

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (request: { folder_name: string; path?: string }) =>
      bucket ? spacesApi.createFolder(bucket.name, bucket.region, request) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket?.name] })
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
    mutationFn: (key: string) => bucket ? spacesApi.deleteFile(bucket.name, bucket.region, key) : Promise.reject('No bucket selected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files', bucket?.name] })
      toast.success('File deleted successfully!')
    },
    onError: (error: any) => {
      console.error('Delete file error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete file'
      toast.error(errorMessage)
    },
  })

  // Load CORS data when it changes - MOVE ALL useEffect to top after other hooks
  React.useEffect(() => {
    if (corsData?.cors_rules) {
      setCorsRules(corsData.cors_rules)
    }
  }, [corsData])

  // Don't render if no bucket is selected - AFTER ALL HOOKS
  if (!bucket) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select a bucket
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Choose a bucket from the list to view its settings and manage files</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Buckets List */}
        <div className="flex-1 overflow-hidden p-6">
          {buckets.length === 0 ? (
            <div className="text-center py-12">
              <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No buckets found
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Create your first bucket to get started
              </p>
            </div>
          ) : (
            <div className="h-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Available Buckets ({buckets.length})
              </h3>
              
              {/* Scrollable Buckets List */}
              <div className="h-80 overflow-y-auto space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {buckets.map((bucketItem, index) => (
                  <div
                    key={bucketItem.name}
                    onClick={() => onSelectBucket?.(bucketItem)}
                    className="group p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CloudIcon className="h-8 w-8 text-blue-500 group-hover:text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {bucketItem.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              📍 {bucketItem.region}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              📅 {new Date(bucketItem.creation_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {bucketItem.name}.{bucketItem.region}.digitaloceanspaces.com
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                            Select →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  💡 Quick Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500">•</span>
                    <span className="text-gray-600 dark:text-gray-400">Select a bucket to manage files and settings</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">•</span>
                    <span className="text-gray-600 dark:text-gray-400">Configure CDN and CORS settings</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500">•</span>
                    <span className="text-gray-600 dark:text-gray-400">Upload files up to 100GB</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500">•</span>
                    <span className="text-gray-600 dark:text-gray-400">Setup custom domains</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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

    if (!bucket) {
      toast.error('No bucket selected')
      return
    }

    const key = currentPath ? `${currentPath}/${uploadFile.name}` : uploadFile.name
    uploadFileMutation.mutate({
      file: uploadFile,
      key,
      acl: 'private' as const,
      onProgress: (progress: number) => {
        setUploadProgress(progress)
      }
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

  const handleSelectFile = (fileKey: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileKey)) {
      newSelected.delete(fileKey)
    } else {
      newSelected.add(fileKey)
    }
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = () => {
    if (filesData?.files) {
      const allFileKeys = filesData.files.map(file => file.key)
      setSelectedFiles(new Set(allFileKeys))
    }
  }

  const handleUnselectAll = () => {
    setSelectedFiles(new Set())
  }

  const handleDeleteSelectedFiles = () => {
    if (selectedFiles.size === 0) {
      toast.error('No files selected')
      return
    }

    const fileCount = selectedFiles.size
    if (window.confirm(`Are you sure you want to delete ${fileCount} selected file(s)?`)) {
      selectedFiles.forEach(fileKey => {
        deleteFileMutation.mutate(fileKey)
      })
      setSelectedFiles(new Set())
    }
  }

  // CORS Helper Functions
  const handleAddCorsRule = () => {
    const newRule: CorsRule = {
      ID: `rule-${Date.now()}`,
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET'],
      AllowedHeaders: ['*'],
      MaxAgeSeconds: 3600
    }
    setCorsRules([...corsRules, newRule])
  }

  const handleRemoveCorsRule = (index: number) => {
    const newRules = corsRules.filter((_, i) => i !== index)
    setCorsRules(newRules)
  }

  const handleUpdateCorsRule = (index: number, updatedRule: CorsRule) => {
    const newRules = [...corsRules]
    newRules[index] = updatedRule
    setCorsRules(newRules)
  }

  const handleSaveCorsConfiguration = () => {
    if (!bucket) return
    
    const corsConfig: CorsConfiguration = {
      rules: corsRules
    }
    
    updateCorsMutation.mutate(corsConfig)
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

  const ttlOptions = [
    { value: 60, label: '1 minute' },
    { value: 600, label: '10 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 86400, label: '1 day' },
    { value: 604800, label: '1 week' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
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
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'guide'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            How-to Guide
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
                        disabled={isUploading}
                      />
                    </div>
                    
                    {/* Upload Progress Bar */}
                    {(isUploading || uploadProgress > 0) && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isUploading ? 'Uploading...' : uploadProgress === 100 ? 'Upload Complete!' : 'Upload Progress'}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {Math.round(uploadProgress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        {uploadFile && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            File: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={!uploadFile || isUploading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowCreateFolder(!showCreateFolder)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        disabled={isUploading}
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
                      <div>
                        {/* Selection Controls */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={handleSelectAll}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Select All ({filesData.files.filter(f => !f.is_folder).length} files)
                            </button>
                            <button
                              onClick={handleUnselectAll}
                              className="text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              Unselect All
                            </button>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedFiles.size} selected
                            </span>
                            {selectedFiles.size > 0 && (
                              <button
                                onClick={handleDeleteSelectedFiles}
                                disabled={deleteFileMutation.isPending}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Delete Selected
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Files Scroll Container */}
                        <div className="max-h-80 overflow-y-auto bg-white dark:bg-gray-900 rounded-b-lg">
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filesData.files.map((file, index) => (
                              <div key={index} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                !file.is_folder && selectedFiles.has(file.key) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}>
                                <div className="flex items-center space-x-3">
                                  {/* Checkbox for files only */}
                                  {!file.is_folder && (
                                    <input
                                      type="checkbox"
                                      checked={selectedFiles.has(file.key)}
                                      onChange={() => handleSelectFile(file.key)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                  )}
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
                                  className="text-red-600 hover:text-red-800 p-2 transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
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

          {/* CORS Configuration Tab */}
          {activeTab === 'cors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  CORS Configuration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Cross-Origin Resource Sharing (CORS) allows client web applications that are loaded in one domain to interact with resources in a different domain.
                </p>

                {corsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Loading CORS configuration...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quick Setup */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Quick Setup
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => {
                            setCorsRules([{
                              ID: 'allow-all',
                              AllowedOrigins: ['*'],
                              AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                              AllowedHeaders: ['*'],
                              MaxAgeSeconds: 3600
                            }])
                          }}
                          className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">🌐 Allow All Origins</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Allow all origins and methods (for development)
                          </div>
                        </button>
                        <button
                          onClick={() => setShowAdvancedCors(true)}
                          className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">⚙️ Advanced Configuration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Configure custom CORS rules
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Custom Domain Helper */}
                    <div className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                        🌍 Add Custom Domain to CORS
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                        Add your custom domain to allow cross-origin requests from your website.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              Domain URL
                            </label>
                            <input
                              type="text"
                              placeholder="https://yourdomain.com"
                              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-800/50 dark:text-blue-100"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const domain = (e.target as HTMLInputElement).value.trim()
                                  if (domain) {
                                    // Add domain to CORS rules
                                    const newRule: CorsRule = {
                                      ID: `domain-${Date.now()}`,
                                      AllowedOrigins: [domain],
                                      AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                                      AllowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
                                      MaxAgeSeconds: 3600
                                    }
                                    setCorsRules([...corsRules, newRule])
                                    ;(e.target as HTMLInputElement).value = ''
                                    toast.success(`Added CORS rule for ${domain}`)
                                  }
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              CDN Domain
                            </label>
                            <input
                              type="text"
                              placeholder="https://cdn.yourdomain.com"
                              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-800/50 dark:text-blue-100"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const domain = (e.target as HTMLInputElement).value.trim()
                                  if (domain) {
                                    // Add CDN domain to CORS rules
                                    const newRule: CorsRule = {
                                      ID: `cdn-${Date.now()}`,
                                      AllowedOrigins: [domain],
                                      AllowedMethods: ['GET', 'HEAD'],
                                      AllowedHeaders: ['*'],
                                      MaxAgeSeconds: 86400 // 1 day for CDN
                                    }
                                    setCorsRules([...corsRules, newRule])
                                    ;(e.target as HTMLInputElement).value = ''
                                    toast.success(`Added CORS rule for CDN ${domain}`)
                                  }
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              Local Development
                            </label>
                            <button
                              onClick={() => {
                                const localRule: CorsRule = {
                                  ID: `local-${Date.now()}`,
                                  AllowedOrigins: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
                                  AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                                  AllowedHeaders: ['*'],
                                  MaxAgeSeconds: 3600
                                }
                                setCorsRules([...corsRules, localRule])
                                toast.success('Added CORS rules for local development')
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                            >
                              Add Localhost
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          💡 <strong>Tip:</strong> Press Enter after typing a domain to add it automatically. 
                          Use full URLs including protocol (https:// or http://).
                        </div>
                      </div>
                    </div>

                    {/* Common Domain Templates */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        📋 Common Domain Templates
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <button
                          onClick={() => {
                            const rule: CorsRule = {
                              ID: `vercel-${Date.now()}`,
                              AllowedOrigins: ['https://*.vercel.app'],
                              AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
                              AllowedHeaders: ['Authorization', 'Content-Type'],
                              MaxAgeSeconds: 3600
                            }
                            setCorsRules([...corsRules, rule])
                            toast.success('Added Vercel domain pattern')
                          }}
                          className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">Vercel Apps</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">*.vercel.app</div>
                        </button>
                        <button
                          onClick={() => {
                            const rule: CorsRule = {
                              ID: `netlify-${Date.now()}`,
                              AllowedOrigins: ['https://*.netlify.app'],
                              AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
                              AllowedHeaders: ['Authorization', 'Content-Type'],
                              MaxAgeSeconds: 3600
                            }
                            setCorsRules([...corsRules, rule])
                            toast.success('Added Netlify domain pattern')
                          }}
                          className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">Netlify Apps</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">*.netlify.app</div>
                        </button>
                        <button
                          onClick={() => {
                            const rule: CorsRule = {
                              ID: `github-${Date.now()}`,
                              AllowedOrigins: ['https://*.github.io'],
                              AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
                              AllowedHeaders: ['Authorization', 'Content-Type'],
                              MaxAgeSeconds: 3600
                            }
                            setCorsRules([...corsRules, rule])
                            toast.success('Added GitHub Pages pattern')
                          }}
                          className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">GitHub Pages</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">*.github.io</div>
                        </button>
                      </div>
                    </div>

                    {/* Advanced CORS Configuration */}
                    {(showAdvancedCors || corsRules.length > 0) && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            CORS Rules
                          </h4>
                          <button
                            onClick={handleAddCorsRule}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Rule</span>
                          </button>
                        </div>

                        {corsRules.length === 0 ? (
                          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                            No CORS rules configured. Click "Add Rule" to create one.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {corsRules.map((rule, index) => (
                              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    Rule {index + 1}
                                  </h5>
                                  <button
                                    onClick={() => handleRemoveCorsRule(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Allowed Origins
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.AllowedOrigins.join(', ')}
                                      onChange={(e) => {
                                        const origins = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                        handleUpdateCorsRule(index, { ...rule, AllowedOrigins: origins })
                                      }}
                                      placeholder="https://example.com, *"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Allowed Methods
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].map(method => (
                                        <label key={method} className="flex items-center space-x-1">
                                          <input
                                            type="checkbox"
                                            checked={rule.AllowedMethods.includes(method)}
                                            onChange={(e) => {
                                              let methods = [...rule.AllowedMethods]
                                              if (e.target.checked) {
                                                methods.push(method)
                                              } else {
                                                methods = methods.filter(m => m !== method)
                                              }
                                              handleUpdateCorsRule(index, { ...rule, AllowedMethods: methods })
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                          />
                                          <span className="text-sm text-gray-700 dark:text-gray-300">{method}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Allowed Headers
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.AllowedHeaders?.join(', ') || ''}
                                      onChange={(e) => {
                                        const headers = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                        handleUpdateCorsRule(index, { ...rule, AllowedHeaders: headers })
                                      }}
                                      placeholder="Content-Type, Authorization, *"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Max Age (seconds)
                                    </label>
                                    <input
                                      type="number"
                                      value={rule.MaxAgeSeconds || 3600}
                                      onChange={(e) => {
                                        handleUpdateCorsRule(index, { ...rule, MaxAgeSeconds: parseInt(e.target.value) || 3600 })
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {corsRules.length > 0 && (
                          <div className="flex justify-end space-x-4 mt-6">
                            <button
                              onClick={() => {
                                setCorsRules([])
                                setShowAdvancedCors(false)
                              }}
                              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Clear All
                            </button>
                            <button
                              onClick={handleSaveCorsConfiguration}
                              disabled={updateCorsMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
                            >
                              {updateCorsMutation.isPending ? 'Saving...' : 'Save CORS Configuration'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current CORS Status */}
                    {corsData && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Current CORS Configuration
                        </h4>
                        {corsData.cors_rules && corsData.cors_rules.length > 0 ? (
                          <div className="space-y-3">
                            {corsData.cors_rules.map((rule, index) => (
                              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Origins:</span>
                                    <div className="text-gray-600 dark:text-gray-400">{rule.AllowedOrigins?.join(', ') || 'None'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Methods:</span>
                                    <div className="text-gray-600 dark:text-gray-400">{rule.AllowedMethods?.join(', ') || 'None'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Headers:</span>
                                    <div className="text-gray-600 dark:text-gray-400">{rule.AllowedHeaders?.join(', ') || 'None'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Max Age:</span>
                                    <div className="text-gray-600 dark:text-gray-400">{rule.MaxAgeSeconds || 0}s</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400">No CORS rules are currently configured for this bucket.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  DigitalOcean Spaces + CDN + Custom Domain Setup Guide
                </h3>
                
                <div className="prose max-w-none dark:prose-invert">
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                    <h4 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                      📘 Complete Guide: Spaces + CDN + Custom Domain
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      This guide covers everything from creating your first Spaces bucket to setting up a custom domain with CDN.
                    </p>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        🚀 Step 1: Creating Your Spaces Bucket
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <h5 className="font-medium mb-2">Public vs Private Buckets:</h5>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li><strong>Public:</strong> Files accessible via direct URLs (good for websites, CDN content)</li>
                          <li><strong>Private:</strong> Files require authentication (good for user uploads, sensitive data)</li>
                        </ul>
                      </div>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>Choose your bucket name (must be globally unique)</li>
                        <li>Select your region (closer to users = faster access)</li>
                        <li>Choose Public or Private access level</li>
                        <li>Click "Create Bucket" - your bucket is ready!</li>
                      </ol>
                    </section>

                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        📁 Step 2: Managing Files
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Uploading Files</h5>
                          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                            <li>• Drag & drop files into the Files tab</li>
                            <li>• Supports files up to 100GB</li>
                            <li>• Progress tracking for large uploads</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
                          <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-2">File Management</h5>
                          <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            <li>• Bulk select with checkboxes</li>
                            <li>• Delete multiple files at once</li>
                            <li>• Download individual files</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        🌐 Step 3: Setting Up CDN
                      </h4>
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Why Use CDN?</h5>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          CDN (Content Delivery Network) caches your files worldwide, making them load faster for users everywhere.
                        </p>
                      </div>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>Go to the "CDN" tab in your bucket settings</li>
                        <li>Click "Create CDN Endpoint"</li>
                        <li>Choose your CDN origin (your Spaces bucket)</li>
                        <li>Configure cache settings (TTL - Time To Live)</li>
                        <li>Your CDN URL will be: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">https://your-endpoint.fra1.cdn.digitaloceanspaces.com</code></li>
                      </ol>
                    </section>

                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        🔧 Step 4: CORS Configuration
                      </h4>
                      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">When Do You Need CORS?</h5>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          CORS is needed when your website (running on one domain) wants to access files from your Spaces bucket (on another domain).
                        </p>
                      </div>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>Go to the "CORS Configuration" tab</li>
                        <li>Click "Add Rule" to create a new CORS rule</li>
                        <li>Set allowed origins (e.g., <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">https://yourdomain.com</code> or <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">*</code> for all)</li>
                        <li>Set allowed methods (GET, POST, PUT, DELETE)</li>
                        <li>Click "Save CORS Rules"</li>
                      </ol>
                    </section>

                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        🌍 Step 5: Custom Domain Setup
                      </h4>
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">⚠️ Important Prerequisites</h5>
                        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                          <li>• You must own a domain name</li>
                          <li>• Access to your domain's DNS settings</li>
                          <li>• CDN endpoint must be created first</li>
                        </ul>
                      </div>

                      <h5 className="text-lg font-medium mb-3">5.1 Configure Your CDN for Custom Domain</h5>
                      <ol className="list-decimal pl-6 space-y-2 mb-6">
                        <li>In DigitalOcean Control Panel, go to Spaces → CDN</li>
                        <li>Click on your CDN endpoint</li>
                        <li>Go to "Settings" tab</li>
                        <li>In "Custom Domain" section, enter your domain (e.g., <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">cdn.yourdomain.com</code>)</li>
                        <li>Click "Add Domain"</li>
                      </ol>

                      <h5 className="text-lg font-medium mb-3">5.2 DNS Configuration</h5>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <h6 className="font-medium mb-2">Required DNS Records:</h6>
                        <div className="space-y-2 text-sm font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded">
                          <div>
                            <span className="text-blue-600">Type:</span> CNAME<br/>
                            <span className="text-blue-600">Name:</span> cdn (or your chosen subdomain)<br/>
                            <span className="text-blue-600">Value:</span> your-endpoint.fra1.cdn.digitaloceanspaces.com
                          </div>
                        </div>
                      </div>

                      <ol className="list-decimal pl-6 space-y-2 mb-6">
                        <li>Go to your domain registrar's DNS management panel</li>
                        <li>Create a CNAME record pointing your subdomain to your CDN endpoint</li>
                        <li>Wait for DNS propagation (can take up to 24 hours)</li>
                        <li>Test your custom domain: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">https://cdn.yourdomain.com/your-file.jpg</code></li>
                      </ol>

                      <h5 className="text-lg font-medium mb-3">5.3 SSL Certificate (Optional but Recommended)</h5>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>In your CDN settings, enable "Let's Encrypt Certificate"</li>
                        <li>DigitalOcean will automatically generate and manage SSL certificates</li>
                        <li>Your files will be accessible via HTTPS</li>
                      </ol>
                    </section>

                    <section>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        ✅ Step 6: Testing Your Setup
                      </h4>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Verification Checklist:</h5>
                        <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                          <li>✓ Upload a test file to your bucket</li>
                          <li>✓ Access file via direct Spaces URL</li>
                          <li>✓ Access file via CDN URL</li>
                          <li>✓ Access file via custom domain (if configured)</li>
                          <li>✓ Test CORS from your website (if needed)</li>
                        </ul>
                      </div>
                    </section>

                    <section className="border-t pt-6">
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        🔗 Useful Links
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium mb-2">DigitalOcean Documentation:</h5>
                          <ul className="text-sm text-blue-600 space-y-1">
                            <li><a href="https://docs.digitalocean.com/products/spaces/" target="_blank" rel="noopener noreferrer" className="hover:underline">Spaces Overview</a></li>
                            <li><a href="https://docs.digitalocean.com/products/spaces/how-to/create/" target="_blank" rel="noopener noreferrer" className="hover:underline">Creating Spaces</a></li>
                            <li><a href="https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/" target="_blank" rel="noopener noreferrer" className="hover:underline">CDN Setup</a></li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">DNS Tools:</h5>
                          <ul className="text-sm text-blue-600 space-y-1">
                            <li><a href="https://www.whatsmydns.net/" target="_blank" rel="noopener noreferrer" className="hover:underline">DNS Propagation Checker</a></li>
                            <li><a href="https://dnschecker.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">DNS Checker</a></li>
                          </ul>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}

export default BucketSettings
