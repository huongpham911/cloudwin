import { tokenService } from './tokenService'

export interface UsageStats {
  total_droplets: number
  active_droplets: number
  building_droplets: number
  total_cost_today: number
  total_cost_month: number
  avg_build_time: number
  total_accounts?: number
  user_info?: {
    user_id: string
    email: string
    username: string
    full_name: string
    provider: string
  }
  timestamp?: string
}

export interface AnalyticsOverview {
  overview: {
    total_droplets: number
    active_droplets: number
    total_cost: string
    monthly_cost: string
    uptime_percentage: number
    total_accounts: number
  }
  account_breakdown: {
    account_id: number
    token: string
    total_droplets: number
    active_droplets: number
  }[]
  regional_distribution: {
    region: string
    count: number
    percentage: number
  }[]
  size_distribution: {
    size: string
    count: number
    cost: string
  }[]
  usage_trends: {
    date: string
    droplets_count: number
    cost: string
  }[]
}

export interface CostBreakdown {
  date: string
  cost: number
  droplet_count: number
}

export interface RegionUsage {
  region: string
  count: number
  cost: number
}

export interface BuildMetrics {
  date: string
  successful_builds: number
  failed_builds: number
  avg_build_time: number
}

export const analyticsApi = {
  // Get dashboard analytics (Updated to match backend)
  getDashboard: (days: number = 30) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/dashboard?days=${days}`
    }),
  
  // Get cost analytics (Updated to match backend)
  getCosts: (days: number = 30) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/costs?days=${days}`
    }),
  
  // Get performance analytics (Updated to match backend)
  getPerformance: (days: number = 7) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/performance?days=${days}`
    }),

  // Legacy endpoints (keeping for compatibility)
  getUsageStats: (user_id?: string) => {
    const params = user_id ? `?user_id=${user_id}` : ''
    return tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/usage-stats${params}`
    })
  },
  getOverview: (timeRange: string = '7d') => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/overview?timeRange=${timeRange}`
    }),
  getCostBreakdown: (days: number = 30) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/costs?days=${days}`
    }),
  getRegionUsage: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/analytics/regions'
  }),
  getBuildMetrics: (days: number = 30) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/analytics/builds?days=${days}`
    })
}