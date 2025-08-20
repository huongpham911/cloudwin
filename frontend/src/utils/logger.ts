/**
 * Logger utilities for WinCloud Builder
 * Provides centralized logging with development/production mode awareness
 */
import config from '../config/environment'

class Logger {
    private static isDevelopment = config.isDevelopment

    /**
     * Log info message (only in development)
     */
    static info(message: string, ...args: any[]): void {
        if (this.isDevelopment) {
            console.log(`ℹ️ ${message}`, ...args)
        }
    }

    /**
     * Log warning message (always shown)
     */
    static warn(message: string, ...args: any[]): void {
        console.warn(`⚠️ ${message}`, ...args)
    }

    /**
     * Log error message (always shown)
     */
    static error(message: string, ...args: any[]): void {
        console.error(`❌ ${message}`, ...args)
    }

    /**
     * Log debug message (only in development)
     */
    static debug(message: string, ...args: any[]): void {
        if (this.isDevelopment) {
            console.debug(`🐛 ${message}`, ...args)
        }
    }

    /**
     * Log success message (only in development)
     */
    static success(message: string, ...args: any[]): void {
        if (this.isDevelopment) {
            console.log(`✅ ${message}`, ...args)
        }
    }

    /**
     * Log loading message (only in development)
     */
    static loading(message: string, ...args: any[]): void {
        if (this.isDevelopment) {
            console.log(`🔄 ${message}`, ...args)
        }
    }

    /**
     * Create a performance timer (only in development)
     */
    static time(label: string): void {
        if (this.isDevelopment) {
            console.time(`⏱️ ${label}`)
        }
    }

    /**
     * End a performance timer (only in development)
     */
    static timeEnd(label: string): void {
        if (this.isDevelopment) {
            console.timeEnd(`⏱️ ${label}`)
        }
    }

    /**
     * Group console logs (only in development)
     */
    static group(label: string): void {
        if (this.isDevelopment) {
            console.group(`📁 ${label}`)
        }
    }

    /**
     * End console group (only in development)
     */
    static groupEnd(): void {
        if (this.isDevelopment) {
            console.groupEnd()
        }
    }

    /**
     * Log table data (only in development)
     */
    static table(data: any, columns?: string[]): void {
        if (this.isDevelopment) {
            console.table(data, columns)
        }
    }
}

export default Logger
