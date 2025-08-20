import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useTheme } from '../contexts/ThemeContext'
import {
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { dropletsApi } from '../services/api'
import toast from 'react-hot-toast'

interface CreateDropletForm {
  name: string
  region: string
  size: string
  image: string
  rdp_username: string
  rdp_password: string
}

interface Region {
  slug: string
  name: string
  available: boolean
}

interface Size {
  slug: string
  memory: number
  vcpus: number
  disk: number
  price_monthly: string
  price_hourly: string
  available: boolean
  description?: string
}

interface Image {
  id: string
  name: string
  slug: string
  description: string
  distribution: string
  tags: string[]
}

const CreateWinVPS: React.FC = () => {
  const { isDark } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue
  } = useForm<CreateDropletForm>({
    defaultValues: {
      rdp_username: 'Administrator',
      rdp_password: '',
      image: 'windows-server-2022-datacenter'
    }
  })

  // Watch selected size for pricing display
  const selectedSize = watch('size')

  // Fetch regions
  const { data: regionsResponse, isLoading: regionsLoading } = useQuery({
    queryKey: ['droplet-regions'],
    queryFn: dropletsApi.getRegions
  })
  const regions = Array.isArray(regionsResponse?.data?.regions) ? regionsResponse.data.regions : []

  // Fetch images
  const { data: imagesResponse, isLoading: imagesLoading } = useQuery({
    queryKey: ['droplet-images'],
    queryFn: dropletsApi.getImages
  })
  const images = Array.isArray(imagesResponse?.data?.images) ? imagesResponse.data.images : []

  // Fetch sizes
  const { data: sizesResponse, isLoading: sizesLoading } = useQuery({
    queryKey: ['droplet-sizes'],
    queryFn: dropletsApi.getSizes
  })
  const sizes = Array.isArray(sizesResponse?.data?.sizes) ? sizesResponse.data.sizes : []


  // Create droplet mutation
  const createMutation = useMutation({
    mutationFn: dropletsApi.create,
    onSuccess: (response) => {
      toast.success('Windows VPS creation started!')
      navigate(`/dashboard/droplets/${response.data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create Windows VPS')
    }
  })

  const onSubmit = (data: CreateDropletForm) => {
    createMutation.mutate(data)
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setValue('rdp_password', password)
  }

  const selectedSizeInfo = Array.isArray(sizes) ? sizes.find((size: Size) => size.slug === selectedSize) : null

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Windows VPS</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Deploy a new Windows VPS instance with custom configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Basic Configuration
                </h3>

                <div className="space-y-4">
                  {/* Droplet Name */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      VPS Name
                    </label>
                    <input
                      {...register('name', {
                        required: 'VPS name is required',
                        minLength: { value: 1, message: 'Name must be at least 1 character' },
                        maxLength: { value: 255, message: 'Name must be less than 255 characters' }
                      })}
                      type="text"
                      className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="my-windows-vps"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Operating System Image (Real DigitalOcean Data) */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Windows Version
                    </label>
                    <select
                      {...register('image', { required: 'Windows version is required' })}
                      className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      disabled={imagesLoading}
                    >
                      <option value="">Select Windows Version</option>
                      {images.map((image: Image) => (
                        <option key={image.id} value={image.slug || image.id}>
                          {image.name} ({image.distribution})
                          {image.type === 'application' ? ' - 1-Click App' : ''}
                        </option>
                      ))}
                    </select>
                    {errors.image && (
                      <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                    )}
                    {imagesLoading && (
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading Windows versions from DigitalOcean...</p>
                    )}
                    {!imagesLoading && images.length === 0 && (
                      <p className={`mt-1 text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>No Windows images available</p>
                    )}
                  </div>

                  {/* Region */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Region
                    </label>
                    <select
                      {...register('region', { required: 'Region is required' })}
                      className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      disabled={regionsLoading}
                    >
                      <option value="">Select Region</option>
                      {regions.map((region: Region) => (
                        <option key={region.slug} value={region.slug}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    {errors.region && (
                      <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>
                    )}
                    {regionsLoading && (
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading regions...</p>
                    )}
                  </div>

                  {/* Size */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Size
                    </label>
                    <select
                      {...register('size', { required: 'Size is required' })}
                      className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      disabled={sizesLoading}
                    >
                      <option value="">Select Size</option>
                      {sizes.map((size: Size) => (
                        <option key={size.slug} value={size.slug}>
                          {size.slug} - ${size.price_monthly}/month ({size.memory}MB RAM, {size.vcpus} vCPUs, {size.disk}GB SSD)
                        </option>
                      ))}
                    </select>
                    {errors.size && (
                      <p className="mt-1 text-sm text-red-600">{errors.size.message}</p>
                    )}
                    {sizesLoading && (
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading sizes...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RDP Configuration */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  RDP Configuration
                </h3>

                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      RDP Username
                    </label>
                    <input
                      {...register('rdp_username', { required: 'Username is required' })}
                      type="text"
                      className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Administrator"
                    />
                    {errors.rdp_username && (
                      <p className="mt-1 text-sm text-red-600">{errors.rdp_username.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      RDP Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        {...register('rdp_password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'Password must be at least 8 characters' }
                        })}
                        type={showPassword ? 'text' : 'password'}
                        className={`block w-full pr-20 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter secure password"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`px-2 py-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className={`px-3 py-1 text-xs text-blue-600 hover:text-blue-500 border-l ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                    {errors.rdp_password && (
                      <p className="mt-1 text-sm text-red-600">{errors.rdp_password.message}</p>
                    )}
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Use a strong password with at least 8 characters
                    </p>
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Windows VPS...
                  </div>
                ) : (
                  'Create Windows VPS'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Info */}
          {selectedSizeInfo && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Pricing
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hourly:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>${selectedSizeInfo.price_hourly}/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Monthly:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>${selectedSizeInfo.price_monthly}/month</span>
                  </div>
                  <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} pt-3`}>
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Estimated Monthly:</span>
                      <span className="text-lg font-bold text-blue-600">${selectedSizeInfo.price_monthly}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specifications */}
          {selectedSizeInfo && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg transition-colors duration-300`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Specifications
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Memory:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{selectedSizeInfo.memory} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>vCPUs:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{selectedSizeInfo.vcpus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SSD Disk:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{selectedSizeInfo.disk} GB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className={`${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg transition-colors duration-300`}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                    Windows VPS Build Process
                  </h3>
                  <div className={`mt-2 text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                    <p>
                      Your Windows VPS will be automatically configured with:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Custom Windows Installation</li>
                      <li>RDP access enabled</li>
                      <li>Automatic updates configured</li>
                      <li>Enhanced security settings</li>
                      <li>Windows licensing included</li>
                    </ul>
                    <p className="mt-2">
                      Build time: ~20-45 minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateWinVPS 