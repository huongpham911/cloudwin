import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  MagnifyingGlassIcon,
  StarIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  PlusIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { templatesApi } from '../services/api'
import { toast } from 'react-hot-toast'

interface WindowsTemplate {
  id: number
  name: string
  template_id: string
  description: string
  version: string
  min_ram_gb: number
  min_disk_gb: number
  min_cpu_cores: number
  is_official: boolean
  download_count: number
  rating: number
  created_by?: {
    id: number
    full_name: string
  }
  is_favorited?: boolean
}

const TemplateMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('rating')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', 'marketplace', sortBy],
    queryFn: () => templatesApi.getMarketplace({ sort_by: sortBy })
  })

  // Fetch user's templates
  const { data: myTemplates } = useQuery({
    queryKey: ['templates', 'my-templates'],
    queryFn: templatesApi.getMyTemplates
  })

  // Mutations
  const favoriteMutation = useMutation({
    mutationFn: (templateId: number) => templatesApi.addToFavorites(templateId),
    onSuccess: () => {
      toast.success('Added to favorites')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add to favorites')
    }
  })

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'official' && template.is_official) ||
                           (selectedCategory === 'community' && !template.is_official)
    
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'official', name: 'Official', count: templates.filter(t => t.is_official).length },
    { id: 'community', name: 'Community', count: templates.filter(t => !t.is_official).length }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Template Marketplace</h1>
            <p className="mt-2 text-gray-600">
              Discover and share Windows templates for your projects
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Template
            </button>
            
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload ISO
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
            <div className="space-y-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{category.name}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {category.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="rating">Highest Rated</option>
              <option value="downloads">Most Downloaded</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* My Templates Summary */}
          {myTemplates && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">My Templates</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Custom: {myTemplates.custom?.length || 0}</div>
                <div>Favorites: {myTemplates.favorites?.length || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {template.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {template.is_official ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Official
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Community
                            </span>
                          )}
                          <span className="text-xs text-gray-500">v{template.version}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => favoriteMutation.mutate(template.id)}
                        disabled={favoriteMutation.isPending}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        {template.is_favorited ? (
                          <HeartIconSolid className="h-5 w-5 text-red-500" />
                        ) : (
                          <HeartIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {template.description}
                    </p>

                    {/* Requirements */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-900 mb-2">Requirements</h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {template.min_ram_gb}GB RAM
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {template.min_disk_gb}GB Disk
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {template.min_cpu_cores} CPU
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                          <span>{template.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center">
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          <span>{template.download_count}</span>
                        </div>
                      </div>
                      
                      {template.created_by && (
                        <span className="text-xs">
                          by {template.created_by.full_name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                        Use Template
                      </button>
                      <button className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['templates'] })
          }}
        />
      )}
    </div>
  )
}

export default TemplateMarketplace