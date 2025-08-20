import React, { useState } from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Image {
  id: number;
  name: string;
  distribution: string;
  slug: string;
  public: boolean;
  regions: string[];
  type: string;
  status: string;
  created_at: string;
  description?: string;
}

interface RebuildManagerProps {
  dropletId: string;
  dropletName?: string;
  currentImage?: {
    id: number;
    name: string;
    distribution: string;
    slug: string;
  };
  onRebuildCompleted?: () => void;
  isDark?: boolean;
}

const RebuildManager: React.FC<RebuildManagerProps> = ({ 
  dropletId, 
  dropletName,
  currentImage,
  onRebuildCompleted,
  isDark = false
}) => {
  const [selectedImage, setSelectedImage] = useState('');
  const [activeTab, setActiveTab] = useState('Marketplace');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch available images
  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['images'],
    queryFn: () => api.get('/api/v1/images'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch marketplace images (one-click apps) from new endpoint with comprehensive data
  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery({
    queryKey: ['marketplace-images'],
    queryFn: () => api.get('/api/v1/images/marketplace'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: ({ dropletId, image }: { dropletId: string, image: string }) => {
      return api.post(`/api/v1/droplets/${dropletId}/rebuild`, {
        image: image
      });
    },
    onSuccess: () => {
      toast.success('VPS đang được rebuild...');
      queryClient.invalidateQueries({ queryKey: ['droplet-detail', dropletId] });
      setSelectedImage('');
      if (onRebuildCompleted) {
        onRebuildCompleted();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Lỗi khi rebuild VPS');
    }
  });

  const handleRebuild = () => {
    if (!selectedImage) {
      toast.error('Vui lòng chọn hệ điều hành');
      return;
    }

    const confirmMessage = `Bạn có chắc chắn muốn rebuild VPS "${dropletName}"?\n\n⚠️ Điều này sẽ xóa TOÀN BỘ dữ liệu hiện tại và cài đặt lại hệ điều hành. Hãy backup dữ liệu trước khi tiến hành!`;
    if (!confirm(confirmMessage)) {
      return;
    }

    rebuildMutation.mutate({ 
      dropletId, 
      image: selectedImage
    });
  };

  const getImagesByDistribution = (images: Image[]) => {
    const grouped: { [key: string]: Image[] } = {};
    images?.forEach((image: Image) => {
      const dist = image.distribution || 'Other';
      if (!grouped[dist]) {
        grouped[dist] = [];
      }
      grouped[dist].push(image);
    });
    return grouped;
  };

  const getMarketplaceImages = (images: Image[]) => {
    // Return marketplace applications from comprehensive backend data
    return images || [];
  };

  const groupedImages = getImagesByDistribution(imagesData?.data?.images || []);
  const marketplaceImages = getMarketplaceImages(marketplaceData?.data || []);
  
  // Filter marketplace images based on search term
  const filteredMarketplaceImages = marketplaceImages.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Add Marketplace tab to the beginning
  const distributionTabs = Object.keys(groupedImages).sort();
  const tabs = ['Marketplace', ...distributionTabs];

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ArrowPathIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rebuild Droplet</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Reinstall operating system for {dropletName || `Droplet ${dropletId}`}
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className={`mb-6 p-4 rounded-md border-l-4 border-red-400 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
        <div className="flex">
          <ExclamationTriangleIcon className={`h-5 w-5 ${isDark ? 'text-red-300' : 'text-red-600'} mr-3 flex-shrink-0`} />
          <div className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
            <p className="font-medium">⚠️ Data Loss Warning</p>
            <p className="mt-1">Rebuild will completely wipe all data and reinstall the operating system. CPU, RAM, and disk configuration will remain the same.</p>
          </div>
        </div>
      </div>

      {/* Current Image Info */}
      {currentImage && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 border-blue-400 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'} mb-2`}>
            Currently running: {currentImage.name}
          </p>
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            {currentImage.distribution} • {currentImage.slug}
          </p>
        </div>
      )}

      {/* Distribution Tabs */}
      {tabs.length > 0 && (
        <div className="mb-6">
          <div className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab
                      ? isDark
                        ? 'border-blue-400 text-blue-400'
                        : 'border-blue-500 text-blue-600'
                      : isDark
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'Marketplace' ? '🛒 Marketplace' : tab}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Marketplace Info */}
          {activeTab === 'Marketplace' && (
            <div className="mt-4 space-y-4">
              <div className={`p-3 rounded-md border-l-4 border-purple-400 ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                  💡 <strong>One-Click Applications:</strong> Pre-configured software stacks ready to use immediately after rebuild. Includes WordPress, Docker, cPanel, LAMP stack, and more.
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search applications (WordPress, Docker, Laravel...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {searchTerm && (
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {filteredMarketplaceImages.length} application(s) found for "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Images Table */}
      {(imagesLoading || marketplaceLoading) ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tabs.length === 0 || (activeTab === 'Marketplace' && filteredMarketplaceImages.length === 0 && searchTerm) ? (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
          <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchTerm 
              ? `No applications found for "${searchTerm}". Try searching for WordPress, Docker, or Laravel.`
              : 'No images available. Please check your connection and try again.'
            }
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
                      {activeTab === 'Marketplace' ? 'Application' : 'Operating System'}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {activeTab === 'Marketplace' ? 'Description' : 'Version'}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Type
                    </th>
                    <th className={`text-left py-3 px-4 font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'Marketplace' ? filteredMarketplaceImages : (groupedImages[activeTab] || [])).map((image: Image) => {
                    const isCurrentImage = image.id === currentImage?.id;
                    
                    return (
                      <tr
                        key={image.id}
                        onClick={() => !isCurrentImage && setSelectedImage(image.slug)}
                        className={`border-b cursor-pointer transition-colors ${
                          isDark ? 'border-gray-700' : 'border-gray-100'
                        } ${
                          selectedImage === image.slug
                            ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                            : isCurrentImage
                              ? isDark ? 'bg-gray-700 opacity-50' : 'bg-gray-50 opacity-50'
                              : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        } ${isCurrentImage ? 'cursor-not-allowed' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="image"
                              value={image.slug}
                              checked={selectedImage === image.slug}
                              disabled={isCurrentImage}
                              onChange={() => setSelectedImage(image.slug)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                            />
                            <div>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {image.name}
                                {isCurrentImage && ' (current)'}
                              </span>
                              {activeTab === 'Marketplace' && image.description && (
                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                  {image.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {activeTab === 'Marketplace' ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                            }`}>
                              One-Click App
                            </span>
                          ) : (
                            image.slug
                          )}
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            image.public 
                              ? isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {activeTab === 'Marketplace' ? 'Application' : (image.public ? 'Public' : 'Private')}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            image.status === 'available'
                              ? isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                              : isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {image.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Scroll indicator */}
            {((activeTab === 'Marketplace' ? filteredMarketplaceImages : (groupedImages[activeTab] || [])).length > 3) && (
              <div className={`mt-2 text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                ↕️ Scroll to see more options ({(activeTab === 'Marketplace' ? filteredMarketplaceImages : (groupedImages[activeTab] || [])).length} total)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final Warning */}
      {selectedImage && (
        <div className={`mb-6 p-4 rounded-md border-l-4 border-yellow-400 ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
          <div className="flex">
            <ExclamationTriangleIcon className={`h-5 w-5 ${isDark ? 'text-yellow-300' : 'text-yellow-600'} mr-3 flex-shrink-0`} />
            <div className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <p className="font-medium">Final Confirmation Required</p>
              <p className="mt-1">This will permanently delete all data and rebuild with: <strong>{selectedImage}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRebuild}
          disabled={!selectedImage || rebuildMutation.isPending}
          className={`px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isDark ? 'focus:ring-offset-gray-800' : ''
          }`}
        >
          {rebuildMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Rebuilding...</span>
            </div>
          ) : (
            `⚠️ Rebuild Droplet`
          )}
        </button>
      </div>
    </div>
  );
};

export default RebuildManager;
