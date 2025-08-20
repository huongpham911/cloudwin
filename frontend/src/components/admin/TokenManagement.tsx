import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import toast from 'react-hot-toast';
import { maskToken } from '../../utils/tokenUtils';

interface DigitalOceanToken {
  id: string;
  name: string;
  token: string; // masked token
  full_token?: string; // full token (admin only)
  is_active: boolean;
  created_at: string;
  last_used: string;
  status: 'active' | 'inactive' | 'expired';
  account_balance?: number;
  droplets_count?: number;
}



export default function TokenManagement() {
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', token: '' });

  const queryClient = useQueryClient();

  // Fetch tokens
  const { data: tokensData, isLoading, error } = useQuery({
    queryKey: ['admin', 'tokens'],
    queryFn: () => adminApi.getDigitalOceanTokens(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Extract tokens array from response
  const tokensList = tokensData?.tokens || [];
  const tokensStats = {
    total: tokensData?.total || 0,
    active_count: tokensData?.active_count || 0,
    inactive_count: tokensData?.inactive_count || 0
  };

  // Add token mutation
  const addTokenMutation = useMutation({
    mutationFn: (tokenData: { name: string; token: string }) =>
      adminApi.addDigitalOceanToken(tokenData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] });
      toast.success('Token added successfully');
      setShowAddModal(false);
      setNewToken({ name: '', token: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add token');
    }
  });

  // Delete token mutation
  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId: string) => adminApi.deleteDigitalOceanToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] });
      toast.success('Token deleted successfully');
      setSelectedTokens([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete token');
    }
  });

  // Test token mutation
  const testTokenMutation = useMutation({
    mutationFn: (tokenId: string) => adminApi.testDigitalOceanToken(tokenId),
    onSuccess: (data) => {
      toast.success(`Token is valid. Account balance: $${data.balance}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Token test failed');
    }
  });

  const handleSelectToken = (tokenId: string) => {
    setSelectedTokens(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTokens.length === tokensList.length) {
      setSelectedTokens([]);
    } else {
      setSelectedTokens(tokensList.map(token => token.id) || []);
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedTokens.length} token(s)?`)) {
      selectedTokens.forEach(tokenId => {
        deleteTokenMutation.mutate(tokenId);
      });
    }
  };

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.name.trim() || !newToken.token.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    addTokenMutation.mutate(newToken);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          Failed to load tokens: {(error as any).message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DigitalOcean Token Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your DigitalOcean API tokens for droplet creation
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Token
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tokens</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {tokensStats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Tokens</div>
          <div className="text-2xl font-bold text-green-600">
            {tokensStats.active_count}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Balance</div>
          <div className="text-2xl font-bold text-blue-600">
            ${tokensList.reduce((sum, t) => sum + (t.account_balance || 0), 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Droplets</div>
          <div className="text-2xl font-bold text-purple-600">
            {tokensList.reduce((sum, t) => sum + (t.droplets_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedTokens.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedTokens.length} token(s) selected
            </span>
            <div className="space-x-2">
              <button
                onClick={handleDeleteSelected}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedTokens([])}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tokens Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedTokens.length === tokensList.length && tokensList.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
              Select All
            </span>
          </div>
        </div>

        {tokensList && tokensList.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {tokensList.map((token) => (
              <li key={token.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTokens.includes(token.id)}
                      onChange={() => handleSelectToken(token.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {token.name}
                        </h3>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(token.status)}`}>
                          {token.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Token: {maskToken(token.token)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 space-x-4">
                        <span>Created: {new Date(token.created_at).toLocaleDateString()}</span>
                        <span>Last Used: {new Date(token.last_used).toLocaleDateString()}</span>
                        {token.account_balance && (
                          <span>Balance: ${token.account_balance.toFixed(2)}</span>
                        )}
                        {token.droplets_count !== undefined && (
                          <span>Droplets: {token.droplets_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => testTokenMutation.mutate(token.id)}
                      disabled={testTokenMutation.isPending}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {testTokenMutation.isPending ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => deleteTokenMutation.mutate(token.id)}
                      disabled={deleteTokenMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tokens</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first DigitalOcean API token.
            </p>
          </div>
        )}
      </div>

      {/* Add Token Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddToken}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Add DigitalOcean Token
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Token Name
                      </label>
                      <input
                        type="text"
                        value={newToken.name}
                        onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Production Token"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Token
                      </label>
                      <input
                        type="password"
                        value={newToken.token}
                        onChange={(e) => setNewToken(prev => ({ ...prev, token: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="dop_v1_..."
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Your DigitalOcean API token will be encrypted and stored securely.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={addTokenMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {addTokenMutation.isPending ? 'Adding...' : 'Add Token'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
