import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  api_response_time: number;
  database_status: 'connected' | 'disconnected';
  digitalocean_api_status: 'operational' | 'degraded' | 'down';
  active_connections: number;
  memory_usage: number;
  cpu_usage: number;
  disk_usage: number;
  last_updated: string;
}

export default function SystemHealthMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds
    retry: 3,
    retryDelay: 1000
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 60) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-red-800 font-medium">System Health Unavailable</h3>
            <p className="text-red-600 text-sm">Failed to fetch system health data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            System Health Monitor
          </h3>
          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(health?.status || 'unknown')}`}>
            {health?.status || 'Unknown'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
          </label>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {health && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{health.api_response_time}ms</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">API Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{health.active_connections}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active Connections</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${health.database_status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {health.database_status === 'connected' ? 'OK' : 'ERROR'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Database</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                health.digitalocean_api_status === 'operational' ? 'text-green-600' :
                health.digitalocean_api_status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {health.digitalocean_api_status === 'operational' ? 'OK' : 
                 health.digitalocean_api_status === 'degraded' ? 'SLOW' : 'DOWN'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">DigitalOcean API</div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Resource Usage</h4>
            
            {/* CPU Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(health.cpu_usage)}`}
                    style={{ width: `${health.cpu_usage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-10">
                  {health.cpu_usage}%
                </span>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(health.memory_usage)}`}
                    style={{ width: `${health.memory_usage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-10">
                  {health.memory_usage}%
                </span>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Disk Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(health.disk_usage)}`}
                    style={{ width: `${health.disk_usage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-10">
                  {health.disk_usage}%
                </span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {new Date(health.last_updated).toLocaleString()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
