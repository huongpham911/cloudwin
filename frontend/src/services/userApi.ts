/**
 * User-specific API service for WinCloud
 * Handles user-scoped data retrieval for dashboard
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

export interface UserDroplet {
  id: number;
  name: string;
  status: string;
  region: {
    name: string;
    slug: string;
  };
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
  };
  networks: {
    v4: Array<{
      ip_address: string;
      type: string;
    }>;
  };
  created_at: string;
}

export interface UserVolume {
  id: string;
  name: string;
  size_gigabytes: number;
  region: {
    name: string;
    slug: string;
  };
  droplet_ids: number[];
  status: string;
  created_at: string;
}

export interface UserBucket {
  name: string;
  region: string;
  creation_date?: string;
  endpoint?: string;
}

export interface UserToken {
  index: number;
  masked_token: string;
  status: string;
  account_name: string;
  user_id: string;
}

export interface UserDashboardSummary {
  total_droplets: number;
  total_volumes: number;
  total_buckets: number;
  active_tokens: number;
  last_updated: string;
}

export interface UserDashboardData {
  user_id: string;
  droplets: UserDroplet[];
  volumes: UserVolume[];
  buckets: UserBucket[];
  tokens: UserToken[];
  summary: UserDashboardSummary;
}

export interface UserApiResponse<T> {
  data?: T;
  error?: string;
  user_id: string;
}

class UserApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE;
  }

  /**
   * Get all dashboard data for a specific user
   */
  async getDashboard(userId: string): Promise<UserDashboardData> {
    try {
      const response = await axios.get<UserDashboardData>(`${this.baseURL}/users/${userId}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user dashboard:', error);
      throw new Error(`Failed to fetch dashboard for user ${userId}`);
    }
  }

  /**
   * Get droplets for a specific user
   */
  async getDroplets(userId: string): Promise<UserDroplet[]> {
    try {
      const response = await axios.get<{ droplets: UserDroplet[]; user_id: string }>(`${this.baseURL}/users/${userId}/droplets`);
      return response.data.droplets || [];
    } catch (error) {
      console.error('Failed to fetch user droplets:', error);
      throw new Error(`Failed to fetch droplets for user ${userId}`);
    }
  }

  /**
   * Get volumes for a specific user
   */
  async getVolumes(userId: string): Promise<UserVolume[]> {
    try {
      const response = await axios.get<{ volumes: UserVolume[]; user_id: string }>(`${this.baseURL}/users/${userId}/volumes`);
      return response.data.volumes || [];
    } catch (error) {
      console.error('Failed to fetch user volumes:', error);
      throw new Error(`Failed to fetch volumes for user ${userId}`);
    }
  }

  /**
   * Get Spaces buckets for a specific user
   */
  async getBuckets(userId: string): Promise<UserBucket[]> {
    try {
      const response = await axios.get<{ buckets: UserBucket[]; user_id: string }>(`${this.baseURL}/users/${userId}/spaces/buckets`);
      return response.data.buckets || [];
    } catch (error) {
      console.error('Failed to fetch user buckets:', error);
      throw new Error(`Failed to fetch buckets for user ${userId}`);
    }
  }

  /**
   * Get DigitalOcean tokens for a specific user
   */
  async getTokens(userId: string): Promise<UserToken[]> {
    try {
      const response = await axios.get<{ tokens: UserToken[]; user_id: string }>(`${this.baseURL}/users/${userId}/tokens`);
      return response.data.tokens || [];
    } catch (error) {
      console.error('Failed to fetch user tokens:', error);
      throw new Error(`Failed to fetch tokens for user ${userId}`);
    }
  }

  /**
   * Get current user ID from authentication context
   * For now, returns a default user ID
   * In production, this would get from JWT or session
   */
  getCurrentUserId(): string {
    // TODO: Get from auth context/JWT
    return 'user123';
  }
}

// Export singleton instance
export const userApi = new UserApiService();

// Export default
export default userApi;
