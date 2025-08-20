// Frontend service for Firewall API
import { api } from './api'

export interface FirewallRule {
    type: string
    protocol: string
    ports: string
    sources?: {
        addresses?: string[]
        droplet_ids?: number[]
        load_balancer_uids?: string[]
        kubernetes_ids?: string[]
        tags?: string[]
    }
    destinations?: {
        addresses?: string[]
        droplet_ids?: number[]
        load_balancer_uids?: string[]
        kubernetes_ids?: string[]
        tags?: string[]
    }
}

export interface Firewall {
    id: string
    name: string
    status: string
    inbound_rules: FirewallRule[]
    outbound_rules: FirewallRule[]
    droplet_ids: number[]
    tags: string[]
    created_at: string
    pending_changes: any[]
}

export interface CreateFirewallRequest {
    name: string
    inbound_rules?: FirewallRule[]
    outbound_rules?: FirewallRule[]
    droplet_ids?: number[]
    tags?: string[]
}

export interface UpdateFirewallRequest {
    name?: string
    inbound_rules?: FirewallRule[]
    outbound_rules?: FirewallRule[]
}

export interface AddDropletsRequest {
    droplet_ids: number[]
}

export interface RemoveDropletsRequest {
    droplet_ids: number[]
}

export interface AddRulesRequest {
    inbound_rules?: FirewallRule[]
    outbound_rules?: FirewallRule[]
}

export interface RemoveRulesRequest {
    inbound_rules?: FirewallRule[]
    outbound_rules?: FirewallRule[]
}

class FirewallsAPI {
    // List all firewalls
    async listFirewalls(): Promise<Firewall[]> {
        const response = await api.get('/api/v1/firewalls/')
        // Backend returns { firewalls: [], links: {}, meta: {} }
        return response.data.firewalls || []
    }

    // Get firewall by ID
    async getFirewall(firewallId: string): Promise<Firewall> {
        const response = await api.get(`/api/v1/firewalls/${firewallId}`)
        // Backend returns firewall object directly
        return response.data
    }

    // Create new firewall
    async createFirewall(data: CreateFirewallRequest): Promise<Firewall> {
        const response = await api.post('/api/v1/firewalls/', data)
        // Backend returns firewall object directly
        return response.data
    }

    // Update firewall (not implemented in backend yet)
    async updateFirewall(firewallId: string, data: UpdateFirewallRequest): Promise<Firewall> {
        const response = await api.put(`/api/v1/firewalls/${firewallId}`, data)
        return response.data
    }

    // Delete firewall
    async deleteFirewall(firewallId: string): Promise<void> {
        await api.delete(`/api/v1/firewalls/${firewallId}`)
    }

    // Add droplets to firewall
    async addDroplets(firewallId: string, data: AddDropletsRequest): Promise<void> {
        // Backend expects { droplets: [id1, id2] }
        const payload = { droplets: data.droplet_ids }
        await api.post(`/api/v1/firewalls/${firewallId}/droplets`, payload)
    }

    // Remove droplets from firewall
    async removeDroplets(firewallId: string, data: RemoveDropletsRequest): Promise<void> {
        // Backend expects { droplets: [id1, id2] }
        const payload = { droplets: data.droplet_ids }
        await api.delete(`/api/v1/firewalls/${firewallId}/droplets`, { data: payload })
    }

    // Add rules to firewall
    async addRules(firewallId: string, data: AddRulesRequest): Promise<void> {
        await api.post(`/api/v1/firewalls/${firewallId}/rules`, data)
    }

    // Remove rules from firewall
    async removeRules(firewallId: string, data: RemoveRulesRequest): Promise<void> {
        await api.delete(`/api/v1/firewalls/${firewallId}/rules`, { data })
    }

    // Get firewalls assigned to a specific droplet
    async getDropletFirewalls(dropletId: number): Promise<Firewall[]> {
        const response = await api.get(`/api/v1/firewalls/droplet/${dropletId}`)
        // Backend returns { firewalls: [], count: number }
        return response.data.firewalls || []
    }
}

export const firewallsApi = new FirewallsAPI()

// Common firewall rule templates
export const FirewallTemplates = {
    SSH: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '22',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    HTTP: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '80',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    HTTPS: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '443',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    RDP: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '3389',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    FTP: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '21',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    MySQL: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '3306',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    PostgreSQL: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '5432',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    MongoDB: {
        type: 'inbound',
        protocol: 'tcp',
        ports: '27017',
        sources: { addresses: ['127.0.0.1/32'] }
    },
    ALL_OUTBOUND: {
        type: 'outbound',
        protocol: 'tcp',
        ports: 'all',
        destinations: { addresses: ['127.0.0.1/32'] }
    }
}
