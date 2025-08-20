import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface TokenInfo {
    id: number;
    name: string;
    masked_token: string;
    status: 'valid' | 'invalid';
    token?: string;
    fingerprint?: string;
    usage_count?: number;
    last_used?: string;
}

interface UseTokensReturn {
    tokens: TokenInfo[];
    loading: boolean;
    error: string | null;
    addToken: (token: string, name?: string) => Promise<void>;
    removeToken: (id: number) => Promise<void>;
    refreshTokens: () => Promise<void>;
    syncWithBackend: () => Promise<void>;
}

/**
 * Hook to manage DigitalOcean tokens with automatic sync between Settings and CreateVPS
 */
export const useTokens = (): UseTokensReturn => {
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load tokens from secure backend endpoint
    const loadTokens = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Use secure endpoint with cache busting
            const timestamp = Date.now();
            const response = await api.get(`/api/v1/settings/tokens/secure?t=${timestamp}`);

            if (response.data?.tokens && response.data.tokens.length > 0) {
                // Transform secure tokens to frontend format
                const transformedTokens: TokenInfo[] = response.data.tokens.map((tokenData: any, index: number) => ({
                    id: index,
                    name: tokenData.name || `Account ${index + 1}`,
                    masked_token: `***...${tokenData.fingerprint?.slice(-8) || 'encrypted'}`,
                    status: tokenData.is_valid !== false ? 'valid' : 'invalid',
                    token: '***ENCRYPTED***', // Don't expose actual token
                    fingerprint: tokenData.fingerprint,
                    usage_count: tokenData.usage_count || 0,
                    last_used: tokenData.last_used
                }));

                setTokens(transformedTokens);
            } else {
                // No tokens found in secure storage
                setTokens([]);
            }
        } catch (err: any) {
            console.error('❌ Failed to load secure tokens:', err);
            setError(err.response?.data?.message || 'Failed to load tokens');

            // No fallback tokens - show empty state to encourage proper token setup
            setTokens([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Add new token using secure endpoint
    const addToken = useCallback(async (token: string, name?: string) => {
        try {
            setLoading(true);
            setError(null);

            // Validate token format
            if (!token.startsWith('dop_v1_')) {
                throw new Error('Invalid DigitalOcean token format');
            }

            // Prepare token for secure transmission
            const tokenData = {
                encrypted_token: token.trim(), // Backend will handle encryption
                name: name || `Account ${tokens.length + 1}`,
                client_encrypted: false
            };

            const response = await api.post('/api/v1/settings/tokens/secure', {
                encrypted_tokens: [tokenData]
            });

            if (response.data?.success) {
                // Reload tokens to get updated list
                await loadTokens();
            } else {
                throw new Error(response.data?.message || 'Failed to add token');
            }
        } catch (err: any) {
            console.error('❌ Failed to add token:', err);
            setError(err.response?.data?.message || err.message || 'Failed to add token');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [tokens.length, loadTokens]);

    // Remove token using secure endpoint
    const removeToken = useCallback(async (id: number) => {
        try {
            setLoading(true);
            setError(null);

            // Find token by id to get fingerprint
            const tokenToRemove = tokens.find(t => t.id === id);
            if (!tokenToRemove || !tokenToRemove.fingerprint) {
                throw new Error('Token fingerprint not found');
            }

            const response = await api.delete(`/api/v1/settings/tokens/secure/${tokenToRemove.fingerprint}`);

            if (response.data?.success) {
                // Reload tokens to get updated list
                await loadTokens();
            } else {
                throw new Error(response.data?.message || 'Failed to remove token');
            }
        } catch (err: any) {
            console.error('❌ Failed to remove token:', err);
            setError(err.response?.data?.message || err.message || 'Failed to remove token');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [tokens, loadTokens]);

    // Refresh tokens
    const refreshTokens = useCallback(async () => {
        await loadTokens();
    }, [loadTokens]);

    // Sync with backend (force sync)
    const syncWithBackend = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.post('/api/v1/settings/tokens/sync');

            if (response.data?.success) {
                await loadTokens();
            } else {
                throw new Error(response.data?.message || 'Failed to sync tokens');
            }
        } catch (err: any) {
            console.error('❌ Failed to sync tokens:', err);
            setError(err.response?.data?.message || err.message || 'Failed to sync tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadTokens]);

    // Load tokens on mount
    useEffect(() => {
        loadTokens();
    }, [loadTokens]);

    return {
        tokens,
        loading,
        error,
        addToken,
        removeToken,
        refreshTokens,
        syncWithBackend
    };
};

// Helper function to mask tokens - chỉ hiển thị 10 ký tự cuối
const maskToken = (token: string): string => {
    if (!token || token.length < 20) return token;
    return `***...${token.slice(-10)}`; // Chỉ hiển thị 10 ký tự cuối
};

export default useTokens;
