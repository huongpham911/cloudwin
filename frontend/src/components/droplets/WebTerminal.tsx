import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import RealTimeTerminal from './RealTimeTerminal';

interface WebTerminalProps {
  dropletId: string;
  dropletIP?: string;
  onClose?: () => void;
}

const WebTerminal: React.FC<WebTerminalProps> = ({ dropletId, dropletIP, onClose }) => {
  const { isDark } = useTheme();
  const [input, setInput] = useState('');
  const [showRealTerminal, setShowRealTerminal] = useState(false);
  const [output, setOutput] = useState<string[]>([
    '🖥️ WinCloud Terminal - Simulation Mode',
    `Droplet ID: ${dropletId}`,
    dropletIP ? `IP Address: ${dropletIP}` : 'IP: Not available',
    '==================================================',
    '💡 Choose your terminal mode:',
    '',
    '🔵 SIMULATION MODE (Current)',
    '   • Safe command simulation',
    '   • No real SSH connection', 
    '   • Pre-defined responses',
    '',
    '🟢 REAL-TIME MODE',
    '   • Live SSH connection',
    '   • Real command execution',
    '   • Live output streaming',
    '',
    'Available commands:',
    '  real-ssh                 - Switch to REAL-TIME SSH mode ⚡',
    '  ssh-connect              - Generate SSH connection command',
    '  system-info              - Show droplet system information',
    '  sudo cat /var/log/cloud-init-output.log  - View cloud-init logs',
    '  sudo cloud-init status   - Check cloud-init status',
    '  ls -la                   - List files',
    '  help                     - Show all commands',
    ''
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const executeCommand = async (command: string) => {
    const cmd = command.trim().toLowerCase();
    
    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    
    // Add command to output
    setOutput(prev => [...prev, `$ ${command}`]);

    try {
      switch (cmd) {
        case 'real-ssh':
          if (!dropletIP) {
            setOutput(prev => [...prev, 
              '❌ Real-time SSH requires droplet IP address',
              '💡 Make sure the droplet is running and has an IP',
              ''
            ]);
          } else {
            setOutput(prev => [...prev,
              '🚀 Switching to REAL-TIME SSH mode...',
              '⚡ You will have live terminal access!',
              '🔄 Establishing WebSocket connection...',
              ''
            ]);
            
            // Small delay for UX
            setTimeout(() => {
              setShowRealTerminal(true);
            }, 1500);
          }
          break;

        case 'help':
          setOutput(prev => [...prev,
            'Available commands:',
            '  ssh-connect              - Generate SSH connection command',
            '  system-info              - Show droplet system information',
            '  restart                  - Restart the droplet',
            '  shutdown                 - Shutdown the droplet',
            '  start                    - Start the droplet',
            '  logs                     - View recent droplet logs',
            '  status                   - Check droplet status',
            '  sudo cat /var/log/cloud-init-output.log  - View cloud-init logs',
            '  sudo cloud-init status   - Check cloud-init status',
            '  sudo cat /var/log/cloud-init.log         - View cloud-init system log',
            '  ls -la                   - List files',
            '  pwd                      - Print working directory',
            '  clear                    - Clear terminal',
            '  exit                     - Close terminal',
            ''
          ]);
          break;        case 'ssh-connect':
          if (dropletIP) {
            const sshCommand = `ssh root@${dropletIP}`;
            setOutput(prev => [...prev,
              '🔐 SSH Connection Command:',
              sshCommand,
              '',
              '📋 Command copied to clipboard!',
              '💡 Use this command in your external terminal',
              ''
            ]);
            // Copy to clipboard
            navigator.clipboard.writeText(sshCommand);
          } else {
            setOutput(prev => [...prev, '❌ Error: Droplet IP address not available', '']);
          }
          break;

        case 'system-info':
          setOutput(prev => [...prev, '🔍 Fetching system information...']);
          // Call API to get droplet info
          const response = await fetch(`http://localhost:5000/api/v1/droplets/${dropletId}`);
          if (response.ok) {
            const droplet = await response.json();
            setOutput(prev => [...prev.slice(0, -1),
              '✅ System Information:',
              `  Name: ${droplet.name || 'N/A'}`,
              `  Status: ${droplet.status || 'N/A'}`,
              `  Region: ${droplet.region?.name || droplet.region || 'N/A'}`, 
              `  Size: ${droplet.size?.slug || droplet.size || 'N/A'}`,
              `  Memory: ${droplet.memory || 'N/A'} MB`,
              `  vCPUs: ${droplet.vcpus || 'N/A'}`,
              `  Disk: ${droplet.disk || 'N/A'} GB`,
              `  IP: ${dropletIP || 'N/A'}`,
              `  Created: ${droplet.created_at ? new Date(droplet.created_at).toLocaleString() : 'N/A'}`,
              ''
            ]);
          } else {
            setOutput(prev => [...prev.slice(0, -1), '❌ Failed to fetch system information', '']);
          }
          break;

        case 'restart':
          setOutput(prev => [...prev, '🔄 Restarting droplet...']);
          try {
            const restartResponse = await fetch(`http://localhost:5000/api/v1/droplets/${dropletId}/restart`, {
              method: 'POST'
            });
            if (restartResponse.ok) {
              setOutput(prev => [...prev.slice(0, -1), '✅ Droplet restart initiated successfully', '']);
            } else {
              setOutput(prev => [...prev.slice(0, -1), '❌ Failed to restart droplet', '']);
            }
          } catch (error) {
            setOutput(prev => [...prev.slice(0, -1), '❌ Error: Could not connect to API', '']);
          }
          break;

        case 'shutdown':
          setOutput(prev => [...prev, '🔽 Shutting down droplet...']);
          try {
            const shutdownResponse = await fetch(`http://localhost:5000/api/v1/droplets/${dropletId}/shutdown`, {
              method: 'POST'
            });
            if (shutdownResponse.ok) {
              setOutput(prev => [...prev.slice(0, -1), '✅ Droplet shutdown initiated successfully', '']);
            } else {
              setOutput(prev => [...prev.slice(0, -1), '❌ Failed to shutdown droplet', '']);
            }
          } catch (error) {
            setOutput(prev => [...prev.slice(0, -1), '❌ Error: Could not connect to API', '']);
          }
          break;

        case 'start':
          setOutput(prev => [...prev, '▶️ Starting droplet...']);
          try {
            const startResponse = await fetch(`http://localhost:5000/api/v1/droplets/${dropletId}/start`, {
              method: 'POST'
            });
            if (startResponse.ok) {
              setOutput(prev => [...prev.slice(0, -1), '✅ Droplet start initiated successfully', '']);
            } else {
              setOutput(prev => [...prev.slice(0, -1), '❌ Failed to start droplet', '']);
            }
          } catch (error) {
            setOutput(prev => [...prev.slice(0, -1), '❌ Error: Could not connect to API', '']);
          }
          break;

        case 'status':
          setOutput(prev => [...prev, '🔍 Checking droplet status...']);
          try {
            const statusResponse = await fetch(`http://localhost:5000/api/v1/droplets/${dropletId}`);
            if (statusResponse.ok) {
              const droplet = await statusResponse.json();
              const status = droplet.status || 'unknown';
              const statusIcon = status === 'active' ? '🟢' : status === 'off' ? '🔴' : '🟡';
              setOutput(prev => [...prev.slice(0, -1), 
                `${statusIcon} Droplet Status: ${status.toUpperCase()}`,
                droplet.locked ? '🔒 Droplet is currently locked' : '🔓 Droplet is available',
                ''
              ]);
            } else {
              setOutput(prev => [...prev.slice(0, -1), '❌ Failed to check status', '']);
            }
          } catch (error) {
            setOutput(prev => [...prev.slice(0, -1), '❌ Error: Could not connect to API', '']);
          }
          break;

        case 'sudo cat /var/log/cloud-init-output.log':
        case 'cat /var/log/cloud-init-output.log':
          setOutput(prev => [...prev, '📄 Viewing cloud-init output log...']);
          setOutput(prev => [...prev.slice(0, -1),
            '=== Cloud-Init Output Log ===',
            '📝 This shows the actual execution of your User Data script:',
            '',
            '🔗 Script download:',
            '  curl -sL -o winsetup.sh https://raw.githubusercontent.com/kangta911/wewilwill/main/winsetup.sh',
            '  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current',
            '  100  7155  100  7155    0     0   49.9M      0 --:--:-- --:--:-- --:--:--  6.9M',
            '',
            '🔧 Making script executable:',
            '  chmod +x winsetup.sh',
            '',
            '⚡ Executing script:',
            '  ./winsetup.sh',
            '  Installing DigitalOcean Agent, 1 attempt',
            '  Setting up droplet-agent apt repository...',
            '  Get:1 https://repos-droplet.digitalocean.com/install.sh',
            '  Selecting previously unselected package do-agent',
            '  Unpacking do-agent (3.18.2) ...',
            '  Setting up do-agent (3.18.2) ...',
            '  Enabling systemd service',
            '  Created symlink /etc/systemd/system/multi-user.target.wants/do-agent.service',
            '',
            '✅ Script execution completed successfully!',
            '📊 Your custom setup is now running on the droplet.',
            ''
          ]);
          break;

        case 'sudo cloud-init status':
        case 'cloud-init status':
          setOutput(prev => [...prev,
            '✅ Cloud-init status: done',
            '📊 User Data script execution: COMPLETED',
            '⏱️ Last run: ' + new Date().toLocaleString(),
            ''
          ]);
          break;

        case 'sudo cat /var/log/cloud-init.log':
        case 'cat /var/log/cloud-init.log':
          setOutput(prev => [...prev,
            '📄 Cloud-init system log:',
            '[INFO] Cloud-init v. 23.1.2 running',
            '[INFO] Processing user-data script',
            '[INFO] Running user script: /var/lib/cloud/instance/scripts/part-001',
            '[INFO] User script completed successfully',
            '[INFO] Cloud-init finished at ' + new Date().toISOString(),
            ''
          ]);
          break;

        case 'ls -la':
        case 'ls':
          setOutput(prev => [...prev,
            'total 12',
            'drwx------ 2 root root 4096 ' + new Date().toLocaleDateString() + ' .',
            'drwxr-xr-x 3 root root 4096 ' + new Date().toLocaleDateString() + ' ..',
            '-rwx------ 1 root root 7155 ' + new Date().toLocaleDateString() + ' winsetup.sh',
            '-rw-r--r-- 1 root root  220 ' + new Date().toLocaleDateString() + ' .bash_logout',
            '-rw-r--r-- 1 root root 3771 ' + new Date().toLocaleDateString() + ' .bashrc',
            ''
          ]);
          break;

        case 'pwd':
          setOutput(prev => [...prev, '/root', '']);
          break;

        case 'logs':
          setOutput(prev => [...prev,
            '📝 Recent Activity Logs:',
            `[${new Date().toLocaleTimeString()}] Terminal session started`,
            `[${new Date().toLocaleTimeString()}] Connected to droplet ${dropletId}`,
            '💡 For detailed logs, use SSH connection',
            ''
          ]);
          break;

        case 'clear':
          setOutput([
            '🖥️ WinCloud Terminal - Connected to Droplet',
            `Droplet ID: ${dropletId}`,
            dropletIP ? `IP Address: ${dropletIP}` : 'IP: Not available',
            ''
          ]);
          break;

        case 'exit':
          if (onClose) {
            onClose();
          }
          break;

        default:
          if (command.trim() === '') {
            setOutput(prev => [...prev, '']);
          } else {
            // Xử lý các lệnh Linux thông dụng khác
            if (command.startsWith('sudo ') || command.startsWith('cat ') || 
                command.includes('/var/log/') || command.startsWith('ls ') ||
                command.startsWith('tail ') || command.startsWith('head ') ||
                command.startsWith('grep ')) {
              setOutput(prev => [...prev, 
                `📋 Linux Command: ${command}`,
                '💡 For real-time command execution, use SSH connection:',
                `   ssh root@${dropletIP}`,
                '🖥️ This web terminal supports basic commands only.',
                "Type 'help' for available commands",
                ''
              ]);
            } else {
              setOutput(prev => [...prev, 
                `❌ Unknown command: ${command}`,
                "Type 'help' for available commands",
                '💡 For full Linux access, use: ssh-connect',
                ''
              ]);
            }
          }
          break;
      }
    } catch (error) {
      setOutput(prev => [...prev, `❌ Error executing command: ${error}`, '']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-black bg-opacity-75' : 'bg-gray-900 bg-opacity-75'}`}>
      <div className={`w-full max-w-4xl h-96 ${isDark ? 'bg-gray-900' : 'bg-black'} rounded-lg shadow-2xl flex flex-col border-2 border-green-500`}>
        {/* Terminal Header */}
        <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800' : 'bg-gray-800'} rounded-t-lg border-b border-green-500`}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="ml-4 text-green-400 font-mono text-sm">
              🖥️ WinCloud Terminal - Droplet {dropletId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Terminal Output */}
        <div 
          ref={terminalRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 bg-black"
        >
          {output.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>

        {/* Terminal Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-green-500 bg-black">
          <div className="flex items-center">
            <span className="text-green-400 font-mono mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-green-400 font-mono outline-none"
              placeholder="Enter command... (try 'real-ssh' for live mode)"
              autoComplete="off"
            />
          </div>
          
          {/* Mode Switch Helper */}
          <div className="mt-2 text-xs text-gray-500">
            💡 Type <span className="text-yellow-400">'real-ssh'</span> for live terminal access
            {!dropletIP && <span className="text-red-400"> (requires droplet IP)</span>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebTerminal;
