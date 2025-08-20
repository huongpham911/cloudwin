import { Component, ErrorInfo, ReactNode } from 'react'
import Logger from '../utils/logger'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        Logger.error('React Error Boundary caught an error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                                Oops! Something went wrong
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                An unexpected error occurred while rendering this page.
                            </p>
                            {import.meta.env.DEV && this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400">
                                        Error Details (Development Only)
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto">
                                        {this.state.error.stack}
                                    </pre>
                                </details>
                            )}
                            <div className="mt-6 flex space-x-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    Reload Page
                                </button>
                                <button
                                    onClick={() => {
                                        this.setState({ hasError: false, error: undefined })
                                    }}
                                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
