// User types
export interface User {
  id: string
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  last_login?: string
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterCredentials {
  email: string
  username: string
  password: string
  full_name: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Droplet types
export interface Droplet {
  id: number
  user_id: number
  droplet_id: number
  name: string
  region: string
  size: string
  image: string
  status: 'building' | 'active' | 'error' | 'off' | 'archive'
  ip_address?: string
  created_at: string
  updated_at: string
  build_logs?: string
}

// Windows Builder types
export interface WindowsTemplate {
  id: string
  name: string
  description: string
  min_ram_gb: number
  min_disk_gb: number
  estimated_build_time_minutes: number
}

export interface WindowsBuildRequest {
  name: string
  template_id: string
  region: string
  size?: string
  username: string
  password: string
  enable_rdp?: boolean
  rdp_port?: number
}

export interface WindowsBuildResponse {
  droplet_id: number
  message: string
  status: string
  estimated_time_minutes: number
}

export interface WindowsBuildStatus {
  droplet_id: number
  status: string
  progress_percentage: number
  current_step: string
  ip_address?: string
  rdp_port?: number
  logs: string
}

// DigitalOcean types
export interface DORegion {
  slug: string
  name: string
  available: boolean
}

export interface DOSize {
  slug: string
  memory: number
  vcpus: number
  disk: number
  price_monthly: number
  available: boolean
  regions: string[]
}

// WebSocket types
export interface WSMessage {
  type: 'build_progress' | 'build_complete' | 'build_error'
  droplet_id: number
  progress?: number
  message?: string
  ip_address?: string
  rdp_port?: number
}
