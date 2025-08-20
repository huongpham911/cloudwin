import { api } from './api'

export interface GenAIWorkspace {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface GenAIAgent {
  id?: string
  uuid?: string
  name: string
  description?: string
  workspace_id?: string
  model?: string | GenAIModel | any
  instructions?: string
  instruction?: string
  created_at: string
  updated_at: string
  status?: string
}

export interface GenAIModel {
  id: string
  name: string
  description?: string
  provider?: string
  capabilities?: string[]
}

export interface CreateWorkspaceRequest {
  name: string
  description?: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
  workspace_id?: string
  model?: string
  instructions?: string
}

export interface ChatRequest {
  agent_id: string
  message: string
}

export interface StoryGenerationRequest {
  genre: string
  length: 'short' | 'medium' | 'long'
  characters?: string[]
  theme?: string
  setting?: string
}

export interface CharacterGenerationRequest {
  name: string
  role: string
  personality?: string
  background?: string
}

class GenAIService {
  async getStatus() {
    const response = await api.get('/api/v1/genai/status')
    return response.data
  }

  async healthCheck() {
    const response = await api.get('/api/v1/genai/health')
    return response.data
  }

  // Workspace Management
  async listWorkspaces() {
    const response = await api.get('/api/v1/genai/workspaces')
    return response.data
  }

  async createWorkspace(data: CreateWorkspaceRequest) {
    const response = await api.post('/api/v1/genai/workspaces', data)
    return response.data
  }

  async getWorkspace(workspaceId: string) {
    const response = await api.get(`/api/v1/genai/workspaces/${workspaceId}`)
    return response.data
  }

  async updateWorkspace(workspaceId: string, data: Partial<CreateWorkspaceRequest>) {
    const response = await api.put(`/api/v1/genai/workspaces/${workspaceId}`, data)
    return response.data
  }

  async deleteWorkspace(workspaceId: string) {
    const response = await api.delete(`/api/v1/genai/workspaces/${workspaceId}`)
    return response.data
  }

  // Agent Management
  async listAgents() {
    const response = await api.get('/api/v1/genai/agents')
    return response.data
  }

  async createAgent(data: CreateAgentRequest) {
    const response = await api.post('/api/v1/genai/agents', data)
    return response.data
  }

  async getAgent(agentId: string) {
    const response = await api.get(`/api/v1/genai/agents/${agentId}`)
    return response.data
  }

  async updateAgent(agentId: string, data: Partial<CreateAgentRequest>) {
    const response = await api.put(`/api/v1/genai/agents/${agentId}`, data)
    return response.data
  }

  async deleteAgent(agentId: string) {
    const response = await api.delete(`/api/v1/genai/agents/${agentId}`)
    return response.data
  }

  // API Key Management
  async createAgentApiKey(agentId: string, keyName: string) {
    const response = await api.post(`/api/v1/genai/agents/${agentId}/api-keys`, {
      name: keyName
    })
    return response.data
  }

  async listAgentApiKeys(agentId: string) {
    const response = await api.get(`/api/v1/genai/agents/${agentId}/api-keys`)
    return response.data
  }

  // Knowledge Base Management
  async listKnowledgeBases() {
    const response = await api.get('/api/v1/genai/knowledge-bases')
    return response.data
  }

  async createKnowledgeBase(data: { name: string; description?: string; workspace_id?: string }) {
    const response = await api.post('/api/v1/genai/knowledge-bases', data)
    return response.data
  }

  // Models
  async listModels() {
    const response = await api.get('/api/v1/genai/models')
    return response.data
  }

  // Chat & Content Generation
  async chatWithAgent(data: ChatRequest) {
    const response = await api.post('/api/v1/genai/chat', data)
    return response.data
  }

  async generateStory(data: StoryGenerationRequest) {
    const response = await api.post('/api/v1/genai/story/generate', data)
    return response.data
  }

  async generateCharacter(data: CharacterGenerationRequest) {
    const response = await api.post('/api/v1/genai/story/character', data)
    return response.data
  }

  // Test endpoint
  async testConnection() {
    const response = await api.get('/api/v1/genai-test')
    return response.data
  }
}

export const genaiService = new GenAIService()
export default genaiService
