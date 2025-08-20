import axios from 'axios'
import { tokenService } from './tokenService'

const API_BASE_URL = 'http://localhost:5000/api/v1'

export interface Volume {
    id: string
    name: string
    size_gigabytes: number
    region: {
        name: string
        slug: string
    }
    created_at: string
    droplet_ids: number[]
    filesystem_type: string
    filesystem_label: string
    description?: string
}

export interface CreateVolumeRequest {
    name: string
    size_gigabytes: number
    region?: string
    filesystem_type?: string
    filesystem_label?: string
    description?: string
}

export interface AttachVolumeRequest {
    volume_id: string
    droplet_id: string
}

export const volumesApi = {
    // Get all volumes
    getAll: async (): Promise<{ data: Volume[] }> => {
        const response = await tokenService.makeApiCall({
            method: 'GET',
            url: '/api/v1/volumes'
        })
        // API returns array directly, wrap in data object for consistency
        return { data: Array.isArray(response) ? response : [] }
    },

    // Get volumes attached to a specific droplet
    getByDroplet: async (dropletId: string): Promise<{ data: Volume[] }> => {
        const response = await tokenService.makeApiCall({
            method: 'GET',
            url: `/api/v1/droplets/${dropletId}/volumes`
        })
        // API returns array directly, wrap in data object for consistency
        return { data: Array.isArray(response) ? response : [] }
    },

    // Get a specific volume
    get: async (volumeId: string): Promise<{ data: Volume }> => {
        const response = await tokenService.makeApiCall({
            method: 'GET',
            url: `/api/v1/volumes/${volumeId}`
        })
        return { data: response }
    },

    // Create a new volume
    create: async (volumeData: CreateVolumeRequest): Promise<{ data: Volume }> => {
        const response = await tokenService.makeApiCall({
            method: 'POST',
            url: '/api/v1/volumes',
            data: volumeData
        })
        return { data: response }
    },

    // Attach volume to droplet
    attach: async (volumeId: string, dropletId: string): Promise<{ data: { success: boolean } }> => {
        console.log('Attaching volume:', { volumeId, dropletId })
        const response = await tokenService.makeApiCall({
            method: 'POST',
            url: `/api/v1/volumes/${volumeId}/attach`,
            data: { droplet_id: dropletId }
        })
        console.log('Attach response:', response)
        return { data: response }
    },

    // Detach volume from droplet
    detach: async (volumeId: string): Promise<{ data: { success: boolean } }> => {
        const response = await tokenService.makeApiCall({
            method: 'POST',
            url: `/api/v1/volumes/${volumeId}/detach`
        })
        return { data: response }
    },

    // Delete volume
    delete: async (volumeId: string): Promise<{ data: { success: boolean } }> => {
        const response = await tokenService.makeApiCall({
            method: 'DELETE',
            url: `/api/v1/volumes/${volumeId}`
        })
        return { data: response }
    },

    // Resize volume
    resize: async (volumeId: string, newSize: number): Promise<{ data: { success: boolean } }> => {
        const response = await axios.post(`${API_BASE_URL}/volumes/${volumeId}/resize`, {
            size_gigabytes: newSize
        })
        return { data: response.data }
    }
}

export default volumesApi
