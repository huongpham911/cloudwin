import { api } from './api'

export interface AdminAnalytics {
    users: {
        total: number
        active: number
        admin: number
        with_tokens: number
    }
    tokens: {
        total: number
        valid: number
        invalid: number
        users_with_tokens: number
        tokens_list: Array<{
            user_email: string
            user_name: string
            token: string
            masked_token: string
            status: string
            valid: boolean
            created_at?: string
        }>
    }
    droplets: {
        total: number
        running: number
        stopped: number
        other: number
    }
    system: {
        uptime: string
        version: string
        environment: string
    }
}

export interface AdminSpace {
    id: string
    name: string
    region: string
    endpoint: string
    size_gb?: number
    files_count?: number
    created_at: string
    status: 'active' | 'inactive'
    access_key?: string
    secret_key?: string
    user_email?: string
    user_name?: string
}

export interface AdminSpaceFile {
    id: string
    name: string
    size: number
    type: string
    last_modified: string
    url?: string
    key?: string
    bucket_name?: string
    user_email?: string
}

export const adminSpacesApi = {
    // Get all Spaces from all user tokens
    getAllSpaces: () => {
        return api.get('/admin/spaces')
    },

    // Get admin analytics with all tokens (legacy)
    getAnalytics: () => {
        return api.get('/admin/analytics')
    },

    // Get buckets for a space
    getSpaceBuckets: (spaceId: string) => {
        return api.get(`/admin/spaces/${spaceId}/buckets`)
    },

    // Get files in a bucket  
    getBucketFiles: (spaceId: string, bucketName: string) => {
        return api.get(`/admin/spaces/${spaceId}/buckets/${bucketName}/files`)
    },

    // Legacy method - get all spaces from analytics
    getAllSpacesLegacy: async (page: number = 1, per_page: number = 50) => {
        try {
            // First get all tokens from analytics
            const analyticsResponse = await api.get('/admin/analytics')
            const analytics: AdminAnalytics = analyticsResponse.data

            if (!analytics.tokens?.tokens_list?.length) {
                return {
                    data: {
                        spaces_keys: [],
                        total: 0,
                        page,
                        per_page
                    }
                }
            }

            // Get spaces from each valid token
            const allSpaces: AdminSpace[] = []

            for (const tokenData of analytics.tokens.tokens_list) {
                if (tokenData.valid && tokenData.token) {
                    try {
                        // Make direct API call with specific token
                        const spacesResponse = await fetch('http://localhost:5000/api/v1/spaces/', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer token_${tokenData.user_email}`, // Use email as user identifier
                                'X-DO-Token': tokenData.token // Pass actual DO token
                            }
                        })

                        if (spacesResponse.ok) {
                            const spacesData = await spacesResponse.json()
                            const userSpaces = spacesData.spaces_keys || []

                            // Add user info to each space
                            userSpaces.forEach((space: any) => {
                                allSpaces.push({
                                    ...space,
                                    user_email: tokenData.user_email,
                                    user_name: tokenData.user_name,
                                    endpoint: space.endpoint || `${space.region || 'nyc3'}.digitaloceanspaces.com`
                                })
                            })
                        }
                    } catch (error) {
                        console.error(`Failed to get spaces for ${tokenData.user_email}:`, error)
                    }
                }
            }

            return {
                data: {
                    spaces_keys: allSpaces,
                    total: allSpaces.length,
                    page,
                    per_page
                }
            }
        } catch (error) {
            console.error('Failed to get all spaces:', error)
            throw error
        }
    },

    // Get all buckets from all users' tokens
    getAllBuckets: async () => {
        try {
            // First get all tokens from analytics
            const analyticsResponse = await api.get('/admin/analytics')
            const analytics: AdminAnalytics = analyticsResponse.data

            if (!analytics.tokens?.tokens_list?.length) {
                return {
                    data: {
                        buckets: [],
                        total: 0
                    }
                }
            }

            // Get buckets from each valid token
            const allBuckets: any[] = []

            for (const tokenData of analytics.tokens.tokens_list) {
                if (tokenData.valid && tokenData.token) {
                    try {
                        // Make direct API call with specific token
                        const bucketsResponse = await fetch('http://localhost:5000/api/v1/spaces/buckets/', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer token_${tokenData.user_email}`,
                                'X-DO-Token': tokenData.token
                            }
                        })

                        if (bucketsResponse.ok) {
                            const bucketsData = await bucketsResponse.json()
                            const userBuckets = bucketsData.buckets || []

                            // Add user info to each bucket
                            userBuckets.forEach((bucket: any) => {
                                allBuckets.push({
                                    ...bucket,
                                    user_email: tokenData.user_email,
                                    user_name: tokenData.user_name
                                })
                            })
                        }
                    } catch (error) {
                        console.error(`Failed to get buckets for ${tokenData.user_email}:`, error)
                    }
                }
            }

            return {
                data: {
                    buckets: allBuckets,
                    total: allBuckets.length
                }
            }
        } catch (error) {
            console.error('Failed to get all buckets:', error)
            throw error
        }
    },

    // Get files from a specific bucket with user token
    getBucketFiles: async (bucketName: string, userEmail: string, region: string = 'nyc3') => {
        try {
            // First get the user's token
            const analyticsResponse = await api.get('/admin/analytics')
            const analytics: AdminAnalytics = analyticsResponse.data

            const userToken = analytics.tokens?.tokens_list?.find(
                t => t.user_email === userEmail && t.valid
            )

            if (!userToken) {
                return {
                    data: {
                        files: [],
                        bucket_name: bucketName,
                        total: 0
                    }
                }
            }

            // Make direct API call with user's token
            const filesResponse = await fetch(`http://localhost:5000/api/v1/spaces/buckets/${bucketName}/files?region=${region}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer token_${userEmail}`,
                    'X-DO-Token': userToken.token
                }
            })

            if (filesResponse.ok) {
                const filesData = await filesResponse.json()
                const files = filesData.files || []

                // Add user and bucket info to each file
                const enrichedFiles = files.map((file: any) => ({
                    ...file,
                    bucket_name: bucketName,
                    user_email: userEmail,
                    user_name: userToken.user_name
                }))

                return {
                    data: {
                        files: enrichedFiles,
                        bucket_name: bucketName,
                        total: enrichedFiles.length
                    }
                }
            } else {
                throw new Error(`Failed to get files: ${filesResponse.statusText}`)
            }
        } catch (error) {
            console.error(`Failed to get files for bucket ${bucketName}:`, error)
            throw error
        }
    },

    // Create space with specific user token
    createSpace: async (data: { name: string; region: string }, userEmail: string) => {
        try {
            // First get the user's token
            const analyticsResponse = await api.get('/admin/analytics')
            const analytics: AdminAnalytics = analyticsResponse.data

            const userToken = analytics.tokens?.tokens_list?.find(
                t => t.user_email === userEmail && t.valid
            )

            if (!userToken) {
                throw new Error('User token not found or invalid')
            }

            // Make direct API call with user's token
            const createResponse = await fetch('http://localhost:5000/api/v1/spaces/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer token_${userEmail}`,
                    'X-DO-Token': userToken.token
                },
                body: JSON.stringify(data)
            })

            if (createResponse.ok) {
                return await createResponse.json()
            } else {
                const errorData = await createResponse.json()
                throw new Error(errorData.detail || 'Failed to create space')
            }
        } catch (error) {
            console.error('Failed to create space:', error)
            throw error
        }
    },

    // Delete space with specific user token
    deleteSpace: async (spaceId: string, userEmail: string) => {
        try {
            // First get the user's token
            const analyticsResponse = await api.get('/admin/analytics')
            const analytics: AdminAnalytics = analyticsResponse.data

            const userToken = analytics.tokens?.tokens_list?.find(
                t => t.user_email === userEmail && t.valid
            )

            if (!userToken) {
                throw new Error('User token not found or invalid')
            }

            // Make direct API call with user's token
            const deleteResponse = await fetch(`http://localhost:5000/api/v1/spaces/${spaceId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer token_${userEmail}`,
                    'X-DO-Token': userToken.token
                }
            })

            if (deleteResponse.ok) {
                return await deleteResponse.json()
            } else {
                const errorData = await deleteResponse.json()
                throw new Error(errorData.detail || 'Failed to delete space')
            }
        } catch (error) {
            console.error('Failed to delete space:', error)
            throw error
        }
    }
}

export default adminSpacesApi
