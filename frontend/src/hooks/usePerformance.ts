/**
 * Performance optimization utilities for React components
 */
import { useMemo, useCallback, useState, useEffect } from 'react'

/**
 * Hook to debounce a value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

/**
 * Hook to memoize expensive calculations
 */
export const useMemoizedValue = <T>(factory: () => T, deps: React.DependencyList): T => {
    return useMemo(factory, deps)
}

/**
 * Hook to create stable callback functions
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
    return useCallback(callback, [callback])
}

/**
 * Hook to prevent unnecessary re-renders
 */
export const useShallowMemo = <T extends object>(obj: T): T => {
    return useMemo(() => obj, Object.values(obj))
}
