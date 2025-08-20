import React, { useState } from 'react'
import { getUserInitials, getGradientBackground, isValidAvatarUrl, getUserDisplayName } from '../../utils/avatarUtils'

interface User {
  id?: string
  email?: string
  username?: string
  full_name?: string
  display_name?: string
  avatar_url?: string | null
}

interface AvatarProps {
  user: User
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBorder?: boolean
  title?: string
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl'
}

const borderClasses = {
  xs: 'border',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-2',
  xl: 'border-4'
}

const Avatar: React.FC<AvatarProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  showBorder = false,
  title
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const hasValidAvatar = isValidAvatarUrl(user.avatar_url) && !imageError
  const initials = getUserInitials(user)
  const displayName = getUserDisplayName(user)
  const gradientBg = getGradientBackground(user)
  const avatarTitle = title || displayName
  
  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ${className}`
  const borderClass = showBorder ? borderClasses[size] : ''
  
  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }
  
  const handleImageLoad = () => {
    setImageLoading(false)
  }
  
  if (hasValidAvatar) {
    return (
      <div className="relative">
        <img
          className={`${baseClasses} object-cover ${borderClass} ${showBorder ? 'border-blue-400' : ''} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          src={user.avatar_url!}
          alt={displayName}
          title={avatarTitle}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        {imageLoading && (
          <div className={`${baseClasses} bg-gradient-to-br ${gradientBg} absolute inset-0`}>
            <span className="animate-pulse">{initials}</span>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div 
      className={`${baseClasses} bg-gradient-to-br ${gradientBg} ${borderClass} ${showBorder ? 'border-blue-400' : ''}`}
      title={avatarTitle}
    >
      <span>{initials}</span>
    </div>
  )
}

export default Avatar
