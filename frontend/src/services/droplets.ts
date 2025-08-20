import { tokenService } from './tokenService'

export interface Droplet {
  id: string
  name: string
  status: string
  build_progress?: number
  rdp_ip?: string
  rdp_port?: number
  rdp_username?: string
  rdp_password?: string
  // DigitalOcean standard fields
  memory: number
  vcpus: number
  disk: number
  region: {
    name: string
    slug: string
    features: string[]
    available: boolean
    sizes: string[]
  }
  size: {
    slug: string
    memory: number
    vcpus: number
    disk: number
    transfer: number
    price_monthly: number
    price_hourly: number
    regions: string[]
    available: boolean
  }
  size_slug: string
  image: {
    id: number
    name: string
    distribution: string
    slug: string
    public: boolean
    regions: string[]
    created_at: string
  }
  created_at: string
  features: string[]
  backup_ids: number[]
  snapshot_ids: number[]
  volume_ids: string[]
  tags: string[]
  networks: {
    v4: Array<{
      ip_address: string
      netmask: string
      gateway: string
      type: 'public' | 'private'
    }>
    v6: Array<{
      ip_address: string
      netmask: number
      gateway: string
      type: 'public' | 'private'
    }>
  }
  locked: boolean
  kernel?: any
  next_backup_window?: any
  vpc_uuid?: string
  // Custom fields
  account_id?: number
  account_token?: string
  hourly_cost?: string
  monthly_cost?: string
  error_message?: string
  build_log?: string
}

export interface DropletCreate {
  name: string
  region: string
  size: string
  image?: string
  rdp_username?: string
  rdp_password?: string
}

export interface DropletStatus {
  id: string
  status: string
  build_progress: number
  build_log?: string
  error_message?: string
  rdp_ip?: string
  rdp_port: number
  rdp_username: string
}

export interface Region {
  slug: string
  name: string
  available: boolean
  features: string[]
}

export interface Size {
  slug: string
  memory: number
  vcpus: number
  disk: number
  transfer: number
  price_monthly: string
  price_hourly: string
  available: boolean
  regions: string[]
  description: string
}

export interface Image {
  id: string
  name: string
  distribution: string
  slug: string
  public: boolean
  regions: string[]
  created_at: string
  min_disk_size: number
  size_gigabytes: number
  description: string
  status: string
  error_message?: string
  tags: string[]
  type?: string  // Type: distribution, application, user, etc.
}

export const dropletsApi = {
  // List droplets for a specific user
  list: (user_id?: string) => {
    const params = user_id ? { user_id } : {}
    return tokenService.makeApiCall({
      method: 'GET',
      url: '/api/v1/droplets',
      params
    })
  },

  // Get single droplet
  get: (id: string) => tokenService.makeApiCall({
    method: 'GET',
    url: `/api/v1/droplets/${id}`
  }),

  // Create new droplet with account selection
  create: (data: any) => tokenService.makeApiCall({
    method: 'POST',
    url: '/api/v1/droplets',
    data
  }),

  // Delete droplet
  delete: (id: string) => tokenService.makeApiCall({
    method: 'DELETE',
    url: `/api/v1/droplets/${id}`
  }),

  // Get droplet status
  getStatus: (id: string) => tokenService.makeApiCall({
    method: 'GET',
    url: `/api/v1/droplets/${id}/status`
  }),

  // Get available regions - Public API (no auth required)
  getRegions: () => fetch('http://localhost:5000/api/v1/regions').then(res => res.json()),

  // Get available sizes - Public API (no auth required)
  getSizes: () => fetch('http://localhost:5000/api/v1/sizes').then(res => res.json()),

  // Get available images - Public API (no auth required)
  getImages: () => fetch('http://localhost:5000/api/v1/images').then(res => res.json()),

  // Legacy endpoints for compatibility
  getLegacyRegions: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/droplets/regions/list'
  }),
  getLegacySizes: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/droplets/sizes/list'
  }),
  getLegacyImages: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/images'
  }),

  // Restart droplet
  restart: (id: string) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/restart`
    })
  },

  // Stop droplet
  stop: (id: string) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/stop`
    })
  },

  // Shutdown droplet
  shutdown: (id: string) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/shutdown`
    })
  },

  // Password reset
  passwordReset: (id: string) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/password_reset`
    })
  },

  // Start droplet
  start: (id: string) => {
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/start`
    })
  },

  // Resize droplet
  resize: (id: string, newSize: string, disk: boolean = false) =>
    tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/resize`,
      data: { size: newSize, disk }
    }),

  // Create snapshot
  snapshot: (id: string, snapshotName?: string) => {
    const data = snapshotName ? { name: snapshotName } : {};
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/snapshot`,
      data
    });
  },

  // Rebuild droplet
  rebuild: (id: string, image?: string) => {
    const data = image ? { image } : {};
    return tokenService.makeApiCall({
      method: 'POST',
      url: `/api/v1/droplets/${id}/rebuild`,
      data
    });
  },

  // Get SSH keys
  getSSHKeys: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/ssh_keys'
  }),

  // Get VPCs
  getVPCs: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/vpcs'
  }),

  // Get monitoring metrics
  getMonitoring: (id: string, hours: number = 1) => tokenService.makeApiCall({
    method: 'GET',
    url: `/api/v1/droplets/${id}/monitoring?hours=${hours}`
  })
}