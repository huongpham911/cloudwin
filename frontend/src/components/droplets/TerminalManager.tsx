import React, { useState } from 'react';
import WebTerminal from './WebTerminal';
import RealTimeTerminal from './RealTimeTerminal';

interface TerminalManagerProps {
  dropletId: string;
  dropletIP?: string;
  onClose: () => void;
}

const TerminalManager: React.FC<TerminalManagerProps> = ({ dropletId, dropletIP, onClose }) => {
  const [terminalMode, setTerminalMode] = useState<'simulation' | 'realtime'>('simulation');

  const handleModeSwitch = () => {
    if (!dropletIP) {
      alert('❌ Real-time SSH requires droplet IP address');
      return;
    }
    setTerminalMode('realtime');
  };

  const handleBackToSimulation = () => {
    setTerminalMode('simulation');
  };

  if (terminalMode === 'realtime' && dropletIP) {
    return (
      <RealTimeTerminal
        dropletId={dropletId}
        dropletIP={dropletIP}
        onClose={onClose}
      />
    );
  }

  return (
    <WebTerminal
      dropletId={dropletId}
      dropletIP={dropletIP}
      onClose={onClose}
      onModeSwitch={handleModeSwitch}
    />
  );
};

export default TerminalManager;
