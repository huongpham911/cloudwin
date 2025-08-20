import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  SparklesIcon,
  UserIcon,
  ClockIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { adminApi } from '../../services/adminApi'
import { useTheme } from '../../contexts/ThemeContext'
import toast from 'react-hot-toast'

interface Agent {
  id: string
  name: string
  description: string
  user_id: string
  user_email: string
  workspace_id: string
  model: string
  status: 'active' | 'inactive'
  created_at: string
  last_used: string
  usage_count: number
}

interface AgentDetails extends Agent {
  user_name: string
  workspace_name: string
  instructions: string
  updated_at: string
  usage_stats: {
    total_conversations: number
    total_messages: number
    avg_response_time_ms: number
    success_rate: number
  }
  recent_activity: Array<{
    timestamp: string
    action: string
    details: string
  }>
}

const AdminAgents: React.FC = () => {
  const { isDark } = useTheme()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentDetails | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null)

  const pageSize = 10

  // Fetch agents list
  const { data: agentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAgents', currentPage, searchTerm, selectedUserId],
    queryFn: () => adminApi.getAllAgents({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      user_id: selectedUserId || undefined
    }),
    refetchInterval: 30000,
  })

  // Fetch agent details
  const { data: agentDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['agentDetails', selectedAgent?.id],
    queryFn: () => selectedAgent ? adminApi.getAgentDetails(selectedAgent.id) : null,
    enabled: !!selectedAgent,
  })

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => adminApi.deleteAgent(agentId),
    onSuccess: () => {
      toast.success('Agent deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['adminAgents'] })
      setShowDeleteModal(false)
      setAgentToDelete(null)
      if (selectedAgent?.id === agentToDelete) {
        setSelectedAgent(null)
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to delete agent: ${error.message}`)
    },
  })

  const handleDeleteAgent = (agentId: string) => {
    setAgentToDelete(agentId)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (agentToDelete) {
      deleteAgentMutation.mutate(agentToDelete)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    refetch()
  }

  const agents = agentsData?.agents || []
  const totalPages = Math.ceil((agentsData?.total || 0) / pageSize)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow h-32`}></div>
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow h-64`}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
        <div className="flex items-center text-red-500">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          <span>Failed to load agents: {(error as Error).message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          AI Agents Management
        </h1>
        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage AI agents across the entire system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Total Agents
              </p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {agentsData?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Active Agents
              </p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {agents.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Unique Users
              </p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {new Set(agents.map(a => a.user_id)).size}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Total Usage
              </p>
              <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {agents.reduce((sum, a) => sum + a.usage_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents, users, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-md ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          {(searchTerm || selectedUserId) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSelectedUserId('')
                setCurrentPage(1)
                refetch()
              }}
              className={`px-4 py-2 border rounded-md transition-colors ${
                isDark 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Agents List */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Agents ({agentsData?.total || 0})
          </h3>
        </div>

        {agents.length === 0 ? (
          <div className="p-6 text-center">
            <SparklesIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              No agents found
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchTerm ? 'Try adjusting your search criteria.' : 'No agents have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {agents.map((agent: Agent) => (
              <div key={agent.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <SparklesIcon className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {agent.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          agent.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {agent.description || 'No description'}
                      </p>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                        User: {agent.user_email} • Model: {agent.model} • Usage: {agent.usage_count}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-2 rounded-md transition-colors ${
                        isDark 
                          ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Delete Agent"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, agentsData?.total || 0)} of {agentsData?.total || 0} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md transition-colors ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : isDark 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : isDark 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Agent Details
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className={`p-2 rounded-md transition-colors ${
                    isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {detailsLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              </div>
            ) : agentDetails ? (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Name
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {agentDetails.name}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          agentDetails.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {agentDetails.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Owner
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {agentDetails.user_name} ({agentDetails.user_email})
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Model
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {agentDetails.model}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Workspace
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {agentDetails.workspace_name}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Created
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(agentDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description & Instructions */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Description & Instructions
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Description
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {agentDetails.description || 'No description provided'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Instructions
                      </label>
                      <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'} whitespace-pre-wrap`}>
                        {agentDetails.instructions || 'No instructions provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Usage Statistics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Conversations
                      </p>
                      <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agentDetails.usage_stats.total_conversations}
                      </p>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Messages
                      </p>
                      <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agentDetails.usage_stats.total_messages}
                      </p>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Avg Response
                      </p>
                      <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agentDetails.usage_stats.avg_response_time_ms}ms
                      </p>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Success Rate
                      </p>
                      <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agentDetails.usage_stats.success_rate}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className={`text-md font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Recent Activity
                  </h4>
                  <div className="space-y-3">
                    {agentDetails.recent_activity.map((activity, index) => (
                      <div key={index} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg`}>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {activity.action}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          {activity.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Failed to load agent details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Delete Agent
                </h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                Are you sure you want to delete this agent? This action cannot be undone and will permanently remove the agent and all its data.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDark
                      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteAgentMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {deleteAgentMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAgents
