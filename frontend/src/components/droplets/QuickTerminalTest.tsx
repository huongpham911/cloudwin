import React, { useState } from 'react';
import RealTimeTerminal from './RealTimeTerminal';

interface QuickTerminalTestProps {
  dropletId: string;
  dropletIP: string;
  onClose: () => void;
}

const QuickTerminalTest: React.FC<QuickTerminalTestProps> = ({ dropletId, dropletIP, onClose }) => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return (
      <RealTimeTerminal
        dropletId={dropletId}
        dropletIP={dropletIP}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">🖥️ Terminal Mode Selection</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Droplet: {dropletId}</h3>
          <p className="text-gray-600">IP: {dropletIP}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowDemo(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            🚀 Test Real-Time SSH Terminal
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            ❌ Cancel
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p><strong>Real-Time Terminal features:</strong></p>
          <ul className="list-disc ml-5 mt-2">
            <li>Live SSH connection via WebSocket</li>
            <li>Real command execution</li>
            <li>Live output streaming</li>
            <li>Full Linux command support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuickTerminalTest;
