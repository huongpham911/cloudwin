/**
 * Console suppression utilities
 * Suppresses unwanted console warnings in production
 */
import config from '../config/environment'

/**
 * Suppress React DevTools warning in production
 */
export const suppressReactDevToolsWarning = () => {
    if (config.enableConsoleSupression) {
        const originalWarn = console.warn
        console.warn = (...args) => {
            // Skip React DevTools warning
            if (args[0]?.includes?.('Download the React DevTools')) {
                return
            }
            originalWarn.apply(console, args)
        }
    }
}

/**
 * Initialize console suppressions
 */
export const initializeConsoleSuppression = () => {
    suppressReactDevToolsWarning()
}
