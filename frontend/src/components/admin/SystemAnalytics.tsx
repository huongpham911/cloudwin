import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ServerIcon,
  UsersIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ComputerDesktopIcon,
  CloudIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { adminApi } from '../../services/adminApi';
import { analyticsApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

interface SystemStats {
  users: {
    total: number;
    active: number;
    new_today: number;
    growth_rate: number;
  };
  droplets: {
    total: number;
    running: number;
    stopped: number;
    regions: Record<string, number>;
  };
  buckets: {
    total: number;
    regions: number;
    with_cdn: number;
    cdn_adoption_rate: number;
  };
  usage: {
    total_cost: number;
    monthly_cost: number;
    cpu_hours: number;
    storage_gb: number;
  };
  performance: {
    avg_response_time: number;
    uptime_percentage: number;
    api_calls_today: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

const SystemAnalytics: React.FC = () => {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);

  // Fetch comprehensive analytics data
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['admin-analytics-comprehensive'],
    queryFn: adminApi.getSystemAnalytics,
    refetchInterval: refreshInterval,
  });

  // Legacy system stats (kept for compatibility)
  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: adminApi.getSystemStats,
    refetchInterval: refreshInterval,
  });

  // Fetch bucket data directly
  const { data: bucketsData, isLoading: bucketsLoading } = useQuery({
    queryKey: ['spaces-buckets-analytics'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/v1/spaces/buckets/');
      if (!response.ok) throw new Error('Failed to fetch buckets');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchAnalytics]);

  // Extract data from analytics response
  const overview = analyticsData?.overview || {};
  const detailedData = analyticsData?.detailed_data || {};
  
  // Process bucket data
  const totalBuckets = bucketsData?.buckets?.length || 0;
  const bucketRegions = new Set(bucketsData?.buckets?.map((b: any) => b.region) || []).size;
  const bucketsWithCdn = 0; // This would need CDN status check for each bucket
  const cdnAdoptionRate = totalBuckets > 0 ? Math.round((bucketsWithCdn / totalBuckets) * 100) : 0;
  
  const stats: SystemStats = {
    users: {
      total: overview.users?.total || 0,
      active: overview.users?.active || 0,
      new_today: overview.users?.recent_registrations || 0,
      growth_rate: 0 // Can be calculated if needed
    },
    droplets: {
      total: overview.droplets?.total || 0,
      running: overview.droplets?.running || 0,
      stopped: overview.droplets?.stopped || 0,
      regions: overview.droplets?.by_region || {}
    },
    buckets: {
      total: totalBuckets,
      regions: bucketRegions,
      with_cdn: bucketsWithCdn,
      cdn_adoption_rate: cdnAdoptionRate
    },
    usage: {
      total_cost: overview.costs?.estimated_monthly || 0,
      monthly_cost: overview.costs?.estimated_monthly || 0,
      cpu_hours: 0,
      storage_gb: 0
    },
    performance: {
      avg_response_time: overview.system?.api_response_time || 0,
      uptime_percentage: overview.system?.uptime_percentage || 0,
      api_calls_today: overview.system?.total_api_calls_today || 0
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: number;
    color?: string;
    subtitle?: string;
    isDark?: boolean;
  }> = ({ title, value, icon: Icon, trend, color = 'blue', subtitle, isDark }) => {
    const colorClasses = {
      blue: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600',
      green: isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600',
      yellow: isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
      purple: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600',
    };

    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {title}
            </p>
            <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-4 flex items-center">
            <ArrowTrendingUpIcon 
              className={`h-4 w-4 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} 
            />
            <span className={`text-sm ml-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              vs tháng trước
            </span>
          </div>
        )}
      </div>
    );
  };

  const RegionChart: React.FC<{ regions?: Record<string, number>; isDark?: boolean }> = ({ regions = {}, isDark }) => {
    const total = Object.values(regions || {}).reduce((sum, count) => sum + count, 0);
    
    // Color scheme for regions
    const regionColors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-gray-500'
    ];
    
    const regionEntries = Object.entries(regions || {});
    
    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🗺️ Phân bố theo Region
          </h3>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {total} VPS total
          </span>
        </div>
        
        {regionEntries.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <GlobeAltIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có droplets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regionEntries.map(([region, count], index) => {
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colorClass = regionColors[index % regionColors.length];
              
              return (
                <div key={region} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${colorClass} rounded-full mr-3`}></div>
                      <span className={`text-sm font-medium leading-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {region.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-semibold leading-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {count} VPS
                      </span>
                      <span className={`text-xs leading-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className={`w-full h-5 rounded-full flex items-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-2 rounded-full ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const DropletSizeChart: React.FC<{ sizes?: Record<string, number>; isDark?: boolean }> = ({ sizes = {}, isDark }) => {
    const total = Object.values(sizes || {}).reduce((sum, count) => sum + count, 0);
    
    // Color scheme for sizes
    const sizeColors = [
      'bg-emerald-500',
      'bg-cyan-500', 
      'bg-orange-500',
      'bg-rose-500',
      'bg-violet-500',
      'bg-amber-500',
      'bg-teal-500',
      'bg-slate-500'
    ];
    
    const sizeEntries = Object.entries(sizes || {});
    
    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📊 Phân bố theo Size
          </h3>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {total} VPS total
          </span>
        </div>
        
        {sizeEntries.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có droplets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sizeEntries.map(([size, count], index) => {
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colorClass = sizeColors[index % sizeColors.length];
              
              return (
                <div key={size} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${colorClass} rounded-full mr-3`}></div>
                      <span className={`text-sm font-medium leading-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {size}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-semibold leading-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {count} VPS
                      </span>
                      <span className={`text-xs leading-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className={`w-full h-5 rounded-full flex items-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-2 rounded-full ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const UsageChart: React.FC<{ timeRange: string; isDark?: boolean }> = ({ timeRange, isDark }) => (
    <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Xu hướng sử dụng
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          className={`text-sm border rounded-md px-3 py-1 ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="90d">90 ngày</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className={`text-center p-4 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.usage?.cpu_hours?.toLocaleString() || '0'}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            CPU Hours
          </p>
        </div>
        <div className={`text-center p-4 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <p className="text-2xl font-bold text-green-600">
            {stats?.usage?.storage_gb?.toLocaleString() || '0'} GB
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Storage Used
          </p>
        </div>
      </div>
    </div>
  );

  const PerformanceMetrics: React.FC<{ isDark?: boolean }> = ({ isDark }) => (
    <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Performance Metrics
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-sm leading-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Uptime
          </span>
          <div className="flex items-center">
            <div className={`w-32 rounded-full h-5 mr-3 flex items-center ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats?.performance?.uptime_percentage || 0}%` }}
              ></div>
            </div>
            <span className={`text-sm font-medium leading-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {(stats?.performance?.uptime_percentage || 0).toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Avg Response Time
          </span>
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats?.performance?.avg_response_time || 0}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            API Calls Today
          </span>
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats?.performance?.api_calls_today?.toLocaleString() || '0'}
          </span>
        </div>
      </div>
    </div>
  );

  const RefreshControl: React.FC = () => {
    const { isDark } = useTheme();
    
    return (
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <ClockIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Auto-refresh:
          </span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={`text-sm border rounded-md px-3 py-1 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1 phút</option>
            <option value={0}>Tắt</option>
          </select>
        </div>
        
        <button
          onClick={() => refetchStats()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Now
        </button>
      </div>
    );
  };

  if (statsLoading || analyticsLoading || bucketsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            System Analytics
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Phân tích toàn diện hệ thống WinCloud
          </p>
        </div>
      </div>

      <RefreshControl />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Tổng Users"
          value={stats?.users?.total?.toLocaleString() || '0'}
          icon={UsersIcon}
          trend={stats?.users?.growth_rate || 0}
          color="blue"
          isDark={isDark}
          subtitle={`${stats?.users?.active || 0} đang hoạt động`}
        />
        <StatCard
          title="Tổng VPS"
          value={stats?.droplets?.total?.toLocaleString() || '0'}
          icon={ServerIcon}
          color="green"
          isDark={isDark}
          subtitle={`${stats?.droplets?.running || 0} đang chạy`}
        />
        <StatCard
          title="Tổng Buckets"
          value={stats?.buckets?.total?.toLocaleString() || '0'}
          icon={CloudIcon}
          color="blue"
          isDark={isDark}
          subtitle={`${stats?.buckets?.regions || 0} regions`}
        />
        <StatCard
          title="Bucket CDN"
          value={stats?.buckets?.with_cdn?.toLocaleString() || '0'}
          icon={FolderIcon}
          color="green"
          isDark={isDark}
          subtitle={`${stats?.buckets?.cdn_adoption_rate || 0}% adoption`}
        />
        <StatCard
          title="Chi phí tháng"
          value={`$${stats?.usage?.monthly_cost?.toLocaleString() || '0'}`}
          icon={CurrencyDollarIcon}
          color="yellow"
          isDark={isDark}
          subtitle={`Tổng: $${stats?.usage?.total_cost?.toLocaleString() || '0'}`}
        />
        <StatCard
          title="API Calls hôm nay"
          value={stats?.performance?.api_calls_today?.toLocaleString() || '0'}
          icon={ComputerDesktopIcon}
          color="purple"
          isDark={isDark}
          subtitle={`${stats?.performance?.avg_response_time || 0}ms avg`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RegionChart regions={overview.droplets?.by_region || {}} isDark={isDark} />
        <DropletSizeChart sizes={overview.droplets?.by_size || {}} isDark={isDark} />
        <UsageChart timeRange={timeRange} isDark={isDark} />
      </div>

      {/* Performance and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceMetrics isDark={isDark} />
        
        {/* User Growth */}
        <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            User Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Users mới hôm nay
              </span>
              <span className="text-sm font-medium text-green-600">
                +{stats?.users?.new_today || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Users đang hoạt động
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats?.users?.active || 0}/{stats?.users?.total || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Tỷ lệ hoạt động
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {(stats?.users?.total || 0) > 0 ? (((stats?.users?.active || 0) / (stats?.users?.total || 1)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* VPS Status */}
        <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            VPS Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Running
                </span>
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats?.droplets?.running || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Stopped
                </span>
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats?.droplets?.stopped || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Total
                </span>
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats?.droplets?.total || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Summary */}
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          System Health Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {(stats?.performance?.uptime_percentage || 0).toFixed(1)}%
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              System Uptime
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats?.performance?.avg_response_time || 0}ms
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Avg Response Time
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {Object.keys(stats?.droplets?.regions || {}).length}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Active Regions
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Details */}
        <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chi tiết Users ({overview.users?.total || 0})
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Total Users
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {overview.users?.total || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Active Users
              </span>
              <span className="text-sm font-medium text-green-600">
                {overview.users?.active || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Admin Users
              </span>
              <span className="text-sm font-medium text-blue-600">
                {overview.users?.admins || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Verified Users
              </span>
              <span className="text-sm font-medium text-purple-600">
                {overview.users?.verified || 0}
              </span>
            </div>
          </div>
          
          {/* Recent Users */}
          {detailedData.users && detailedData.users.length > 0 && (
            <div className="mt-6">
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Recent Users
              </h4>
              <div className="space-y-2">
                {detailedData.users.slice(0, 5).map((user: any, index: number) => (
                  <div key={user.id} className={`p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {user.full_name}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.email}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          user.is_admin 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tokens Details */}
        <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chi tiết DigitalOcean Tokens ({overview.tokens?.total || 0})
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Total Tokens
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {overview.tokens?.total || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Active Tokens
              </span>
              <span className="text-sm font-medium text-green-600">
                {overview.tokens?.active || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Inactive Tokens
              </span>
              <span className="text-sm font-medium text-red-600">
                {overview.tokens?.inactive || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Connected Accounts
              </span>
              <span className="text-sm font-medium text-blue-600">
                {overview.tokens?.total_accounts || 0}
              </span>
            </div>
          </div>

          {/* Token List */}
          {detailedData.tokens && detailedData.tokens.length > 0 && (
            <div className="mt-6">
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Token Status
              </h4>
              <div className="space-y-2">
                {detailedData.tokens.map((token: any, index: number) => (
                  <div key={token.id} className={`p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {token.name}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {token.account_email}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          token.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {token.status}
                        </div>
                        <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {token.droplet_count} droplets
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bucket Analytics */}
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📊 Spaces & Buckets Analytics
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bucket Stats */}
          <div>
            <h4 className={`text-base font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              🗂️ Bucket Overview
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-cyan-500 rounded-full flex items-center justify-center">
                    <CloudIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.buckets?.total || 0}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Buckets
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-teal-500 rounded-full flex items-center justify-center">
                    <GlobeAltIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.buckets?.regions || 0}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Bucket Regions
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <FolderIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.buckets?.with_cdn || 0}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      CDN Enabled
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.buckets?.cdn_adoption_rate || 0}%
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      CDN Adoption
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bucket Details */}
          <div>
            <h4 className={`text-base font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              📈 Bucket Statistics
            </h4>
            
            {bucketsData?.buckets && bucketsData.buckets.length > 0 ? (
              <div className="space-y-4">
                {/* CDN Adoption Progress */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium leading-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      CDN Adoption Rate
                    </span>
                    <span className={`text-sm leading-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stats?.buckets?.cdn_adoption_rate || 0}%
                    </span>
                  </div>
                  <div className={`w-full bg-gray-200 dark:bg-gray-600 rounded-full h-5 flex items-center`}>
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats?.buckets?.cdn_adoption_rate || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h5 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    📋 Quick Stats
                  </h5>
                  <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li className="flex justify-between">
                      <span>Buckets created:</span>
                      <span className="font-medium">{stats?.buckets?.total || 0}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Regions utilized:</span>
                      <span className="font-medium">{stats?.buckets?.regions || 0}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>CDN configurations:</span>
                      <span className="font-medium">{stats?.buckets?.with_cdn || 0}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Avg. buckets per region:</span>
                      <span className="font-medium">
                        {stats?.buckets?.regions > 0 
                          ? Math.round((stats?.buckets?.total || 0) / stats.buckets.regions)
                          : 0
                        }
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Quick Actions */}
                <div className={`p-4 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50/50'}`}>
                  <h5 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    🚀 Quick Actions
                  </h5>
                  <div className="space-y-2">
                    <button 
                      onClick={() => window.open('/admin/spaces', '_blank')}
                      className="w-full text-left px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      📂 Manage Buckets
                    </button>
                    <button 
                      onClick={() => refetchStats()}
                      className="w-full text-left px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      🔄 Refresh Data
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CloudIcon className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  No buckets found
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  Create your first bucket to see analytics
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Analytics */}
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Cost Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              ${(overview.costs?.estimated_monthly || 0).toFixed(2)}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Estimated Monthly
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              ${(overview.costs?.estimated_daily || 0).toFixed(2)}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Estimated Daily
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {overview.droplets?.total || 0}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Total Droplets
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {Object.keys(overview.droplets?.by_region || {}).length}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Regions Used
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
