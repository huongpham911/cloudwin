import { api } from './api'

export interface UserCreateRequest {
  email: string
  password: string
  full_name: string
  role_name: string
}

export interface UserUpdateRequest {
  email?: string
  full_name?: string
  monthly_build_limit?: number
  max_droplets?: number
}

export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  role_id: string
  role_name: string
  monthly_build_limit: number
  max_droplets: number
  created_at: string
  updated_at: string
}

export interface SystemStats {
  users: {
    total: number
    active: number
    admins: number
  }
  droplets: {
    total: number
    active: number
    utilization_rate: number
  }
  agents?: {
    total: number
    active: number
    by_user: Record<string, number>
    recent_activity: number
  }
  spaces?: {
    total: number
    active: number
  }
  regional_distribution: Array<{
    region: string
    total_droplets: number
    active_droplets: number
    utilization_rate: number
  }>
  top_users: Array<{
    user_id: string
    email: string
    full_name: string
    total_droplets: number
    active_droplets: number
  }>
}

export interface AuditLog {
  id: string
  timestamp: string
  user_email: string
  action: string
  resource: string
  details: string
  ip_address: string
  user_agent: string
}

export const adminApi = {
  // User Management
  async createUser(userData: UserCreateRequest): Promise<User> {
    const response = await api.post('/admin/users', userData)
    return response.data
  },

  async getUsers(params: { page?: number; limit?: number; search?: string } = {}): Promise<{ users: User[], total: number }> {
    const { page = 1, limit = 20, search } = params;
    const urlParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (search) {
      urlParams.append('search', search)
    }

    const response = await api.get(`/admin/users?${urlParams}`)
    return response.data
  },

  async getUser(userId: string): Promise<User> {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  async updateUser(userId: string, userData: UserUpdateRequest): Promise<User> {
    const response = await api.put(`/admin/users/${userId}`, userData)
    return response.data
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`)
  },

  async changeUserRole(userId: string, roleName: string): Promise<User> {
    const response = await api.put(`/admin/users/${userId}/role`, { role_name: roleName })
    return response.data
  },

  async activateUser(userId: string): Promise<User> {
    const response = await api.put(`/admin/users/${userId}/activate`)
    return response.data
  },

  async deactivateUser(userId: string): Promise<User> {
    const response = await api.put(`/admin/users/${userId}/deactivate`)
    return response.data
  },

  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    await api.put(`/admin/users/${userId}/password`, { new_password: newPassword })
  },

  // Admin Management
  async createAdmin(adminData: Omit<UserCreateRequest, 'role_name'>): Promise<User> {
    const response = await api.post('/admin/create-admin', adminData)
    return response.data
  },

  async getAdmins(): Promise<User[]> {
    const response = await api.get('/admin/admins')
    return response.data
  },

  // System Stats
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get('/api/v1/admin/system/stats')
    return response.data
  },

  // Agent Management
  async getAllAgents(params: { page?: number; limit?: number; search?: string; user_id?: string } = {}): Promise<any> {
    const { page = 1, limit = 20, search, user_id } = params;
    const urlParams = new URLSearchParams({
      page: page.toString(),
      size: limit.toString(),
    })
    if (search) {
      urlParams.append('search', search)
    }
    if (user_id) {
      urlParams.append('user_id', user_id)
    }

    const response = await api.get(`/api/v1/admin/agents?${urlParams}`)
    return response.data
  },

  async getAgentDetails(agentId: string): Promise<any> {
    const response = await api.get(`/api/v1/admin/agents/${agentId}`)
    return response.data
  },

  async deleteAgent(agentId: string): Promise<any> {
    const response = await api.delete(`/api/v1/admin/agents/${agentId}`)
    return response.data
  },

  // Admin Analytics (for spaces view)
  async getAdminAnalytics(): Promise<any> {
    const response = await api.get('/admin/analytics')
    return response.data
  },

  // Audit Logs
  async getAuditLogs(page = 1, limit = 50, filters?: {
    resource_type?: string;
    action?: string;
    search?: string;
  }): Promise<{ logs: AuditLog[], total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters?.action) params.append('action', filters.action);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/admin/audit-logs?${params}`);

    // Transform minimal API response to expected format
    return {
      logs: response.data.data || [],
      total: response.data.pagination?.total || 0
    };
  },

  // Droplet Management (Admin view) - backend handles DO API integration
  async getAllDroplets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    user_id?: string;
    search?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.region) searchParams.append('region', params.region);
    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.search) searchParams.append('search', params.search);

    const response = await api.get(`/admin/droplets?${searchParams}`);
    return response.data;
  },

  async getDropletsStats(): Promise<any> {
    const response = await api.get('/admin/droplets/stats');
    return response.data;
  },

  async bulkDropletAction(action: string, dropletIds: string[]): Promise<any> {
    const response = await api.post('/admin/droplets/bulk-action', {
      action,
      droplet_ids: dropletIds
    });
    return response.data;
  },

  async reassignDroplet(dropletId: string, newUserId: string): Promise<any> {
    const response = await api.put(`/droplets/${dropletId}/reassign`, { user_id: newUserId })
    return response.data
  },

  // System Analytics (Admin view)
  async getSystemAnalytics(days = 30): Promise<any> {
    const response = await api.get(`/analytics/system?days=${days}`)
    return response.data
  },

  async getCostAnalytics(days = 30): Promise<any> {
    const response = await api.get(`/analytics/costs?days=${days}`)
    return response.data
  },

  // DigitalOcean Token Management
  async getDigitalOceanTokens(): Promise<any> {
    const response = await api.get('/admin/tokens')
    return response.data
  },

  async addDigitalOceanToken(tokenData: { name: string; token: string }): Promise<any> {
    const response = await api.post('/admin/tokens', tokenData)
    return response.data
  },

  async deleteDigitalOceanToken(tokenId: string): Promise<any> {
    const response = await api.delete(`/admin/tokens/${tokenId}`)
    return response.data
  },

  async testDigitalOceanToken(tokenId: string): Promise<any> {
    const response = await api.post(`/admin/tokens/${tokenId}/test`)
    return response.data
  },

  async updateDigitalOceanToken(tokenId: string, data: { name?: string; is_active?: boolean }): Promise<any> {
    const response = await api.put(`/admin/tokens/${tokenId}`, data)
    return response.data
  },

  // System Health Monitoring
  async getSystemHealth(): Promise<any> {
    const response = await api.get('/admin/system/health')
    return response.data
  },

  // System Analytics (Comprehensive)
  async getSystemAnalytics(): Promise<any> {
    const response = await api.get('/admin/analytics')
    return response.data
  }
}

export default adminApi
