import React, { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useWebSocket } from '../../hooks/useWebSocket'

interface BuildProgressProps {
  dropletId: string
  initialProgress?: number
  initialStatus?: string
  initialLogs?: string
}

interface BuildStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  message?: string
  timestamp?: Date
}

const BuildProgress: React.FC<BuildProgressProps> = ({
  dropletId,
  initialProgress = 0,
  initialStatus = 'pending',
  initialLogs = ''
}) => {
  const [progress, setProgress] = useState(initialProgress)
  const [status, setStatus] = useState(initialStatus)
  const [logs, setLogs] = useState<string[]>(initialLogs.split('\n').filter(Boolean))
  const [currentStep, setCurrentStep] = useState('Initializing...')
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [startTime] = useState(new Date())
  
  const { lastMessage, isConnected } = useWebSocket()

  // Build steps configuration
  const buildSteps: BuildStep[] = [
    { name: 'Creating Droplet', status: 'pending', progress: 0 },
    { name: 'Installing QEMU/KVM', status: 'pending', progress: 10 },
    { name: 'Downloading Windows ISO', status: 'pending', progress: 25 },
    { name: 'Preparing Installation', status: 'pending', progress: 40 },
    { name: 'Installing Windows', status: 'pending', progress: 60 },
    { name: 'Configuring System', status: 'pending', progress: 80 },
    { name: 'Enabling RDP', status: 'pending', progress: 95 },
    { name: 'Build Complete', status: 'pending', progress: 100 }
  ]

  const [steps, setSteps] = useState(buildSteps)

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage || lastMessage.data.droplet_id !== dropletId) return

    if (lastMessage.type === 'build_progress') {
      const { progress: newProgress, status: newStatus, message } = lastMessage.data
      
      setProgress(newProgress)
      setStatus(newStatus)
      
      if (message) {
        setCurrentStep(message)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
      }

      // Update steps based on progress
      setSteps(prev => prev.map(step => {
        if (newProgress >= step.progress) {
          return { ...step, status: 'completed' as const }
        } else if (newProgress >= step.progress - 15) {
          return { ...step, status: 'running' as const }
        }
        return step
      }))

      // Calculate estimated time
      if (newProgress > 0 && newProgress < 100) {
        const elapsed = (new Date().getTime() - startTime.getTime()) / 1000 / 60 // minutes
        const estimated = (elapsed / newProgress) * (100 - newProgress)
        setEstimatedTime(Math.ceil(estimated))
      }
    }
  }, [lastMessage, dropletId, startTime])

  const getStatusIcon = (stepStatus: BuildStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'running':
        return <PlayIcon className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'building':
        return 'bg-blue-500'
      case 'completed':
      case 'active':
        return 'bg-green-500'
      case 'error':
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Build Progress
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentStep}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {estimatedTime && status === 'building' && (
              <div className="text-sm text-gray-600">
                ~{estimatedTime} min remaining
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm text-gray-600">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getStatusColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Build Steps */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900">Build Steps</h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'running' ? 'text-blue-700' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {step.progress}%
                    </span>
                  </div>
                  {step.status === 'running' && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                      <div className="bg-blue-500 h-1 rounded-full animate-pulse w-1/2" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Build Logs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Build Logs</h4>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear logs
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-green-400">
                    {log}
                  </div>
                ))
              )}
              {status === 'building' && (
                <div className="text-blue-400 animate-pulse">
                  ▋ Building...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuildProgress