import { tokenService } from './tokenService'

export interface Space {
  id: string
  name: string
  region: string
  endpoint: string
  size_gb?: number
  files_count?: number
  created_at: string
  status: 'active' | 'inactive'
  access_key?: string
  secret_key?: string
  cdn_endpoint?: string
  ttl?: number
}

export interface SpaceFile {
  id: string
  name: string
  size: number
  type: string
  last_modified: string
  url?: string
  key?: string
}

export interface CreateSpaceRequest {
  name: string
  region: string
}

export interface SpacesListResponse {
  spaces: Space[]
  total: number
  page: number
  per_page: number
}

export interface SpaceFilesResponse {
  files: SpaceFile[]
  bucket_name: string
  total?: number
}

export const spacesApi = {
  // List all Spaces keys/buckets
  list: (page: number = 1, per_page: number = 25) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: '/api/v1/spaces/',
      params: { page, per_page }
    })
  },

  // Get specific Space details
  get: (keyId: string) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/${keyId}`
    })
  },

  // Create new Space key
  create: (data: CreateSpaceRequest) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: '/api/v1/spaces/',
      data
    })
  },

  // Delete Space key
  delete: (keyId: string) => {
    return tokenService.makeApiCall({
      method: 'DELETE',
      url: `/api/v1/spaces/${keyId}`
    })
  },

  // Get Space usage statistics
  getUsage: (keyId: string) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/${keyId}/usage`
    })
  },

  // Validate Space key
  validate: (keyId: string) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/${keyId}/validate`
    })
  },

  // List buckets for a Space
  listBuckets: (region: string = 'nyc3') => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: '/api/v1/spaces/buckets/',
      params: { region }
    })
  },

  // Get bucket details
  getBucket: (bucketName: string, region: string = 'nyc3') => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/buckets/${bucketName}`,
      params: { region }
    })
  },

  // Create new bucket
  createBucket: (bucketName: string, region: string = 'nyc3', acl: string = 'private') => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: '/api/v1/spaces/buckets/',
      data: { name: bucketName, region, acl }
    })
  },

  // Delete bucket
  deleteBucket: (bucketName: string, region: string = 'nyc3') => {
    return tokenService.makeApiCall({
      method: 'DELETE',
      url: `/api/v1/spaces/buckets/${bucketName}`,
      params: { region }
    })
  },

  // List files in bucket
  listFiles: (bucketName: string, region: string = 'nyc3', prefix?: string) => {
    const params: any = { region }
    if (prefix) params.prefix = prefix

    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/buckets/${bucketName}/files`,
      params
    })
  },

  // Upload file to bucket
  uploadFile: (bucketName: string, file: File, key: string, region: string = 'nyc3', acl: string = 'private') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('key', key)
    formData.append('region', region)
    formData.append('acl', acl)

    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/spaces/buckets/${bucketName}/files/upload`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Delete file from bucket
  deleteFile: (bucketName: string, fileKey: string, region: string = 'nyc3') => {
    return tokenService.makeApiCall({
      method: 'DELETE',
      url: `/api/v1/spaces/buckets/${bucketName}/files/${encodeURIComponent(fileKey)}`,
      params: { region }
    })
  },

  // Get file download URL
  getFileUrl: (bucketName: string, fileKey: string, region: string = 'nyc3', expires: number = 3600) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/buckets/${bucketName}/files/${encodeURIComponent(fileKey)}/url`,
      params: { region, expires }
    })
  },

  // CDN Management
  getCdnSettings: (bucketName: string) => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/spaces/buckets/${bucketName}/cdn/settings`
    })
  },

  updateCdnSettings: (bucketName: string, settings: any) => {
    return tokenService.makeApiCall({
      method: 'PUT',
      url: `/api/v1/spaces/buckets/${bucketName}/cdn/settings`,
      data: settings
    })
  },

  purgeCdnCache: (bucketName: string, files?: string[], region: string = 'nyc3') => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/spaces/buckets/${bucketName}/cdn/purge`,
      data: { region, files }
    })
  },

  // Test endpoint
  test: () => {
    return tokenService.makeApiCall({
      method: 'GET',
      url: '/api/v1/spaces-test'
    })
  }
}

export default spacesApi