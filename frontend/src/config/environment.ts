/**
 * Environment configuration for WinCloud Builder
 * Centralized configuration for all environment variables
 */

interface EnvironmentConfig {
    isDevelopment: boolean
    isProduction: boolean
    apiUrl: string
    enableDebugLogs: boolean
    enableConsoleSupression: boolean
    sessionTimeout: number
    refreshThreshold: number
}

const config: EnvironmentConfig = {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    enableDebugLogs: import.meta.env.DEV,
    enableConsoleSupression: import.meta.env.PROD,
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '30') * 60 * 1000, // 30 minutes default
    refreshThreshold: parseInt(import.meta.env.VITE_REFRESH_THRESHOLD || '5') * 60 * 1000, // 5 minutes default
}

export default config
