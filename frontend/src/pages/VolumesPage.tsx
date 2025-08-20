/**
 * Volumes Page - User-specific volumes management
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  CircleStackIcon, 
  PlusIcon, 
  ServerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { userApi } from '../services/userApi';
import VolumeManager from '../components/volumes/VolumeManager';

const VolumesPage: React.FC = () => {
  const userId = userApi.getCurrentUserId();

  // Fetch user's volumes
  const { data: volumesData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-volumes', userId],
    queryFn: () => userApi.getVolumes(userId),
    enabled: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user's droplets for attach/detach operations
  const { data: dropletsData } = useQuery({
    queryKey: ['user-droplets', userId],
    queryFn: () => userApi.getDroplets(userId),
    enabled: true,
  });

  const volumes = volumesData || [];
  const droplets = dropletsData || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load volumes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Volumes
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your block storage volumes
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <CircleStackIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Volumes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {volumes.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <ServerIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Attached
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {volumes.filter(v => v.droplet_ids && v.droplet_ids.length > 0).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <CircleStackIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Available
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {volumes.filter(v => !v.droplet_ids || v.droplet_ids.length === 0).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <CircleStackIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Storage
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {volumes.reduce((total, v) => total + (v.size_gigabytes || 0), 0)} GB
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Manager */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <VolumeManager 
            dropletId=""
            dropletName=""
            isDark={false}
          />
        </div>
      </div>

      {/* Empty State */}
      {volumes.length === 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <CircleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No volumes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't created any volumes yet. Create your first volume to add extra storage to your droplets.
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard/create-volume"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Volume
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumesPage;
