import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WebTerminal from '../droplets/WebTerminal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const TerminalPage: React.FC = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const dropletId = searchParams.get('droplet') || '';
  const dropletIP = searchParams.get('ip') || '';

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleClose}
                className={`inline-flex items-center px-3 py-2 border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Droplet
              </button>
              <div>
                <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  🖥️ WinCloud Terminal
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Droplet {dropletId} {dropletIP && `• ${dropletIP}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
          <WebTerminal 
            dropletId={dropletId}
            dropletIP={dropletIP}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
};

export default TerminalPage;
