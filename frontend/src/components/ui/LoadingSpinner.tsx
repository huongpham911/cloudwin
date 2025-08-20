import React, { memo } from 'react'
import Logo from './Logo'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    message?: string
    className?: string
    color?: 'blue' | 'gray' | 'green' | 'red'
    showLogo?: boolean
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(({
    size = 'md',
    message,
    className = '',
    color = 'blue',
    showLogo = false
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    }

    const colorClasses = {
        blue: 'border-blue-500',
        gray: 'border-gray-500',
        green: 'border-green-500',
        red: 'border-red-500'
    }

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            {showLogo && (
                <div className="mb-6">
                    <Logo size={size} showText={true} />
                </div>
            )}

            <div className={`
                animate-spin rounded-full border-2 border-t-transparent
                ${sizeClasses[size]} ${colorClasses[color]}
            `} />
            {message && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {message}
                </p>
            )}
        </div>
    )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner
