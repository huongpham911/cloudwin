import React, { useState } from 'react';
import { ArrowsPointingOutIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Size {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number | null;
  price_hourly: number | null;
  regions: string[];
  available: boolean;
}

interface ResizeManagerProps {
  dropletId: string;
  dropletName?: string;
  currentSize?: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
    price_monthly: number;
  };
  onResizeCompleted?: () => void;
  isDark?: boolean;
}

const ResizeManager: React.FC<ResizeManagerProps> = ({ 
  dropletId, 
  dropletName,
  currentSize,
  onResizeCompleted,
  isDark = false
}) => {
  const [selectedSize, setSelectedSize] = useState('');
  const [diskResize, setDiskResize] = useState(false);
  const [activeTab, setActiveTab] = useState('Basic');
  const queryClient = useQueryClient();

  // Fetch available sizes
  const { data: sizesData, isLoading: sizesLoading } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => api.get('/api/v1/sizes'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Resize mutation
  const resizeMutation = useMutation({
    mutationFn: ({ dropletId, newSize, disk }: { dropletId: string, newSize: string, disk: boolean }) => {
      return api.post(`/api/v1/droplets/${dropletId}/resize`, {
        size: newSize,
        disk: disk
      });
    },
    onSuccess: () => {
      toast.success('VPS resize đang được thực hiện...');
      queryClient.invalidateQueries({ queryKey: ['droplet-detail', dropletId] });
      setSelectedSize('');
      setDiskResize(false);
      if (onResizeCompleted) {
        onResizeCompleted();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Lỗi khi resize VPS');
    }
  });

  const handleResize = () => {
    if (!selectedSize) {
      toast.error('Vui lòng chọn size mới');
      return;
    }

    if (diskResize) {
      const confirmMessage = `Bạn có chắc chắn muốn resize VPS "${dropletName}" với disk resize?\n\nLưu ý: Disk resize là thay đổi vĩnh viễn và không thể hoàn tác. VPS sẽ bị tắt trong quá trình resize.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    resizeMutation.mutate({ 
      dropletId, 
      newSize: selectedSize, 
      disk: diskResize 
    });
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || isNaN(price)) {
      return '$0.00';
    }
    return `$${Number(price).toFixed(2)}`;
  };

  const formatMemory = (memory: number) => {
    if (memory >= 1024) {
      return `${(memory / 1024).toFixed(0)} GB`;
    }
    return `${memory} MB`;
  };

  const getCpuType = (slug: string) => {
    if (slug.includes('premium-amd')) return 'Premium AMD';
    if (slug.includes('premium-intel')) return 'Premium Intel';
    if (slug.includes('c-')) return 'CPU-Optimized';
    if (slug.includes('m-')) return 'Memory-Optimized';
    if (slug.includes('g-')) return 'General Purpose';
    return 'Regular';
  };

  const getMachineType = (slug: string) => {
    if (slug.includes('c-')) return 'CPU-Optimized';
    if (slug.includes('m-')) return 'Memory-Optimized'; 
    if (slug.includes('g-')) return 'General Purpose';
    return 'Basic';
  };

  const groupSizesByType = (sizes: Size[]) => {
    const grouped: { [key: string]: Size[] } = {};
    sizes?.forEach((size: Size) => {
      const type = getMachineType(size.slug);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(size);
    });
    return grouped;
  };

  const groupedSizes = groupSizesByType(sizesData?.data?.sizes || []);
  const tabs = Object.keys(groupedSizes);

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ArrowsPointingOutIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Resize Droplet</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Scale resources for {dropletName || `Droplet ${dropletId}`}
            </p>
          </div>
        </div>
      </div>

      {/* Current Size Info */}
      {currentSize && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 border-blue-400 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'} mb-2`}>
            Currently using: {currentSize.slug}
          </p>
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            {formatMemory(currentSize.memory)} RAM • {currentSize.vcpus} vCPUs • {currentSize.disk} GB SSD
          </p>
        </div>
      )}

      {/* Resize Type Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              !diskResize 
                ? isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setDiskResize(false)}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={!diskResize}
                onChange={() => setDiskResize(false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <h4 className={`ml-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                CPU and RAM only
              </h4>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-7`}>
              This will only increase or decrease the CPU and RAM of your Droplet, not disk size. This can be reversed.
            </p>
          </div>

          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              diskResize 
                ? isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setDiskResize(true)}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={diskResize}
                onChange={() => setDiskResize(true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <h4 className={`ml-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Disk, CPU and RAM
              </h4>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-7`}>
              This will increase the disk size, CPU and RAM of your Droplet. This is a permanent change and cannot be reversed.
            </p>
          </div>
        </div>
      </div>

      {/* Size Tabs */}
      {tabs.length > 0 && (
        <div className="mb-6">
          <div className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? isDark
                        ? 'border-blue-400 text-blue-400'
                        : 'border-blue-500 text-blue-600'
                      : isDark
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Sizes Table */}
      {sizesLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tabs.length === 0 ? (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
          <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No sizes available. Please check your connection and try again.
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <div className="overflow-x-auto">
            <div 
              className="max-h-64 overflow-y-auto border rounded-lg"
              style={{
                scrollbarWidth: 'auto',
                scrollbarColor: isDark ? '#3B82F6 #374151' : '#3B82F6 #E5E7EB'
              }}
            >
              <style dangerouslySetInnerHTML={{
                __html: `
                  .max-h-64::-webkit-scrollbar {
                    width: 12px;
                  }
                  .max-h-64::-webkit-scrollbar-track {
                    background: ${isDark ? '#374151' : '#E5E7EB'};
                    border-radius: 6px;
                  }
                  .max-h-64::-webkit-scrollbar-thumb {
                    background: #3B82F6;
                    border-radius: 6px;
                    border: 2px solid ${isDark ? '#374151' : '#E5E7EB'};
                  }
                  .max-h-64::-webkit-scrollbar-thumb:hover {
                    background: #2563EB;
                  }
                `
              }} />
              <table className="min-w-full">
                <thead className={`sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-white'} z-10`}>
                  <tr className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Machine Type
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      CPU Type
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      vCPUs
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Memory
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      SSD
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Transfer
                    </th>
                    <th className={`text-right py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(groupedSizes[activeTab] || []).map((size: Size) => {
                    const isCurrentSize = size.slug === currentSize?.slug;
                    const cpuType = getCpuType(size.slug);
                    
                    return (
                      <tr
                        key={size.slug}
                        onClick={() => !isCurrentSize && setSelectedSize(size.slug)}
                        className={`border-b cursor-pointer transition-colors ${
                          isDark ? 'border-gray-700' : 'border-gray-100'
                        } ${
                          selectedSize === size.slug
                            ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                            : isCurrentSize
                              ? isDark ? 'bg-gray-700 opacity-50' : 'bg-gray-50 opacity-50'
                              : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        } ${isCurrentSize ? 'cursor-not-allowed' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="size"
                              value={size.slug}
                              checked={selectedSize === size.slug}
                              disabled={isCurrentSize}
                              onChange={() => setSelectedSize(size.slug)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                            />
                            <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {activeTab}
                              {isCurrentSize && ' (current)'}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {cpuType}
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {size.vcpus} vCPU{size.vcpus > 1 ? 's' : ''}
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatMemory(size.memory)}
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {size.disk} GB
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {size.transfer} TB
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatPrice(size.price_monthly)}/mo
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatPrice(size.price_hourly)}/hr
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Scroll indicator */}
            {(groupedSizes[activeTab] || []).length > 3 && (
              <div className={`mt-2 text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                ↕️ Scroll to see more options ({(groupedSizes[activeTab] || []).length} total)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning for disk resize */}
      {diskResize && selectedSize && (
        <div className={`mb-6 p-4 rounded-md border-l-4 border-yellow-400 ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
          <div className="flex">
            <ExclamationTriangleIcon className={`h-5 w-5 ${isDark ? 'text-yellow-300' : 'text-yellow-600'} mr-3 flex-shrink-0`} />
            <div className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <p className="font-medium">Warning: Disk resize is permanent</p>
              <p className="mt-1">This action cannot be undone and will require shutting down your droplet during the resize process.</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleResize}
          disabled={!selectedSize || resizeMutation.isPending}
          className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isDark ? 'focus:ring-offset-gray-800' : ''
          }`}
        >
          {resizeMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Resizing...</span>
            </div>
          ) : (
            `Resize`
          )}
        </button>
      </div>
    </div>
  );
};

export default ResizeManager;
