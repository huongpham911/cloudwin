import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ServerIcon,
  EyeIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CloudIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { dropletsApi } from '../../services/api';
import { adminApi } from '../../services/adminApi';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { tokenService } from '../../services/tokenService';
import { api } from '../../services/api';

interface Droplet {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'pending' | 'archive';
  region: string;
  size: string;
  image: string;
  public_ip: string;
  private_ip: string;
  vcpus: number;
  memory: number;
  disk: number;
  price_monthly: number;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

interface DropletsStats {
  total: number;
  running: number;
  stopped: number;
  pending: number;
  by_region: Record<string, number>;
  by_size: Record<string, number>;
  total_cost: number;
}

const AdminDropletsView: React.FC = () => {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedDroplets, setSelectedDroplets] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  const queryClient = useQueryClient();

  // Safe render helper function to handle potential objects
  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      // If it's an object, try to extract meaningful data
      if (value.slug) return value.slug;
      if (value.name) return value.name;
      // Don't stringify objects - return empty string instead
      return '';
    }
    return String(value);
  };

  // Format region display - simplified
  const formatRegion = (region: any): string => {
    if (!region) return 'Unknown';
    if (typeof region === 'string') return region;
    if (typeof region === 'object') {
      return region.NAME || region.name || region.SLUG || region.slug || 'Unknown';
    }
    return String(region);
  };

  // Safe text render component - never allows objects to be displayed
  const SafeText: React.FC<{ children: any }> = ({ children }) => {
    if (children === null || children === undefined) return <>Unknown</>;
    if (typeof children === 'string' || typeof children === 'number') return <>{children}</>;
    if (typeof children === 'object') {
      // Log error only in development
      if (import.meta.env.DEV) {
        console.error('Attempted to render raw object as text:', children);
      }
      return <>Object Display Error</>;
    }
    return <>{String(children)}</>;
  };

  // Format size display
  const formatSize = (size: any): string => {
    // Defensive check - absolutely no raw objects
    if (size === null || size === undefined) return 'Unknown';
    if (typeof size === 'string') return size;
    if (typeof size === 'object') {
      // Extract meaningful size info from object
      if (size.slug) return size.slug;
      if (size.description) return size.description;
      if (size.name) return size.name;

      // Try to build a meaningful size description
      if (size.disk) {
        return `${size.disk}GB Disk`;
      }

      // Last resort - return a generic description instead of raw object
      return 'Standard';
    }
    return String(size);
  };

  // Auto-load tokens when component mounts (for admin droplets)
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoadingTokens(true)
        
        // Load tokens from backend
        const response = await api.get(`/api/v1/settings/tokens?t=${Date.now()}`)
        
        if (response.data.tokens && response.data.tokens.length > 0) {
          // Transform to frontend format
          const transformedTokens = response.data.tokens.map((token: any, index: number) => ({
            name: `Account ${index + 1}`,
            token: token.token,
            added_at: new Date().toISOString(),
            is_valid: token.status === 'valid'
          }))
          
          // Update token service
          tokenService.setTokens(transformedTokens)
          
          // Trigger backend reload
          try {
            await api.post('/api/v1/settings/tokens/reload')
          } catch (reloadError) {
            // Log warning only in development
            if (import.meta.env.DEV) {
              console.warn('⚠️ Admin: Failed to reload backend clients:', reloadError)
            }
          }
          
          setTokensLoaded(true)
        } else {
          setTokensLoaded(false)
        }
      } catch (error) {
        // Log error only in development
        if (import.meta.env.DEV) {
          console.error('❌ Admin: Failed to auto-load tokens:', error)
        }
        setTokensLoaded(false)
      } finally {
        setIsLoadingTokens(false)
      }
    }

    loadTokens()
  }, [])

  // Check if we have valid tokens
  const hasValidTokens = tokensLoaded && tokenService.hasValidTokens()

  // Fetch all droplets with admin access - only after tokens are loaded
  const { data: dropletsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-droplets', currentPage, statusFilter, regionFilter, userFilter, searchTerm, tokensLoaded],
    queryFn: () => adminApi.getAllDroplets({
      page: currentPage,
      limit: itemsPerPage,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      region: regionFilter !== 'all' ? regionFilter : undefined,
      user_id: userFilter !== 'all' ? userFilter : undefined,
      search: searchTerm || undefined,
    }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: tokensLoaded && hasValidTokens, // Only run when tokens are loaded
  });

  // Fetch droplets statistics - only after tokens are loaded
  const { data: statsData } = useQuery({
    queryKey: ['admin-droplets-stats', tokensLoaded],
    queryFn: adminApi.getDropletsStats,
    refetchInterval: 60000, // Refresh stats every minute
    enabled: tokensLoaded && hasValidTokens,
  });

  // Fetch users for filter
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => adminApi.getUsers({ page: 1, limit: 1000 }),
  });

  // Droplet actions mutations
  const startDropletMutation = useMutation({
    mutationFn: (dropletId: string) => dropletsApi.startDroplet(dropletId),
    onSuccess: () => {
      toast.success('VPS đã được khởi động');
      refetch();
    },
    onError: () => toast.error('Lỗi khởi động VPS'),
  });

  const stopDropletMutation = useMutation({
    mutationFn: (dropletId: string) => dropletsApi.stopDroplet(dropletId),
    onSuccess: () => {
      toast.success('VPS đã được dừng');
      refetch();
    },
    onError: () => toast.error('Lỗi dừng VPS'),
  });

  const deleteDropletMutation = useMutation({
    mutationFn: (dropletId: string) => dropletsApi.deleteDroplet(dropletId),
    onSuccess: () => {
      toast.success('VPS đã được xóa');
      refetch();
    },
    onError: () => toast.error('Lỗi xóa VPS'),
  });

  const bulkActionMutation = useMutation({
    mutationFn: ({ action, dropletIds }: { action: string; dropletIds: string[] }) =>
      adminApi.bulkDropletAction(action, dropletIds),
    onSuccess: (_, { action }) => {
      toast.success(`Bulk ${action} thành công`);
      setSelectedDroplets([]);
      setShowBulkActions(false);
      refetch();
    },
    onError: () => toast.error('Lỗi thực hiện bulk action'),
  });

  const droplets: Droplet[] = dropletsData?.droplets || [];
  const totalPages = Math.ceil((dropletsData?.total || 0) / itemsPerPage);
  const stats: DropletsStats = statsData || {
    total: 0,
    running: 0,
    stopped: 0,
    pending: 0,
    by_region: {},
    by_size: {},
    total_cost: 0
  };

  const handleSelectDroplet = (dropletId: string) => {
    setSelectedDroplets(prev => 
      prev.includes(dropletId)
        ? prev.filter(id => id !== dropletId)
        : [...prev, dropletId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDroplets.length === droplets.length) {
      setSelectedDroplets([]);
    } else {
      setSelectedDroplets(droplets.map(d => d.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return isDark ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-100';
      case 'stopped':
        return isDark ? 'text-red-400 bg-red-900/30' : 'text-red-600 bg-red-100';
      case 'pending':
        return isDark ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-600 bg-yellow-100';
      default:
        return isDark ? 'text-gray-400 bg-gray-700' : 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatsCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }> = ({ title, value, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600',
      green: isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600',
      yellow: isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
      purple: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600',
      red: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600',
    };

    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-full mr-4 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{title}</p>
            <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          </div>
        </div>
      </div>
    );
  };

  const BulkActions: React.FC = () => (
    <div className={`border rounded-lg p-4 mb-4 ${
      isDark 
        ? 'bg-blue-900/20 border-blue-600' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            Đã chọn {selectedDroplets.length} VPS
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => bulkActionMutation.mutate({ action: 'start', dropletIds: selectedDroplets })}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start All
          </button>
          <button
            onClick={() => bulkActionMutation.mutate({ action: 'stop', dropletIds: selectedDroplets })}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Stop All
          </button>
          <button
            onClick={() => bulkActionMutation.mutate({ action: 'delete', dropletIds: selectedDroplets })}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete All
          </button>
          <button
            onClick={() => {
              setSelectedDroplets([]);
              setShowBulkActions(false);
            }}
            className={`px-3 py-1 text-sm rounded ${
              isDark 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setShowBulkActions(selectedDroplets.length > 0);
  }, [selectedDroplets]);

  // Show loading state while checking tokens
  if (isLoadingTokens) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Đang tải cấu hình tokens...</p>
        </div>
      </div>
    );
  }

  // Show token message if no valid tokens
  if (!hasValidTokens) {
    return (
      <div className="text-center py-8">
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <ServerIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Chưa có DigitalOcean API Tokens
          </h3>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Admin cần cấu hình DigitalOcean API token để quản lý VPS. Vào Settings để thêm token.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đi tới Settings
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
            Admin Droplets View
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Quản lý tất cả VPS trong hệ thống
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Tổng VPS"
          value={stats?.total?.toLocaleString() || '0'}
          icon={ServerIcon}
          color="blue"
        />
        <StatsCard
          title="Running"
          value={stats?.running?.toLocaleString() || '0'}
          icon={PlayIcon}
          color="green"
        />
        <StatsCard
          title="Stopped"
          value={stats?.stopped?.toLocaleString() || '0'}
          icon={StopIcon}
          color="red"
        />
        <StatsCard
          title="Pending"
          value={stats?.pending?.toLocaleString() || '0'}
          icon={CloudIcon}
          color="yellow"
        />
        <StatsCard
          title="Chi phí/tháng"
          value={`$${stats?.total_cost?.toLocaleString() || '0'}`}
          icon={CircleStackIcon}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Tìm kiếm
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className={`h-5 w-5 absolute left-3 top-3 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tên VPS, IP, User..."
                className={`pl-10 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="all">Tất cả</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Region
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="all">Tất cả</option>
              {Object.keys(stats.by_region || {}).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="all">Tất cả Users</option>
              {(usersData?.users || []).map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.full_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && <BulkActions />}

      {/* Droplets Table */}
      <div className={`rounded-lg shadow overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDroplets.length === droplets.length && droplets.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  VPS Info
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  User
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Specs
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Location
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Created
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {droplets.map((droplet) => (
                <tr key={droplet.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedDroplets.includes(droplet.id)}
                      onChange={() => handleSelectDroplet(droplet.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {droplet.name}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {droplet.public_ip && (
                          <span className="mr-2">🌐 {droplet.public_ip}</span>
                        )}
                        {droplet.private_ip && (
                          <span>🔒 {droplet.private_ip}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {droplet.user_email}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {droplet.user_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(droplet.status)}`}>
                      {droplet.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <CpuChipIcon className={`h-4 w-4 mr-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <span>{droplet.vcpus} vCPUs</span>
                      </div>
                      <div className="flex items-center">
                        <CircleStackIcon className={`h-4 w-4 mr-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <span>{droplet.memory}MB RAM</span>
                      </div>
                      {droplet.disk && (
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {droplet.disk}GB Disk
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <GlobeAltIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {droplet.region?.NAME || droplet.region?.name || droplet.region?.SLUG || droplet.region?.slug || 'Unknown'}
                      </span>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      ${droplet.price_monthly}/mo
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CalendarIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(droplet.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {/* Handle view details */}}
                        className={`${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      {droplet.status === 'stopped' ? (
                        <button
                          onClick={() => startDropletMutation.mutate(droplet.id)}
                          className={`${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}`}
                          title="Start VPS"
                          disabled={startDropletMutation.isPending}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => stopDropletMutation.mutate(droplet.id)}
                          className={`${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-900'}`}
                          title="Stop VPS"
                          disabled={stopDropletMutation.isPending}
                        >
                          <StopIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xóa VPS này?')) {
                            deleteDropletMutation.mutate(droplet.id);
                          }
                        }}
                        className={`${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                        title="Delete VPS"
                        disabled={deleteDropletMutation.isPending}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '} to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, dropletsData?.total || 0)}
                  </span>
                  {' '} of{' '}
                  <span className="font-medium">{dropletsData?.total || 0}</span>
                  {' '} results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDropletsView;
