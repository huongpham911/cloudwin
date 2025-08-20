import { api } from './api'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  do_api_token?: string
  auto_optimize_costs: boolean
  notification_preferences: {
    email_alerts: boolean
    cost_alerts: boolean
    build_notifications: boolean
  }
  created_at: string
  updated_at: string
}

export interface UpdateProfile {
  full_name?: string
  do_api_token?: string
  auto_optimize_costs?: boolean
  notification_preferences?: {
    email_alerts?: boolean
    cost_alerts?: boolean
    build_notifications?: boolean
  }
}

export interface ChangePassword {
  current_password: string
  new_password: string
  confirm_password: string
}

export const settingsApi = {
  // Get user profile
  getProfile: () => api.get<UserProfile>('/api/v1/auth/me'),
  
  // Update user profile
  updateProfile: (data: UpdateProfile) => 
    api.put<UserProfile>('/api/v1/auth/profile', data),
  
  // Change password
  changePassword: (data: ChangePassword) => 
    api.post('/api/v1/auth/change-password', data),
  
  // Test DigitalOcean API token
  testDoToken: (token: string) => 
    api.post('/api/v1/auth/test-do-token', { token }),
  
  // Delete account
  deleteAccount: () => api.delete('/api/v1/auth/account')
}