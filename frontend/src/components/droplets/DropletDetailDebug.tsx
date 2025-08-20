import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ServerIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const DropletDetailDebug: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Simple fetch without complex dependencies
  const { data: droplet, isLoading, error } = useQuery({
    queryKey: ['droplet-debug', id],
    queryFn: async () => {
      console.log('Fetching droplet:', id)
      const response = await fetch(`http://localhost:5000/api/v1/droplets/${id}`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Droplet data:', data)
      return data
    },
    enabled: !!id
  })

  console.log('Component state:', { id, isLoading, error, droplet })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading droplet {id}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading droplet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Error: {error.message}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Droplet ID: {id}
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard/droplets')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Droplets
          </button>
        </div>
      </div>
    )
  }

  if (!droplet) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No droplet data</h3>
        <p className="mt-1 text-sm text-gray-500">
          No data returned for droplet ID: {id}
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard/droplets')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Droplets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard/droplets')}
            className="mr-4 p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <ServerIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">{droplet.name}</h1>
            <div className="flex items-center mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {droplet.status}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ID: {droplet.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🔍 Debug Information
          </h3>
          <div className="space-y-3">
            <div>
              <strong>Droplet Name:</strong> {droplet.name}
            </div>
            <div>
              <strong>Status:</strong> {droplet.status}
            </div>
            <div>
              <strong>ID:</strong> {droplet.id}
            </div>
            <div>
              <strong>vCPUs:</strong> {droplet.vcpus || 'N/A'}
            </div>
            <div>
              <strong>Memory:</strong> {droplet.memory ? `${droplet.memory} MB` : 'N/A'}
            </div>
            <div>
              <strong>Disk:</strong> {droplet.disk ? `${droplet.disk} GB` : 'N/A'}
            </div>
            <div>
              <strong>Region:</strong> {typeof droplet.region === 'object' ? droplet.region?.slug || droplet.region?.name : droplet.region}
            </div>
            <div>
              <strong>Size:</strong> {typeof droplet.size === 'object' ? droplet.size?.slug || droplet.size?.name : droplet.size}
            </div>
            {droplet.networks?.v4?.length > 0 && (
              <div>
                <strong>Networks:</strong>
                <ul className="mt-1 ml-4">
                  {droplet.networks.v4.map((net: any, i: number) => (
                    <li key={i}>
                      {net.type}: {net.ip_address}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {droplet.account_id !== undefined && (
              <div>
                <strong>Account:</strong> Account {droplet.account_id + 1}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📄 Raw API Response
          </h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(droplet, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default DropletDetailDebug 