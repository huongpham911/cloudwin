import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import SnapshotManager from './SnapshotManager'

interface DropletDetailTabsProps {
  droplet: any
  activeTab: string
  backups?: any
  neighbors?: any
}

const DropletDetailTabs: React.FC<DropletDetailTabsProps> = ({ 
  droplet, 
  activeTab, 
  backups, 
  neighbors 
}) => {
  const { isDark } = useTheme()
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'WinCloud Terminal v1.0 - Live SSH Console',
    `Connected to: ${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`,
    'Status: Ready for commands',
    ''
  ])
  const [currentCommand, setCurrentCommand] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Auto scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalHistory])

  // Focus terminal input when access tab is active
  useEffect(() => {
    if (activeTab === 'access') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeTab])

  // Execute real command via API
  const executeCommand = async (cmd: string) => {
    const command = cmd.trim()
    if (!command) return

    // Add command to history
    setTerminalHistory(prev => [...prev, `root@${droplet.name}:~$ ${command}`])
    setIsTyping(true)

    try {
      // Call backend API to execute SSH command
      const response = await fetch(`http://localhost:5000/api/v1/droplets/${droplet.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command,
          droplet_ip: droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('SSH API Response:', data)

      // Handle special commands
      if (command.toLowerCase() === 'clear') {
        setTerminalHistory([
          '🖥️ WinCloud Terminal v1.0 - Real SSH Console',
          `🔗 Connected to: ${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`,
          '✅ Status: Live SSH Connection Active',
          '💡 Type commands to execute on your droplet',
          ''
        ])
        setIsTyping(false)
        setCurrentCommand('')
        return
      }

      // Display real SSH response
      if (data.success) {
        const output = data.output || 'Command executed successfully'
        const error = data.error || ''

        setTerminalHistory(prev => [
          ...prev,
          output,
          error ? `❌ Error: ${error}` : '',
          ''
        ])
      } else {
        setTerminalHistory(prev => [
          ...prev,
          `❌ SSH Error: ${data.error || 'Command failed'}`,
          '💡 Ensure SSH keys are configured and droplet is accessible',
          ''
        ])
      }
      
    } catch (error) {
      console.error('Command execution error:', error)

      setTerminalHistory(prev => [
        ...prev,
        `❌ Connection Error: ${error.message}`,
        '🔧 Backend API not reachable. Check if backend is running on localhost:5000',
        '💡 Try: npm run backend or python run_minimal_real_api.py',
        ''
      ])
    }

    setIsTyping(false)
    setCurrentCommand('')
    
    // Focus input again
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand)
    } else if (e.key === 'ArrowUp') {
      // Command history navigation could be added here
      e.preventDefault()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'new':
      case 'creating':
        return 'bg-yellow-100 text-yellow-800'
      case 'off':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  if (activeTab === 'overview') {
    return (
      <>
        {/* Real Droplet Information */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              🔗 Live DigitalOcean Data
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Droplet ID
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.id}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.id)}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(droplet.status)}`}>
                      {droplet.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Public IPv4
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}
                      readOnly
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || '')}
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-white hover:bg-blue-700 hover:text-blue-100' : 'bg-gray-50 hover:bg-blue-100 hover:text-blue-800'}`}
                      title="Click để copy Public IP"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Private IPv4
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || 'N/A'}
                      readOnly
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || '')}
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-white hover:bg-green-700 hover:text-green-100' : 'bg-gray-50 hover:bg-green-100 hover:text-green-800'}`}
                      title="Click để copy Private IP"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    vCPUs
                  </label>
                  <div className="mt-1">
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {droplet.vcpus || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Memory
                  </label>
                  <div className="mt-1">
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {droplet.memory ? `${droplet.memory} MB` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Disk
                  </label>
                  <div className="mt-1">
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {droplet.disk ? `${droplet.disk} GB` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Created At
                  </label>
                  <div className="mt-1">
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(droplet.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Networks Details */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              🌐 Network Interfaces
            </h3>
            <div className="space-y-3">
              {droplet.networks?.v4?.map((network: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {network.type === 'public' ? '🌍 Public' : '🔒 Private'} IPv4
                    </span>
                    <span 
                      className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors duration-200 ${
                        network.type === 'public' 
                          ? isDark ? 'text-white hover:bg-blue-700 hover:text-blue-100' : 'text-gray-900 hover:bg-blue-100 hover:text-blue-800'
                          : isDark ? 'text-white hover:bg-green-700 hover:text-green-100' : 'text-gray-900 hover:bg-green-100 hover:text-green-800'
                      }`}
                      onClick={() => copyToClipboard(network.ip_address)}
                      title="📋 Click để copy IP address"
                    >
                      📍 {network.ip_address}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Netmask: {network.netmask}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Gateway: {network.gateway}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (activeTab === 'access') {
    return (
      <>
        {/* SSH Connection */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              🔑 SSH Connection
            </h3>
            
            <div className="space-y-4">
              {/* SSH Command */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  SSH Command
                </label>
                <div className="mt-1 flex">
                  <input
                    type="text"
                    value={`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}`}
                    readOnly
                    className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono ${isDark ? 'bg-gray-900 text-green-400 border-gray-600' : 'bg-gray-900 text-green-400'} hover:bg-gray-800 transition-colors cursor-pointer`}
                    onClick={() => copyToClipboard(`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || ''}`)}
                    title="Click để copy SSH command"
                  />
                  <button
                    onClick={() => copyToClipboard(`ssh root@${droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || ''}`)}
                    className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Network Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Public IPv4
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || 'N/A'}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-blue-400 hover:bg-blue-700 hover:text-blue-100' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || '')}
                      title="Click để copy Public IP"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Private IPv4
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || 'N/A'}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-green-400 hover:bg-green-700 hover:text-green-100' : 'bg-green-50 text-green-800 hover:bg-green-100'}`}
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || '')}
                      title="Click để copy Private IP"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'private')?.ip_address || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Netmask
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'public')?.netmask || 'N/A'}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-blue-400 hover:bg-blue-700 hover:text-blue-100' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.netmask || '')}
                      title="Click để copy Netmask"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.netmask || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gateway
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v4?.find((net: any) => net.type === 'public')?.gateway || 'N/A'}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-blue-400 hover:bg-blue-700 hover:text-blue-100' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.gateway || '')}
                      title="Click để copy Gateway"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v4?.find((net: any) => net.type === 'public')?.gateway || '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    IPv6 Addresses
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={droplet.networks?.v6?.length > 0 ? droplet.networks.v6[0].ip_address : 'N/A'}
                      readOnly
                      className={`flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm cursor-pointer transition-colors duration-200 ${isDark ? 'bg-gray-700 text-purple-400 hover:bg-purple-700 hover:text-purple-100' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'}`}
                      onClick={() => copyToClipboard(droplet.networks?.v6?.length > 0 ? droplet.networks.v6[0].ip_address : '')}
                      title="Click để copy IPv6"
                    />
                    <button
                      onClick={() => copyToClipboard(droplet.networks?.v6?.length > 0 ? droplet.networks.v6[0].ip_address : '')}
                      className={`inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WinCloud Terminal Console */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🖥️ WinCloud Terminal
              </h3>
              <span className="ml-3 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                Live Console
              </span>
              <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                Interactive
              </span>
              <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                Real SSH
              </span>
            </div>
            
            {/* Terminal Container */}
            <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg border-2 ${isDark ? 'border-gray-700' : 'border-gray-200'} min-h-[500px] max-h-[600px] overflow-hidden flex flex-col`}>
              {/* Terminal Header */}
              <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-200'} px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  root@{droplet.name} - WinCloud Terminal
                </div>
              </div>

              {/* Terminal Content */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                <div className={`${isDark ? 'text-green-400' : 'text-green-600'} space-y-1`}>
                  {terminalHistory.map((line, index) => (
                    <div key={index} className={line.startsWith('root@') ? 'text-white' : ''}>
                      {line}
                    </div>
                  ))}
                  
                  {/* Current command line */}
                  <div className="flex items-center">
                    <span className={`${isDark ? 'text-green-400' : 'text-green-600'} mr-2`}>
                      root@{droplet.name}:~$
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isTyping}
                      className={`flex-1 bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'} ${isTyping ? 'opacity-50' : ''}`}
                      placeholder={isTyping ? 'Processing...' : 'Type a command...'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {isTyping && (
                      <span className={`ml-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'} animate-pulse`}>
                        ⏳
                      </span>
                    )}
                  </div>
                  
                  <div ref={terminalEndRef} />
                </div>
              </div>

              {/* Terminal Footer */}
              <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-200'} px-4 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'} text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    Connected to {droplet.networks?.v4?.find((net: any) => net.type === 'public')?.ip_address} | Status: {droplet.status}
                  </div>
                  <div className="flex space-x-4">
                    <span>💡 Type 'help' for available commands</span>
                    <span>⌨️ Press Enter to execute</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (activeTab === 'snapshots') {
    return (
      <SnapshotManager 
        dropletId={droplet.id?.toString()} 
        dropletName={droplet.name}
        onSnapshotCreated={() => {
          // You can add refresh logic here if needed
          toast.success('Snapshot creation initiated')
        }}
      />
    )
  }

  if (activeTab === 'backups') {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        <div className="px-4 py-5 sm:p-6">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            💾 Backups
          </h3>
          {backups?.backups?.length > 0 ? (
            <div className="space-y-3">
              {backups.backups.map((backup: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {backup.name}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {backup.size_gigabytes} GB
                    </span>
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Created: {new Date(backup.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No backups found for this droplet. Enable backups in settings.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (activeTab === 'networking') {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        <div className="px-4 py-5 sm:p-6">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            🌐 Networking & Neighbors
          </h3>
          
          {/* Droplet Neighbors */}
          <div className="mb-6">
            <h4 className={`text-md font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
              Droplet Neighbors (Same Physical Hardware)
            </h4>
            {neighbors?.neighbors?.length > 0 ? (
              <div className="space-y-2">
                {neighbors.neighbors.map((neighbor: any, index: number) => (
                  <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {neighbor.name}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {neighbor.status}
                      </span>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                      ID: {neighbor.id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No neighboring droplets on the same physical hardware.
              </p>
            )}
          </div>

          {/* Firewall Rules */}
          <div>
            <h4 className={`text-md font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
              🔥 Firewall & Security
            </h4>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Firewall configuration is managed through DigitalOcean Cloud Firewalls.
                Check your DigitalOcean dashboard for detailed firewall rules.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'graphs') {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        <div className="px-4 py-5 sm:p-6">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            📊 Performance Metrics
          </h3>
          <div className={`p-8 text-center rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              📈 Performance graphs and monitoring metrics will be displayed here.
              <br />
              This would typically show CPU, Memory, Disk I/O, and Network usage over time.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'kernel') {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        <div className="px-4 py-5 sm:p-6">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            🖥️ Kernel Information
          </h3>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current Kernel
                </label>
                <div className="mt-1">
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {droplet.kernel?.name || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kernel Version
                </label>
                <div className="mt-1">
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {droplet.kernel?.version || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'recovery') {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
        <div className="px-4 py-5 sm:p-6">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            🛡️ Recovery Console
          </h3>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3`}>
              Recovery console allows you to boot into a rescue environment to troubleshoot issues.
            </p>
            <button 
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${isDark ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-white bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              onClick={() => toast.success('Recovery console would be accessible through DigitalOcean API')}
            >
              Enable Recovery Console
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default DropletDetailTabs 