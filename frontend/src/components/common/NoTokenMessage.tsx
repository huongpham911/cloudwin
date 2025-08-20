import React from 'react'
import { ExclamationTriangleIcon, CogIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface NoTokenMessageProps {
  message?: string
  showSettingsLink?: boolean
}

const NoTokenMessage: React.FC<NoTokenMessageProps> = ({ 
  message = "Vui lòng cấu hình DigitalOcean API token để sử dụng tính năng này.",
  showSettingsLink = true 
}) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-yellow-800 mb-2">
        Chưa có DigitalOcean Token
      </h3>
      <p className="text-yellow-700 mb-4">
        {message}
      </p>
      {showSettingsLink && (
        <Link 
          to="/settings" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CogIcon className="h-5 w-5 mr-2" />
          Đi tới Settings
        </Link>
      )}
    </div>
  )
}

export default NoTokenMessage
