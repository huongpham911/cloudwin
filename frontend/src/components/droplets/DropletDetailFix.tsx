import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

const DropletDetailFix: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Test if this component renders at all
  console.log('DropletDetailFix component rendered with ID:', id)

  const { data: droplet, isLoading, error } = useQuery({
    queryKey: ['droplet-fix', id],
    queryFn: async () => {
      console.log('🔍 Fetching droplet data for ID:', id)
      const url = `http://localhost:5000/api/v1/droplets/${id}`
      console.log('🌐 API URL:', url)
      
      try {
        const response = await fetch(url)
        console.log('📡 Response status:', response.status)
        
        if (!response.ok) {
          console.error('❌ Response not OK:', response.status, response.statusText)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('✅ Droplet data received:', data)
        return data
      } catch (err) {
        console.error('💥 Fetch error:', err)
        throw err
      }
    },
    enabled: !!id,
    retry: false
  })

  console.log('Component state:', { 
    id, 
    isLoading, 
    error: error?.message, 
    hasDroplet: !!droplet,
    dropletName: droplet?.name 
  })

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'blue' }}>🔧 Droplet Detail Fix Test</h1>
      
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <strong>Debug Info:</strong>
        <br />
        ID from URL: {id || 'undefined'}
        <br />
        Loading: {isLoading ? 'YES' : 'NO'}
        <br />
        Error: {error ? error.message : 'None'}
        <br />
        Has Data: {droplet ? 'YES' : 'NO'}
        <br />
        Droplet Name: {droplet?.name || 'N/A'}
      </div>

      {isLoading && (
        <div style={{ color: 'orange' }}>
          🔄 Loading droplet {id}...
        </div>
      )}

      {error && (
        <div style={{ color: 'red', background: '#ffe6e6', padding: '10px' }}>
          ❌ Error: {error.message}
          <br />
          <button onClick={() => navigate('/dashboard/droplets')}>
            ← Back to Droplets
          </button>
        </div>
      )}

      {droplet && (
        <div style={{ color: 'green', background: '#e6ffe6', padding: '10px' }}>
          <h2>✅ Droplet Found!</h2>
          <div>
            <strong>Name:</strong> {droplet.name}
            <br />
            <strong>Status:</strong> {droplet.status}
            <br />
            <strong>ID:</strong> {droplet.id}
            <br />
            <strong>Region:</strong> {typeof droplet.region === 'object' ? droplet.region?.slug : droplet.region}
            <br />
            <strong>Size:</strong> {typeof droplet.size === 'object' ? droplet.size?.slug : droplet.size}
            <br />
            <strong>vCPUs:</strong> {droplet.vcpus || 'N/A'}
            <br />
            <strong>Memory:</strong> {droplet.memory ? `${droplet.memory} MB` : 'N/A'}
            <br />
            <strong>Created:</strong> {droplet.created_at}
            <br />
            <button onClick={() => navigate('/dashboard/droplets')}>
              ← Back to Droplets
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && !droplet && (
        <div style={{ color: 'gray' }}>
          🤷 No data, no error, not loading... this is strange.
        </div>
      )}
    </div>
  )
}

export default DropletDetailFix 