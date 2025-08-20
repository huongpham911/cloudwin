import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface RealTimeTerminalProps {
  dropletId: string;
  dropletIP: string;
  onClose: () => void;
}

const RealTimeTerminal: React.FC<RealTimeTerminalProps> = ({ dropletId, dropletIP, onClose }) => {
  const { isDark } = useTheme();
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [bytesReceived, setBytesReceived] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Auto-refresh stats every second for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update "X seconds ago" display
      setLastActivity(prev => prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Focus input
  useEffect(() => {
    if (inputRef.current && isConnected) {
      inputRef.current.focus();
    }
  }, [isConnected]);

  // Initialize WebSocket connection
  useEffect(() => {
    initializeConnection();
    
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [dropletId, dropletIP]);

  const initializeConnection = () => {
    setOutput(['🔄 Connecting to live SSH session...', '']);
    setConnectionStatus('connecting');
    
    try {
      const wsUrl = `ws://localhost:5000/ws/terminal/${dropletId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setOutput(prev => [...prev.slice(0, -1), '🔌 WebSocket connected, establishing SSH...', '']);
        
        // Send initial connection data
        ws.send(JSON.stringify({
          type: 'init',
          droplet_ip: dropletIP
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setOutput(prev => [...prev, '', '🔌 SSH connection closed', '']);
      };

      ws.onerror = (error) => {
        setConnectionStatus('error');
        setOutput(prev => [...prev, '', '❌ Connection error - SSH may not be available', '']);
        console.error('WebSocket error:', error);
      };

      setWebsocket(ws);

    } catch (error) {
      setConnectionStatus('error');
      setOutput(prev => [...prev, '❌ Failed to initialize connection', '']);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        setIsConnected(true);
        setConnectionStatus('connected');
        setOutput(prev => [...prev.slice(0, -1),
          '✅ Connected to live SSH session!',
          `🖥️ Real-Time Terminal - ${dropletIP}`,
          '📡 You can now execute commands in real-time',
          '',
          '💡 Try: sudo cat /var/log/cloud-init-output.log',
          '💡 Try: sudo apt update (to see real-time progress)',
          '',
          'root@droplet:~$ '
        ]);
        break;

      case 'line_output':
        // Handle line-by-line output exactly like DigitalOcean console
        if (data.data !== undefined) {
          setLastActivity(new Date());
          setBytesReceived(prev => prev + data.data.length);
          setOutput(prev => {
            const newOutput = [...prev];

            // Add the complete line and prepare for next line
            newOutput.push(data.data);

            return newOutput;
          });
        }
        break;

      case 'output':
        // Fallback for line-based output
        if (data.data !== undefined) {
          setLastActivity(new Date());
          setBytesReceived(prev => prev + data.data.length);
          setOutput(prev => [...prev, data.data]);
        }
        break;

      case 'command_echo':
        // Echo the command that was sent
        setOutput(prev => [...prev, data.data]);
        break;

      case 'error':
        setOutput(prev => [...prev, data.message, '']);
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendCommand = (command: string) => {
    if (websocket && isConnected) {
      websocket.send(JSON.stringify({
        type: 'command',
        command: command
      }));
    } else {
      setOutput(prev => [...prev, '❌ Not connected to SSH session', '']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      sendCommand(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Ctrl+C
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      sendCommand(''); // Send interrupt signal
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live SSH Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Failed';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-black bg-opacity-75' : 'bg-gray-900 bg-opacity-75'}`}>
      <div className={`h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        
        {/* Terminal Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🖥️ Real-Time Terminal - {dropletIP}
            </h3>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {getStatusText()}
            </span>

            {/* Real-time stats */}
            {isConnected && (
              <div className={`flex items-center space-x-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>📊 {bytesReceived} bytes</span>
                <span>⏱️ {Math.floor((new Date().getTime() - lastActivity.getTime()) / 1000)}s ago</span>
                <div className={`w-2 h-2 rounded-full ${
                  (new Date().getTime() - lastActivity.getTime()) < 2000 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                }`}></div>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className={`flex-1 p-4 overflow-y-auto font-mono text-sm ${
            isDark ? 'bg-black text-green-400' : 'bg-gray-900 text-green-300'
          }`}
          style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
        >
          {output.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>

        {/* Terminal Input */}
        <form onSubmit={handleSubmit} className={`p-4 border-t ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`font-mono text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              root@droplet:~$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              className={`flex-1 px-3 py-2 font-mono text-sm border rounded ${
                isDark 
                  ? 'bg-gray-900 text-green-400 border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={isConnected ? "Enter command..." : "Connecting..."}
            />
            <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className={`px-4 py-2 rounded ${
                isConnected && input.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </div>
          
          {/* Quick Commands */}
          {isConnected && (
            <div className={`mt-2 flex flex-wrap gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <button
                onClick={() => sendCommand('sudo apt update')}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                📦 apt update
              </button>
              <button
                onClick={() => sendCommand('htop')}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                📊 htop
              </button>
              <button
                onClick={() => sendCommand('tail -f /var/log/syslog')}
                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                📋 tail logs
              </button>
              <button
                onClick={() => sendCommand('watch -n 1 "df -h"')}
                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                💾 watch disk
              </button>
            </div>
          )}

          {/* Connection Info */}
          <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isConnected ? (
              <>
                ✅ Live SSH connection to {dropletIP} • Press Ctrl+C for interrupt
              </>
            ) : (
              <>
                🔄 Establishing SSH connection... This may take a moment
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RealTimeTerminal;
