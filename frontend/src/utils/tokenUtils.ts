/**
 * Utility functions for token handling
 */

/**
 * Mask token for security display
 * Shows first 8 characters and last 4 characters, masks the middle
 * @param token - The token to mask
 * @returns Masked token string
 */
export const maskToken = (token: string): string => {
    if (!token || token.length < 12) return token

    // Show first 8 characters and last 4 characters, mask the middle
    const start = token.substring(0, 8)
    const end = token.substring(token.length - 4)
    const middle = '*'.repeat(Math.min(token.length - 12, 20)) // Limit mask length

    return `${start}${middle}${end}`
}

/**
 * Validate DigitalOcean token format
 * @param token - The token to validate
 * @returns True if token format is valid
 */
export const isValidDOTokenFormat = (token: string): boolean => {
    if (!token) return false

    // DigitalOcean tokens start with 'dop_v1_' and are 64 characters long
    return token.startsWith('dop_v1_') && token.length === 64
}

/**
 * Get token display name based on index
 * @param index - Token index
 * @returns Display name for the token
 */
export const getTokenDisplayName = (index: number): string => {
    return `Account ${index + 1}`
}
