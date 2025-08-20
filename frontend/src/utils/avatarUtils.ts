/**
 * Avatar utilities for user profile images
 */

export interface User {
  id?: string
  email?: string
  username?: string
  full_name?: string
  display_name?: string
  avatar_url?: string | null
}

/**
 * Generate a default avatar URL using DiceBear API
 */
export const generateDefaultAvatar = (user: User): string => {
  const seed = user.email || user.username || user.id || 'default'
  
  // Use DiceBear API for consistent avatars
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,8b5cf6,06b6d4,10b981,f59e0b,ef4444&textColor=ffffff`
}

/**
 * Generate initials from user data
 */
export const getUserInitials = (user: User): string => {
  if (user.full_name) {
    const names = user.full_name.trim().split(' ')
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
    }
    return names[0].charAt(0).toUpperCase()
  }
  
  if (user.display_name) {
    return user.display_name.charAt(0).toUpperCase()
  }
  
  if (user.username) {
    return user.username.charAt(0).toUpperCase()
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase()
  }
  
  return 'W' // WinCloud default
}

/**
 * Get user display name
 */
export const getUserDisplayName = (user: User): string => {
  return user.full_name || user.display_name || user.username || user.email || 'User'
}

/**
 * Get avatar URL with fallback
 */
export const getAvatarUrl = (user: User): string => {
  if (user.avatar_url && user.avatar_url.trim() !== '') {
    return user.avatar_url
  }
  
  return generateDefaultAvatar(user)
}

/**
 * Check if avatar URL is valid
 */
export const isValidAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === '') return false
  
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get gradient background for initials
 */
export const getGradientBackground = (user: User): string => {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-purple-500 to-pink-600', 
    'from-green-500 to-blue-600',
    'from-yellow-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-purple-600',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600'
  ]
  
  // Use email or username to consistently pick same gradient
  const seed = user.email || user.username || user.id || 'default'
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length
  
  return gradients[index]
}
