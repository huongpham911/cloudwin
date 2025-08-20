import React from 'react'

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
    showText?: boolean
    className?: string
    textColor?: string
}

const Logo: React.FC<LogoProps> = ({
    size = 'md',
    showText = true,
    className = '',
    textColor = 'text-white'
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
        '2xl': 'w-24 h-24',
        '3xl': 'w-32 h-32'
    }

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-xl',
        xl: 'text-2xl',
        '2xl': 'text-3xl',
        '3xl': 'text-4xl'
    }

    return (
        <div className={`flex items-center ${className}`}>
            {/* KANGTA Logo SVG - Recreated based on the image */}
            <div className={`flex-shrink-0 ${sizeClasses[size]}`}>
                <svg
                    viewBox="0 0 200 60"
                    className={sizeClasses[size]}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="kangta-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="50%" stopColor="#A855F7" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                        <linearGradient id="splash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="30%" stopColor="#A855F7" />
                            <stop offset="70%" stopColor="#D946EF" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                    </defs>

                    {/* Splash/burst effect behind text */}
                    <g transform="translate(10, 5)">
                        {/* Main splash shape */}
                        <path
                            d="M15 25 Q25 15, 35 20 Q45 10, 55 25 Q65 15, 75 30 Q85 20, 95 35 Q105 25, 115 40 Q125 30, 135 45 Q145 35, 155 50"
                            stroke="url(#splash-gradient)"
                            strokeWidth="3"
                            fill="none"
                            opacity="0.6"
                        />

                        {/* Additional splash elements */}
                        <circle cx="20" cy="15" r="2" fill="url(#splash-gradient)" opacity="0.8" />
                        <circle cx="40" cy="8" r="1.5" fill="url(#splash-gradient)" opacity="0.6" />
                        <circle cx="60" cy="12" r="1" fill="url(#splash-gradient)" opacity="0.7" />
                        <circle cx="80" cy="6" r="1.5" fill="url(#splash-gradient)" opacity="0.5" />
                        <circle cx="100" cy="10" r="2" fill="url(#splash-gradient)" opacity="0.8" />
                        <circle cx="120" cy="5" r="1" fill="url(#splash-gradient)" opacity="0.6" />

                        {/* Splash lines */}
                        <path d="M25 20 L35 10" stroke="url(#splash-gradient)" strokeWidth="2" opacity="0.4" />
                        <path d="M45 18 L55 8" stroke="url(#splash-gradient)" strokeWidth="2" opacity="0.4" />
                        <path d="M65 22 L75 12" stroke="url(#splash-gradient)" strokeWidth="2" opacity="0.4" />
                        <path d="M85 26 L95 16" stroke="url(#splash-gradient)" strokeWidth="2" opacity="0.4" />
                        <path d="M105 30 L115 20" stroke="url(#splash-gradient)" strokeWidth="2" opacity="0.4" />
                    </g>

                    {/* KANGTA Text */}
                    <text
                        x="20"
                        y="45"
                        fontSize="28"
                        fontFamily="Arial, sans-serif"
                        fontWeight="bold"
                        fill="url(#kangta-gradient)"
                        letterSpacing="1px"
                    >
                        KANGTA
                    </text>
                </svg>
            </div>

            {showText && (
                <div className="ml-3">
                    <h1 className={`font-semibold ${textSizeClasses[size]} ${textColor}`}>
                        WinCloud
                    </h1>
                </div>
            )}
        </div>
    )
}

export default Logo
