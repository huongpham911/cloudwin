import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { genaiService, GenAIAgent, GenAIWorkspace, CreateAgentRequest } from '../services/genaiService'
import toast from 'react-hot-toast'

const AIAgents: React.FC = () => {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<GenAIAgent | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatResponse, setChatResponse] = useState('')

  // Fetch agents data with error handling
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['genai-agents'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching agents...')
        const result = await genaiService.listAgents()
        console.log('✅ Agents result:', result)

        // Handle both success and error responses
        if (result && typeof result === 'object') {
          // If backend returns success: false due to 401, show mock data for testing
          if (result.success === false && result.error?.includes('401')) {
            console.log('🔧 Using mock data for testing (401 Unauthorized)')
            return {
              success: true,
              agents: [
                {
                  uuid: 'mock-agent-1',
                  id: 'mock-agent-1',
                  name: 'Test Content Creator',
                  description: 'AI agent for content generation (Mock Data)',
                  model: 'gpt-4',
                  instructions: 'You are a helpful content creation assistant.',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  uuid: 'mock-agent-2',
                  id: 'mock-agent-2',
                  name: 'Test Code Assistant',
                  description: 'AI agent for code assistance (Mock Data)',
                  model: 'claude-3',
                  instructions: 'You are a helpful coding assistant.',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ],
              count: 2
            }
          }

          // Return actual result for other cases
          return result
        }

        return { success: false, agents: [], error: 'Invalid response format' }
      } catch (error) {
        console.error('❌ Error fetching agents:', error)
        // Return error in expected format instead of throwing
        return { success: false, agents: [], error: error.message || 'Failed to fetch agents' }
      }
    },
    refetchInterval: 30000,
    retry: false,
  })

  // Fetch workspaces for dropdown with error handling
  const { data: workspacesData, error: workspacesError } = useQuery({
    queryKey: ['genai-workspaces'],
    queryFn: async () => {
      try {
        console.log('Fetching workspaces...')
        const result = await genaiService.listWorkspaces()
        console.log('Workspaces result:', result)
        return result
      } catch (error) {
        console.error('Error fetching workspaces:', error)
        // Don't throw error for workspaces as it's optional
        return { workspaces: [] }
      }
    },
    retry: false,
  })

  // Fetch models for dropdown with error handling
  const { data: modelsData, error: modelsError } = useQuery({
    queryKey: ['genai-models'],
    queryFn: async () => {
      try {
        console.log('Fetching models...')
        const result = await genaiService.listModels()
        console.log('Models result:', result)
        return result
      } catch (error) {
        console.error('Error fetching models:', error)
        // Don't throw error for models as it's optional
        return { models: [] }
      }
    },
    retry: false,
  })

  const agents = agentsData?.agents || []
  const workspaces = workspacesData?.workspaces || []
  const models = modelsData?.models || []

  // Debug logging
  console.log('🔍 Final data - Agents:', agents, 'Models:', models, 'Workspaces:', workspaces)
  console.log('🔍 AgentsData full response:', agentsData)
  console.log('🔍 Errors - Agents:', agentsError, 'Models:', modelsError, 'Workspaces:', workspacesError)

  // Check if agents data has error
  const hasAgentsError = agentsData?.success === false || agentsError
  const agentsErrorMessage = agentsData?.error || agentsError?.message || 'Unknown error'

  // Show error if agents failed to load
  if (hasAgentsError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading AI Agents
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>Failed to load agents data. Please check your connection and try again.</p>
                  <p className="mt-1 text-xs">Error: {agentsErrorMessage}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Debug: Log first model to see structure
  if (models.length > 0) {
    console.log('First model structure:', models[0])
  }

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: (data: CreateAgentRequest) => genaiService.createAgent(data),
    onSuccess: (response) => {
      console.log('Create agent response:', response)
      if (response.success) {
        toast.success('AI Agent created successfully!')
        queryClient.invalidateQueries({ queryKey: ['genai-agents'] })
        setShowCreateModal(false)
      } else {
        toast.error(response.error || 'Failed to create AI agent')
      }
    },
    onError: (error: any) => {
      console.error('Create agent error:', error)
      toast.error(error.response?.data?.error || 'Failed to create AI agent')
    },
  })

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => {
      console.log('Calling deleteAgent with ID:', agentId)
      return genaiService.deleteAgent(agentId)
    },
    onSuccess: (data) => {
      console.log('Delete success:', data)
      toast.success('AI Agent deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['genai-agents'] })
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.error || 'Failed to delete AI agent')
    },
  })

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: ({ agent_id, message }: { agent_id: string; message: string }) =>
      genaiService.chatWithAgent({ agent_id, message }),
    onSuccess: (data) => {
      if (data.success) {
        setChatResponse(data.response || 'No response received')
      } else {
        toast.error(data.error || 'Chat failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Chat failed')
    },
  })

  const handleCreateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const agentData: CreateAgentRequest = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      workspace_id: formData.get('workspace_id') as string,
      model: formData.get('model') as string,
      instructions: formData.get('instructions') as string,
    }

    console.log('Sending agent data:', agentData)
    createAgentMutation.mutate(agentData)
  }

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgent || !chatMessage.trim()) return

    chatMutation.mutate({
      agent_id: selectedAgent.uuid || selectedAgent.id,
      message: chatMessage.trim()
    })
  }

  const handleDeleteAgent = (agent: GenAIAgent) => {
    console.log('Deleting agent:', agent)
    const agentId = agent.uuid || agent.id
    console.log('Agent ID:', agentId)
    if (window.confirm(`Are you sure you want to delete the agent "${agent.name}"?`)) {
      deleteAgentMutation.mutate(agentId)
    }
  }

  return (
    <div className="space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AI Agents</h1>
              <p className="mt-1 text-sm text-gray-300">
                Create and manage intelligent AI assistants for content generation
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Agent
            </button>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-white">
            Your AI Agents ({agents.length})
          </h3>
        </div>
        <div className="border-t border-gray-700">
          {agentsLoading ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ) : agents.length === 0 ? (
            <div className="px-4 py-8 sm:px-6 text-center">
              <SparklesIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">No AI agents</h3>
              <p className="mt-1 text-sm text-gray-400">
                Get started by creating your first AI agent.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Create AI Agent
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {agents.map((agent: GenAIAgent) => (
                <li key={agent.uuid || agent.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        <SparklesIcon className="h-8 w-8 text-purple-400" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-white">
                          {agent.name}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {agent.description || 'No description'}
                        </div>
                        {agent.model && (
                          <div className="text-xs text-gray-500 mt-1">
                            Model: {typeof agent.model === 'string' ? agent.model : (agent.model as any)?.name || (agent.model as any)?.inference_name || 'Unknown'}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Created: {new Date(agent.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'active' ? 'bg-green-900 text-green-200' :
                        agent.status === 'inactive' ? 'bg-red-900 text-red-200' :
                        'bg-blue-900 text-blue-200'
                      }`}>
                        {agent.status || 'Ready'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedAgent(agent)
                          setShowChatModal(true)
                          setChatResponse('')
                          setChatMessage('')
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                      >
                        <ChatBubbleLeftRightIcon className="w-3 h-3 mr-1" />
                        Chat
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-600 text-xs font-medium rounded text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
                      >
                        <TrashIcon className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Create AI Agent</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    placeholder="My AI Assistant"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe what this agent does..."
                  />
                </div>
                {workspaces.length > 0 && (
                  <div>
                    <label htmlFor="workspace_id" className="block text-sm font-medium text-gray-300">
                      Workspace
                    </label>
                    <select
                      name="workspace_id"
                      id="workspace_id"
                      className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select workspace (optional)</option>
                      {workspaces.map((workspace: GenAIWorkspace, index: number) => (
                        <option key={workspace.id || `workspace-${index}`} value={workspace.id}>
                          {workspace.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {models.length > 0 && (
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-300">
                      Model
                    </label>
                    <select
                      name="model"
                      id="model"
                      className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select model (optional)</option>
                      {models.map((model: any, index: number) => (
                        <option key={model.uuid || model.id || `model-${index}`} value={model.uuid}>
                          {model.name || model.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-300">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    id="instructions"
                    rows={4}
                    className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Give instructions to your AI agent..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAgentMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800 disabled:opacity-50"
                  >
                    {createAgentMutation.isPending ? 'Creating...' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700 max-h-[80vh] flex flex-col">
            <div className="px-4 py-5 sm:p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  Chat with {selectedAgent.name}
                </h3>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {chatResponse && (
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-300 mb-2">AI Response:</div>
                  <div className="text-white whitespace-pre-wrap">{chatResponse}</div>
                </div>
              )}
              <form onSubmit={handleChat} className="space-y-4">
                <div>
                  <label htmlFor="chat-message" className="block text-sm font-medium text-gray-300">
                    Your Message
                  </label>
                  <textarea
                    id="chat-message"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Type your message here..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowChatModal(false)}
                    className="px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={chatMutation.isPending || !chatMessage.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-800 disabled:opacity-50"
                  >
                    {chatMutation.isPending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAgents
