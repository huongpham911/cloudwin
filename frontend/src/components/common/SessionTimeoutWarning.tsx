import React from 'react';
import { SessionTimeoutWarningProps } from '../../utils/sessionManager';

/**
 * Session timeout warning component
 */
export function SessionTimeoutWarning({ 
  show, 
  minutesUntilExpiry, 
  onRefresh, 
  onLogout 
}: SessionTimeoutWarningProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Session Expiring Soon
            </h3>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Your session will expire in {minutesUntilExpiry} minute{minutesUntilExpiry !== 1 ? 's' : ''}. 
          Would you like to continue your session?
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onRefresh}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Continue Session
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
