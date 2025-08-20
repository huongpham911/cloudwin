import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import {
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ServerIcon,
  CpuChipIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { dropletsApi, api } from '../services/api';
import { sshKeyService } from '../services/sshKeyService';
import { useTokens } from '../hooks/useTokens';
import { UserDataTemplateSelector } from '../components/UserDataTemplateSelector';
import toast from 'react-hot-toast';

interface CreateLinuxVPSForm {
  name: string;
  region: string;
  size: string;
  image: string;
  account_id: number;
  ssh_keys: string[];
  root_password: string;
  backups: boolean;
  ipv6: boolean;
  monitoring: boolean;
  user_data: string;
  tags: string[];
  vpc_uuid?: string;
}

interface Region {
  slug: string;
  name: string;
  available: boolean;
  features: string[];
}

interface Size {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  price_monthly: string;
  price_hourly: string;
  available: boolean;
  description: string;
}

interface Image {
  id: string;
  name: string;
  slug: string;
  distribution: string;
  description: string;
  type?: string;
  public: boolean;
  regions?: string[];
  status?: string;
  error_message?: string;
  min_disk_size?: number;
  size_gigabytes?: number;
  created_at?: string;
  tags?: string[];
  // Icon/logo fields from DO API
  icon?: string;
  logo?: string;
  image_url?: string;
  icon_url?: string;
  logo_url?: string;
}

const CreateVPS: React.FC = () => {
  const { isDark } = useTheme();
  const [showUserData, setShowUserData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [selectedDistribution, setSelectedDistribution] = useState<string>(''); // Track selected OS
  const [activeTab, setActiveTab] = useState<'os' | 'marketplace' | 'custom'>('os'); // Track active tab
  const [marketplaceSearchTerm, setMarketplaceSearchTerm] = useState(''); // Search term for marketplace
  const [authMethod, setAuthMethod] = useState<'ssh' | 'password'>('password'); // Authentication method
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use tokens hook for synchronized token management
  const { tokens: tokenList, loading: tokensLoading, error: tokensError, refreshTokens } = useTokens();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateLinuxVPSForm>({
    defaultValues: {
      name: '',
      region: 'sgp1', // Default to Singapore
      size: 's-1vcpu-1gb', // Default size
      image: 'ubuntu-22-04-x64', // Default to Ubuntu 22.04
      account_id: 0,
      ssh_keys: [],
      root_password: '',
      backups: false,
      ipv6: true,
      monitoring: true,
      user_data: '',
      tags: [],
      vpc_uuid: ''
    }
  });

  // Watch form values
  const selectedRegion = watch('region');
  const selectedSize = watch('size');
  const watchedTags = watch('tags');

  // Fetch regions
  const { data: regionsResponse, isLoading: regionsLoading } = useQuery({
    queryKey: ['droplet-regions'],
    queryFn: dropletsApi.getRegions
  });
  const regions = Array.isArray(regionsResponse?.regions) ? regionsResponse.regions : [];

  // Fetch sizes
  const { data: sizesResponse, isLoading: sizesLoading } = useQuery({
    queryKey: ['droplet-sizes'],
    queryFn: dropletsApi.getSizes
  });
  const sizes = Array.isArray(sizesResponse?.sizes) ? sizesResponse.sizes : [];

  // Fetch images
  const { data: imagesResponse, isLoading: imagesLoading } = useQuery({
    queryKey: ['droplet-images'],
    queryFn: dropletsApi.getImages
  });
  const images = Array.isArray(imagesResponse?.images) ? imagesResponse.images : [];

  // Fetch marketplace images from our enhanced endpoint  
  const { data: marketplaceResponse } = useQuery({
    queryKey: ['marketplace-images'],
    queryFn: () => api.get('/api/v1/images/marketplace'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  const marketplaceImagesFromAPI = Array.isArray(marketplaceResponse?.data) ? marketplaceResponse.data : [];

  // Fetch accounts info from backend - now using useTokens hook
  const { data: accountsResponse, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-info'],
    queryFn: () => api.get('/api/v1/accounts'),
    retry: false
  });

  // Fetch SSH keys
  const { data: sshKeysResponse, isLoading: sshKeysLoading } = useQuery({
    queryKey: ['ssh-keys'],
    queryFn: sshKeyService.getSSHKeys,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const sshKeys = Array.isArray(sshKeysResponse) ? sshKeysResponse : [];

  // Combine tokens from hook and backend response
  const accounts = tokenList.length > 0 ? tokenList : (accountsResponse?.data ? [accountsResponse.data] : []);

  // Auto-select first account when accounts load
  useEffect(() => {
    if (accounts.length > 0) {
      const currentAccountId = watch('account_id');

      // If no account selected or account_id is 0, select first account
      if (currentAccountId === 0 || !currentAccountId) {
        const firstAccount = accounts[0];
        const firstAccountId = firstAccount?.account_id || firstAccount?.id || 1;
        setValue('account_id', firstAccountId);
      }
    }
  }, [accounts, setValue, watch]);

  // Create droplet mutation
  const createMutation = useMutation({
    mutationFn: dropletsApi.create,
    onSuccess: (response) => {
      toast.success('Linux VPS creation started!');

      // Navigate to droplets list or specific droplet page
      const dropletId = response.data?.droplet?.id || response.data?.id;
      if (dropletId) {
        navigate(`/dashboard/droplets/${dropletId}`);
      } else {
        navigate('/dashboard/droplets');
      }
    },
    onError: (error: any) => {
      console.error('❌ VPS creation failed:', error);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to create VPS DO';
      toast.error(errorMessage);
    }
  });

  const onSubmit = (data: CreateLinuxVPSForm) => {
    // Convert account_id to number - handle empty string case  
    const accountIdValue = data.account_id?.toString() || '0';
    const accountId = parseInt(accountIdValue) || 0;

    // Validate account selection - check if account exists in list
    const selectedAccount = accounts.find(acc => (acc.account_id || acc.id) === accountId);
    if (!selectedAccount && accountId === 0) {
      toast.error('Please select an account before creating VPS');
      return;
    }

    // Prepare submit data based on authentication method
    const submitData = {
      ...data,
      account_id: accountId,
      // Clear unused authentication data based on selected method
      ssh_keys: authMethod === 'ssh' ? data.ssh_keys : [],
      root_password: authMethod === 'password' ? data.root_password : ''
    };

    createMutation.mutate(submitData);
  };

  // Helper functions
  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      const newTags = [...watchedTags, tagInput.trim()];
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter(tag => tag !== tagToRemove);
    setValue('tags', newTags);
  };

  // Function to get country flag and formatted name for regions
  const getRegionDisplayInfo = (regionSlug: string, regionName: string) => {
    const slug = regionSlug.toLowerCase();

    // Get country flag based on region - returns country code for flag API
    const getCountryFlag = (regionSlug: string) => {
      if (regionSlug.includes('nyc') || regionSlug.includes('sfo')) return 'us';
      if (regionSlug.includes('lon')) return 'gb';
      if (regionSlug.includes('fra')) return 'de';
      if (regionSlug.includes('ams')) return '��';
      if (regionSlug.includes('sgp')) return 'sg';
      if (regionSlug.includes('blr')) return 'in';
      if (regionSlug.includes('syd')) return 'au';
      if (regionSlug.includes('tor')) return 'ca';
      return 'un'; // Default UN flag for unknown regions
    };

    // Get flag image URL from country code
    const getFlagImageUrl = (countryCode: string) => {
      return `https://flagcdn.com/w40/${countryCode}.png`;
    };

    // Format region name with proper numbering
    const formatRegionName = (name: string, slug: string) => {
      // Extract number from slug if exists
      const match = slug.match(/(\d+)$/);
      const number = match ? match[1] : '';

      // Common region mappings
      const regionMappings = {
        'nyc': 'New York',
        'sfo': 'San Francisco',
        'lon': 'London',
        'fra': 'Frankfurt',
        'ams': 'Amsterdam',
        'sgp': 'Singapore',
        'blr': 'Bangalore',
        'syd': 'Sydney',
        'tor': 'Toronto'
      };

      // Get base region name
      const baseSlug = slug.replace(/\d+$/, '') as keyof typeof regionMappings;
      const mappedName = regionMappings[baseSlug] || name;

      // Add number if exists
      return number ? `${mappedName} ${number}` : mappedName;
    };

    const flag = getCountryFlag(slug);
    const flagUrl = getFlagImageUrl(flag);
    const formattedName = formatRegionName(regionName, slug);
    const datacenterName = `${formattedName} • Datacenter ${slug.match(/(\d+)$/)?.[1] || '1'} • ${slug.toUpperCase()}`;

    return {
      flag,
      flagUrl,
      displayName: `${formattedName}`,
      datacenterName: `${datacenterName}`,
      sortKey: `${slug}_${regionName}`,
      cityName: formattedName
    };
  };

  // Group regions by city for grid display
  const groupedRegions = regions.reduce((acc: any, region: Region) => {
    const info = getRegionDisplayInfo(region.slug, region.name);
    const baseSlug = region.slug.replace(/\d+$/, '');

    if (!acc[baseSlug]) {
      acc[baseSlug] = {
        cityName: info.cityName,
        flag: info.flag,
        regions: []
      };
    }

    acc[baseSlug].regions.push({
      ...region,
      ...info
    });

    return acc;
  }, {});

  const [selectedCity, setSelectedCity] = useState('');

  // Filter data based on region
  const availableSizes = selectedRegion
    ? sizes.filter(size => !size.regions || size.regions.length === 0 || size.regions.includes(selectedRegion))
    : sizes;

  const availableImages = selectedRegion
    ? images.filter(image => !image.regions || image.regions.length === 0 || image.regions.includes(selectedRegion))
    : images; // Show all images when no region selected

  // Group images by distribution for cleaner display
  const groupedImages = availableImages.reduce((acc: any, image: Image) => {
    const dist = image.distribution;
    if (!acc[dist]) {
      acc[dist] = [];
    }
    acc[dist].push(image);
    return acc;
  }, {});

  // Filter to show limited versions for each OS
  const filterVersions = (distribution: string, images: Image[]) => {
    switch (distribution) {
      case 'Ubuntu':
        // Show only LTS and recent stable versions (4 versions max)
        return images
          .filter(img =>
            img.name.includes('22.04 (LTS)') ||
            img.name.includes('24.04 (LTS)') ||
            img.name.includes('24.10') ||
            img.name.includes('25.04')
          )
          .slice(0, 4);

      case 'Debian':
        // Show only latest version (1 version)
        return images
          .filter(img => img.name.includes('12 x64'))
          .slice(0, 1);

      case 'CentOS':
        // Show only latest Stream version (1 version)
        return images
          .filter(img => img.name.includes('9 Stream x64'))
          .slice(0, 1);

      case 'Fedora':
        // Show latest 2 versions
        return images.slice(-2);

      case 'AlmaLinux':
        // Show latest 2 versions
        return images.slice(-2);

      case 'Rocky Linux':
        // Show latest 2 versions  
        return images.slice(-2);

      default:
        return images.slice(0, 3); // Default: show max 3 versions
    }
  };

  // Apply version filtering
  const filteredGroupedImages = Object.keys(groupedImages).reduce((acc: any, dist) => {
    acc[dist] = filterVersions(dist, groupedImages[dist]);
    return acc;
  }, {});

  // Get marketplace images (from our enhanced API endpoint with naming improvements)
  const marketplaceImages = marketplaceImagesFromAPI.length > 0
    ? marketplaceImagesFromAPI
    : availableImages.filter(image => image.type === 'application');

  // Filter marketplace images based on search term
  const filteredMarketplaceImages = marketplaceImages.filter(image => {
    if (!marketplaceSearchTerm) return true;

    const searchTerm = marketplaceSearchTerm.toLowerCase();
    return (
      image.name.toLowerCase().includes(searchTerm) ||
      image.description?.toLowerCase().includes(searchTerm) ||
      image.slug.toLowerCase().includes(searchTerm) ||
      image.distribution?.toLowerCase().includes(searchTerm)
    );
  });

  // Debug logging (reduced for performance)
  // Debug logging disabled for performance
  // Force refresh to get updated icon data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['images'] });
    queryClient.invalidateQueries({ queryKey: ['regions'] });
    queryClient.invalidateQueries({ queryKey: ['sizes'] });
  };

  // Main distributions to show prominently
  const mainDistributions = ['Ubuntu', 'Fedora', 'Debian', 'CentOS', 'AlmaLinux', 'Rocky Linux'];

  // Unified scrollbar styles to avoid conflicts
  const scrollbarStyles = `
    .custom-scrollbar {
      scrollbar-width: auto;
      scrollbar-color: ${isDark ? '#3B82F6 #374151' : '#3B82F6 #E5E7EB'};
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 12px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: ${isDark ? '#374151' : '#F3F4F6'};
      border-radius: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
      border-radius: 6px;
      border: 2px solid ${isDark ? '#374151' : '#F3F4F6'};
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
    }
  `;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Unified scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create VPS DO
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Deploy a new Linux virtual private server
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Account Selection - Now with real-time token sync */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  DigitalOcean Account
                </h3>
                <button
                  type="button"
                  onClick={refreshTokens}
                  disabled={tokensLoading}
                  className={`flex items-center px-3 py-1 text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} disabled:opacity-50`}
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-1 ${tokensLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Select Account (Token from Settings) *
                </label>
                <select
                  {...register('account_id', { required: 'Account selection is required' })}
                  className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  disabled={accountsLoading || tokensLoading}
                >
                  <option value="0">Select an account...</option>
                  {accounts.map((account: any) => (
                    <option key={account.account_id || account.id} value={account.account_id || account.id || 0}>
                      {account.email ? `${account.email} ${account.masked_token ? '(' + account.masked_token + ')' : ''}` : `${account.name} ${account.masked_token ? '(' + account.masked_token + ')' : ''}`}
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.account_id.message}</p>
                )}

                {/* Status indicators */}
                {(accountsLoading || tokensLoading) && (
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <ArrowPathIcon className="inline h-4 w-4 animate-spin mr-1" />
                    Loading...
                  </p>
                )}

                {tokensError && (
                  <p className="mt-1 text-sm text-red-600">
                    ⚠️ {tokensError}
                  </p>
                )}

                {!tokensLoading && !tokensError && tokenList.length === 0 && (
                  <div className={`mt-2 p-3 rounded-md ${isDark ? 'bg-yellow-900/30 border border-yellow-600' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      ⚠️ No tokens configured. Please add DigitalOcean tokens in Settings first.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/settings')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                    >
                      Go to Settings to add tokens →
                    </button>
                  </div>
                )}

                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tokens are configured in Settings and automatically synced. Each account uses a different DigitalOcean API token.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Configuration */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center`}>
                <ServerIcon className="h-5 w-5 mr-2" />
                Basic Configuration
              </h3>

              <div className="space-y-4">
                {/* Hostname */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Hostname / VPS Name *
                  </label>
                  <input
                    {...register('name', {
                      required: 'Hostname is required',
                      minLength: { value: 1, message: 'Name must be at least 1 character' },
                      maxLength: { value: 255, message: 'Name must be less than 255 characters' },
                      pattern: {
                        value: /^[a-z0-9.-]+$/i,
                        message: 'Only letters, numbers, dots and hyphens allowed'
                      }
                    })}
                    type="text"
                    className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="my-linux-server"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    This will be your server hostname and display name
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Region Selection */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Choose Region
              </h3>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                  Datacenter Region *
                </label>

                {/* Region Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                  {Object.entries(groupedRegions).map(([baseSlug, cityData]: [string, any]) => (
                    <button
                      key={baseSlug}
                      type="button"
                      onClick={() => setSelectedCity(selectedCity === baseSlug ? '' : baseSlug)}
                      className={`p-4 border-2 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${selectedCity === baseSlug
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                          : `border-gray-200 ${isDark ? 'border-gray-700 hover:border-gray-600' : 'hover:border-gray-300'}`
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://flagcdn.com/w40/${cityData.flag}.png`}
                          alt={`${cityData.cityName} flag`}
                          className="w-8 h-6 object-cover rounded-sm"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <span className="text-2xl hidden">
                          {cityData.flag === 'us' ? '🇺🇸' :
                            cityData.flag === 'gb' ? '🇬🇧' :
                              cityData.flag === 'de' ? '🇩🇪' :
                                cityData.flag === 'nl' ? '🇳🇱' :
                                  cityData.flag === 'sg' ? '🇸🇬' :
                                    cityData.flag === 'in' ? '🇮🇳' :
                                      cityData.flag === 'au' ? '🇦🇺' :
                                        cityData.flag === 'ca' ? '🇨🇦' : '🌐'}
                        </span>
                        <div className="flex-1">
                          <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {cityData.cityName}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {cityData.regions.length} datacenter{cityData.regions.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Datacenter Dropdown - Only show when city is selected */}
                {selectedCity && groupedRegions[selectedCity] && (
                  <div className="mt-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Select Datacenter
                    </label>
                    <select
                      {...register('region', { required: 'Please select a region' })}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark
                          ? 'border-gray-600 bg-gray-800 text-gray-100'
                          : 'border-gray-300 bg-white text-gray-900'
                        }`}
                    >
                      <option value="">Choose a datacenter...</option>
                      {groupedRegions[selectedCity].regions.map((region: any) => (
                        <option key={region.slug} value={region.slug}>
                          {region.datacenterName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {errors.region && (
                  <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>
                )}
                {regionsLoading && (
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading regions...</p>
                )}
              </div>
            </div>
          </div>

          {/* Choose Size */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center`}>
                <CpuChipIcon className="h-5 w-5 mr-2" />
                Choose Size
              </h3>

              <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {availableSizes.map((size: Size) => (
                    <div
                      key={size.slug}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedSize === size.slug
                        ? `border-blue-500 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`
                        : `${isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`
                        }`}
                      onClick={() => setValue('size', size.slug)}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          {...register('size', { required: 'Size is required' })}
                          value={size.slug}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {size.slug}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {size.vcpus} vCPU • {size.memory} MB RAM • {size.disk} GB SSD
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            ${size.price_monthly}/mo (${size.price_hourly}/hr)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {errors.size && (
                <p className="mt-2 text-sm text-red-600">{errors.size.message}</p>
              )}
              {sizesLoading && (
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading sizes...</p>
              )}
            </div>
          </div>

          {/* Choose an Image */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Choose an Image
              </h3>

              <div>
                {/* OS Tab Selection */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('os')}
                      className={`px-3 py-1 text-sm font-medium ${activeTab === 'os'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : `${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                        }`}
                    >
                      OS
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('marketplace')}
                      className={`px-3 py-1 text-sm font-medium ${activeTab === 'marketplace'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : `${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                        }`}
                    >
                      Marketplace ({marketplaceImages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('custom')}
                      className={`px-3 py-1 text-sm font-medium ${activeTab === 'custom'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : `${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                        }`}
                    >
                      Custom images
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={refreshData}
                    className={`px-3 py-1 text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    🔄 Refresh
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'os' && (
                  <>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                      Operating System *
                    </label>

                    {/* Main OS Distributions */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                      {mainDistributions.map((distribution) => {
                        if (!filteredGroupedImages[distribution] || filteredGroupedImages[distribution].length === 0) return null;
                        const defaultImage = filteredGroupedImages[distribution][0]; // Use first image as default
                        const isSelected = selectedDistribution === distribution;

                        return (
                          <div
                            key={distribution}
                            className={`border rounded-lg p-3 cursor-pointer transition-all text-center ${isSelected
                              ? `border-blue-500 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`
                              : `${isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`
                              }`}
                            onClick={() => {
                              setSelectedDistribution(distribution);
                              setValue('image', defaultImage.slug || defaultImage.id);
                            }}
                          >
                            <input
                              type="radio"
                              {...register('image', { required: 'Operating system is required' })}
                              value={defaultImage.slug || defaultImage.id}
                              className="sr-only"
                            />
                            <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'
                              }`}>
                              {/* OS Logo Images */}
                              {distribution === 'Ubuntu' && (
                                <img
                                  src="https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png"
                                  alt="Ubuntu logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo-ubuntu_cof-orange-hex.svg/120px-Logo-ubuntu_cof-orange-hex.svg.png";
                                    target.onerror = () => {
                                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23E95420'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                    };
                                  }}
                                />
                              )}
                              {distribution === 'Fedora' && (
                                <img
                                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fedora/fedora-plain.svg"
                                  alt="Fedora logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23294172'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                  }}
                                />
                              )}
                              {distribution === 'Debian' && (
                                <img
                                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/debian/debian-plain.svg"
                                  alt="Debian logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A81D33'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                  }}
                                />
                              )}
                              {distribution === 'CentOS' && (
                                <img
                                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/centos/centos-plain.svg"
                                  alt="CentOS logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23932279'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                  }}
                                />
                              )}
                              {distribution === 'AlmaLinux' && (
                                <img
                                  src="https://wiki.almalinux.org/images/almalinux-logo.png"
                                  alt="AlmaLinux logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "https://avatars.githubusercontent.com/u/75713131?s=200&v=4";
                                    target.onerror = () => {
                                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                    };
                                  }}
                                />
                              )}
                              {distribution === 'Rocky Linux' && (
                                <img
                                  src="https://rockylinux.org/images/rocky-linux-icon.png"
                                  alt="Rocky Linux logo"
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "https://github.com/rocky-linux.png";
                                    target.onerror = () => {
                                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310B981'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3C/svg%3E";
                                    };
                                  }}
                                />
                              )}
                            </div>
                            <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {distribution}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Version Selection */}
                    {selectedDistribution && (
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Version
                        </label>
                        <select
                          {...register('image', { required: 'Operating system is required' })}
                          className={`block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        >
                          {filteredGroupedImages[selectedDistribution]?.map((image: Image) => (
                            <option key={image.id} value={image.slug || image.id}>
                              {image.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Marketplace Tab */}
                {activeTab === 'marketplace' && (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Application Images
                      </label>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Explore all Marketplace Solutions →
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search marketplace applications..."
                          value={marketplaceSearchTerm}
                          onChange={(e) => setMarketplaceSearchTerm(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {marketplaceSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setMarketplaceSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {marketplaceSearchTerm && (
                        <div className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {filteredMarketplaceImages.length} application(s) found for "{marketplaceSearchTerm}"
                        </div>
                      )}
                    </div>

                    {/* Recommended Section */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {marketplaceSearchTerm ? 'Search Results' : 'Recommended for you'}
                        </h4>
                        {!marketplaceSearchTerm && (
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {filteredMarketplaceImages.length} applications available
                          </span>
                        )}
                      </div>

                      {filteredMarketplaceImages.length === 0 ? (
                        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {marketplaceSearchTerm ? (
                            <>
                              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <p>No applications found for "{marketplaceSearchTerm}"</p>
                              <p className="text-sm mt-1">Try searching for WordPress, Docker, or Laravel</p>
                            </>
                          ) : (
                            <>
                              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p>No marketplace applications available</p>
                              <p className="text-sm mt-1">Please try refreshing the page</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredMarketplaceImages.map((image: Image) => {
                              // Function to get appropriate icon based on image name/slug from real DO API
                              const getImageIcon = (imageName: string, slug: string) => {
                                const name = imageName.toLowerCase();
                                const imageSlug = slug?.toLowerCase() || '';

                                // Specific marketplace apps based on actual DO API
                                if (name.includes('flashphoner') || name.includes('web call')) return '📞';
                                if (name.includes('botguard') || name.includes('ingress')) return '🛡️';
                                if (name.includes('openmptc') || name.includes('router')) return '🔄';
                                if (name.includes('pi-hole') || name.includes('vpn')) return '🔒';
                                if (name.includes('appsmith')) return '🛠️';
                                if (name.includes('callaba') || name.includes('streaming')) return '📹';
                                if (name.includes('convoy')) return '🚛';
                                if (name.includes('intel') || name.includes('profiler')) return '💎';
                                if (name.includes('invoice') || name.includes('ninja')) return '💰';

                                // WordPress variants
                                if (name.includes('wordpress') || imageSlug.includes('wordpress')) return '📝';

                                // Docker variants  
                                if (name.includes('docker') || imageSlug.includes('docker')) return '🐳';

                                // Control panels
                                if (name.includes('cpanel') || name.includes('whm') || imageSlug.includes('cpanel')) return '🔧';
                                if (name.includes('cyberpanel') || imageSlug.includes('cyberpanel')) return '⚡';

                                // Web stacks
                                if (name.includes('lamp') || imageSlug.includes('lamp')) return '�';
                                if (name.includes('lemp') || name.includes('nginx') || imageSlug.includes('lemp')) return '�';
                                if (name.includes('mern') || imageSlug.includes('mern')) return '💚';

                                // Development frameworks
                                if (name.includes('laravel') || imageSlug.includes('laravel')) return '🎨';
                                if (name.includes('node') || name.includes('nodejs') || imageSlug.includes('node')) return '�';

                                // Databases
                                if (name.includes('mongo') || name.includes('database') || imageSlug.includes('mongo')) return '🗄️';
                                if (name.includes('mysql') || imageSlug.includes('mysql')) return '🐬';
                                if (name.includes('redis') || imageSlug.includes('redis')) return '🔴';
                                if (name.includes('clickhouse') || imageSlug.includes('clickhouse')) return '�';

                                // Analytics & monitoring
                                if (name.includes('plesk') || imageSlug.includes('plesk')) return '📈';

                                // Desktop environments
                                if (name.includes('desktop') || name.includes('gnome') || name.includes('ubuntu desktop')) return '🖥️';

                                // Default application icon
                                return '🚀';
                              };

                              return (
                                <div
                                  key={image.id}
                                  className={`border rounded-lg p-3 cursor-pointer transition-all ${watch('image') === (image.slug || image.id)
                                    ? `border-blue-500 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`
                                    : `${isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`
                                    }`}
                                  onClick={() => setValue('image', image.slug || image.id)}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                      <span className="text-lg">
                                        {getImageIcon(image.name, image.slug)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                                        {image.name}
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                        {image.description || `${image.distribution} based`}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 hover:text-blue-500"
                                    >
                                      Details
                                    </button>
                                  </div>
                                  <input
                                    type="radio"
                                    {...register('image', { required: 'Application image is required' })}
                                    value={image.slug || image.id}
                                    className="sr-only"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Custom Images Tab */}
                {activeTab === 'custom' && (
                  <div className="text-center py-12">
                    <div className={`text-gray-400 mb-4`}>
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                      No custom images
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                      Upload your own images to get started
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Upload Custom Image
                    </button>
                  </div>
                )}

                {errors.image && (
                  <p className="mt-2 text-sm text-red-600">{errors.image.message}</p>
                )}
                {imagesLoading && (
                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading operating systems...</p>
                )}
              </div>
            </div>
          </div>

          {/* Authentication Method */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center`}>
                <KeyIcon className="h-5 w-5 mr-2" />
                Choose Authentication Method
              </h3>

              {/* Authentication Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setAuthMethod('ssh')}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${authMethod === 'ssh'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${authMethod === 'ssh' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                      {authMethod === 'ssh' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </div>
                    <div>
                      <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        SSH Key
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Connect to your Droplet with an SSH key pair
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAuthMethod('password')}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${authMethod === 'password'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${authMethod === 'password' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                      {authMethod === 'password' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </div>
                    <div>
                      <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Password
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Connect to your Droplet as the "root" user via password
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Authentication */}
              {authMethod === 'password' && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Create root password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('root_password', {
                        required: authMethod === 'password' ? 'Root password is required' : false,
                        minLength: { value: 10, message: 'Must be at least 10 characters long' },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^A-Z\d][A-Za-z\d@$!%*?&]*[^0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/,
                          message: 'Password must contain 1 uppercase letter (cannot be first or last character), at least 1 number, and cannot end in a number or special character'
                        }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      className={`block w-full pr-20 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Type your password..."
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`px-2 py-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Show password"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Generate DigitalOcean compliant password
                          const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
                          const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                          const numberChars = '0123456789';
                          const specialChars = '@$!%*?&';

                          let password = '';

                          // Start with lowercase
                          password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));

                          // Add required uppercase (not first or last)
                          password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));

                          // Add required number 
                          password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));

                          // Fill remaining with mixed chars
                          const allChars = lowerChars + upperChars + numberChars + specialChars;
                          for (let i = 3; i < 15; i++) {
                            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
                          }

                          // End with letter (not number or special char)
                          password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));

                          setValue('root_password', password);
                        }}
                        className={`px-3 py-1 text-xs text-blue-600 hover:text-blue-500 border-l ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  {errors.root_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.root_password.message}</p>
                  )}

                  {/* Password Requirements */}
                  <div className="mt-3">
                    <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      PASSWORD REQUIREMENTS
                    </p>
                    <ul className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                      <li>• Must be at least 10 characters long</li>
                      <li>• Must contain 1 uppercase letter (cannot be first or last character)</li>
                      <li>• Must contain at least 1 number</li>
                      <li>• Cannot end in a number or special character</li>
                    </ul>
                  </div>

                  <div className={`mt-3 p-3 ${isDark ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-200'} border rounded-lg`}>
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className={`text-xs ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                        Please store your password securely. You will not be sent an email containing the Droplet's details or password.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SSH Key Authentication */}
              {authMethod === 'ssh' && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    SSH Keys (Recommended)
                  </label>

                  {sshKeysLoading ? (
                    <div className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-4`}>
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Loading SSH keys...
                        </span>
                      </div>
                    </div>
                  ) : sshKeys.length > 0 ? (
                    <div className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-4 space-y-3`}>
                      {sshKeys.map((sshKey: any) => (
                        <label key={sshKey.id} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={sshKey.id}
                            {...register('ssh_keys', {
                              required: authMethod === 'ssh' ? 'Please select at least one SSH key' : false
                            })}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <KeyIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                {sshKey.name}
                              </span>
                            </div>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1 font-mono`}>
                              {sshKey.fingerprint}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-4`}>
                      <div className="text-center">
                        <KeyIcon className={`mx-auto h-8 w-8 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <div className="mt-2">
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            No SSH keys configured
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            Add SSH keys in Settings for secure passwordless access
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/settings')}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                          >
                            Go to Settings →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.ssh_keys && (
                    <p className="mt-1 text-sm text-red-600">{errors.ssh_keys.message}</p>
                  )}

                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    SSH keys provide more secure access than passwords alone. Select keys to include in your VPS.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Advanced Options
              </h3>

              <div className="space-y-4">
                {/* Backup & Monitoring & IPv6 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      {...register('backups')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Enable Backups (+20% cost)
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      {...register('monitoring')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Enable Monitoring
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      {...register('ipv6')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Enable IPv6
                    </span>
                  </label>
                </div>

                {/* Tags */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Tags (Optional)
                  </label>

                  {watchedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {watchedTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag"
                      className={`flex-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className={`px-4 py-2 border border-l-0 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'} rounded-r-md text-sm font-medium`}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* User Data */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      User Data (Cloud-Init Script)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUserData(!showUserData)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      {showUserData ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showUserData && (
                    <div>
                      <UserDataTemplateSelector
                        isDark={isDark}
                        onSelectTemplate={(script: string) => {
                          setValue('user_data', script);
                        }}
                        currentScript={watch('user_data')}
                      />

                      <textarea
                        {...register('user_data')}
                        rows={8}
                        className={`w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono`}
                        placeholder="#!/bin/bash&#10;apt update&#10;apt install -y nginx&#10;systemctl start nginx&#10;&#10;# Select a template above or write your own script"
                        onChange={(e) => {
                          register('user_data').onChange(e);
                        }}
                      />
                      <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Optional script that runs when the VPS first boots. Choose a template above or write your own bash script.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating VPS DO...
                </div>
              ) : (
                'Create VPS DO'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVPS;