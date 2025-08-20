import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSSHKeys, useCreateSSHKey, useDeleteSSHKey, useUpdateSSHKey } from '../../hooks/useSSHKeys';
import { sshKeyService } from '../../services/sshKeyService';
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface SSHKeysManagerProps {
  isExpanded: boolean;
}

const SSHKeysManager: React.FC<SSHKeysManagerProps> = ({ isExpanded }) => {
  const { isDark } = useTheme();
  const { data: sshKeys, isLoading, error } = useSSHKeys();
  const createSSHKeyMutation = useCreateSSHKey();
  const deleteSSHKeyMutation = useDeleteSSHKey();
  const updateSSHKeyMutation = useUpdateSSHKey();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<number | null>(null);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    public_key: ''
  });
  const [editingName, setEditingName] = useState('');
  const [keyValidation, setKeyValidation] = useState<{ valid: boolean; error?: string } | null>(null);

  const handleAddSSHKey = async () => {
    const validation = sshKeyService.validateSSHKey(newKeyData.public_key);
    setKeyValidation(validation);

    if (!validation.valid) {
      return;
    }

    if (!newKeyData.name.trim()) {
      toast.error('SSH key name is required');
      return;
    }

    try {
      await createSSHKeyMutation.mutateAsync(newKeyData);
      setNewKeyData({ name: '', public_key: '' });
      setShowAddForm(false);
      setKeyValidation(null);
    } catch (error) {
      console.error('Failed to create SSH key:', error);
    }
  };

  const handleDeleteSSHKey = async (keyId: number) => {
    if (window.confirm('Are you sure you want to delete this SSH key?')) {
      try {
        await deleteSSHKeyMutation.mutateAsync(keyId);
      } catch (error) {
        console.error('Failed to delete SSH key:', error);
      }
    }
  };

  const handleUpdateSSHKey = async (keyId: number) => {
    if (!editingName.trim()) {
      toast.error('SSH key name cannot be empty');
      return;
    }

    try {
      await updateSSHKeyMutation.mutateAsync({ keyId, name: editingName });
      setEditingKeyId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update SSH key:', error);
    }
  };

  const startEditing = (keyId: number, currentName: string) => {
    setEditingKeyId(keyId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingKeyId(null);
    setEditingName('');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const validateKeyInput = (publicKey: string) => {
    if (!publicKey.trim()) {
      setKeyValidation(null);
      return;
    }
    
    const validation = sshKeyService.validateSSHKey(publicKey);
    setKeyValidation(validation);
  };

  if (!isExpanded) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            SSH Keys
          </h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            SSH keys provide a more secure way of logging into your droplets than using a password alone.
          </p>
          {sshKeys && (
            <div className="flex items-center space-x-4 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                {sshKeys.length} keys configured
              </span>
              {sshKeys.length > 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  ✓ Ready for droplet deployment
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add SSH Key
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            Error loading SSH keys: {error.message}
          </p>
        </div>
      )}

      {/* Add SSH Key Form */}
      {showAddForm && (
        <div className={`p-4 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h5 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            Add New SSH Key
          </h5>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Name
              </label>
              <input
                type="text"
                value={newKeyData.name}
                onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Laptop Key"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Public Key
              </label>
              <textarea
                value={newKeyData.public_key}
                onChange={(e) => {
                  setNewKeyData(prev => ({ ...prev, public_key: e.target.value }));
                  validateKeyInput(e.target.value);
                }}
                placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAA... user@hostname"
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                  isDark 
                    ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
              
              {keyValidation && !keyValidation.valid && (
                <p className="mt-1 text-sm text-red-500">{keyValidation.error}</p>
              )}
              
              {keyValidation?.valid && (
                <p className="mt-1 text-sm text-green-500">✓ Valid SSH key format</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAddSSHKey}
                disabled={createSSHKeyMutation.isPending || !keyValidation?.valid}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSSHKeyMutation.isPending ? 'Adding...' : 'Add SSH Key'}
              </button>
              
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKeyData({ name: '', public_key: '' });
                  setKeyValidation(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark 
                    ? 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SSH Keys List */}
      {sshKeys && sshKeys.length === 0 ? (
        <div className={`p-6 text-center rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <KeyIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-300'}`} />
          <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No SSH keys
          </h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            You have not created any SSH Keys.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sshKeys?.map((key) => (
            <div 
              key={key.id} 
              className={`p-4 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {editingKeyId === key.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={`px-2 py-1 border rounded ${
                          isDark 
                            ? 'border-gray-600 bg-gray-800 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                      <button
                        onClick={() => handleUpdateSSHKey(key.id)}
                        disabled={updateSSHKeyMutation.isPending}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className={`text-md font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {key.name}
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} font-mono`}>
                        {key.fingerprint}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Created: {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(key.fingerprint, 'Fingerprint')}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Copy fingerprint"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                  
                  {editingKeyId !== key.id && (
                    <button
                      onClick={() => startEditing(key.id, key.name)}
                      className="p-2 text-blue-500 hover:text-blue-700"
                      title="Edit name"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteSSHKey(key.id)}
                    disabled={deleteSSHKeyMutation.isPending}
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Delete SSH key"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Public Key Preview (collapsible) */}
              <details className="mt-3">
                <summary className={`cursor-pointer text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-blue-500`}>
                  View public key
                </summary>
                <div className={`mt-2 p-3 rounded border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <code className={`text-xs font-mono break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {key.public_key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.public_key, 'Public key')}
                      className="ml-2 p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
                      title="Copy public key"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* SSH Usage Guide */}
      <div className={`p-4 rounded-lg border ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <h5 className={`text-sm font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'} mb-2`}>
          💡 SSH Keys Usage Guide
        </h5>
        <div className={`text-xs space-y-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          <div>
            <strong>1. Generate SSH Key Pair:</strong>
            <div className="mt-1 space-y-1">
              <code className="block bg-black/20 px-2 py-1 rounded">ssh-keygen -t ed25519 -C "your_email@example.com"</code>
              <code className="block bg-black/20 px-2 py-1 rounded">ssh-keygen -t rsa -b 4096 -C "your_email@example.com"</code>
            </div>
          </div>
          
          <div>
            <strong>2. Copy Public Key:</strong>
            <div className="mt-1 space-y-1">
              <code className="block bg-black/20 px-2 py-1 rounded">cat ~/.ssh/id_ed25519.pub</code>
              <code className="block bg-black/20 px-2 py-1 rounded">type %USERPROFILE%\.ssh\id_rsa.pub</code>
            </div>
          </div>
          
          <div>
            <strong>3. Add to WinCloud Builder:</strong>
            <p>Click "Add SSH Key" above, paste your public key, and give it a name.</p>
          </div>
          
          <div>
            <strong>4. Attach to Droplets:</strong>
            <p>When creating droplets, select your SSH keys for automatic installation.</p>
          </div>
          
          <div>
            <strong>5. Connect to Droplet:</strong>
            <code className="block bg-black/20 px-2 py-1 rounded">ssh -i ~/.ssh/id_ed25519 root@droplet_ip</code>
          </div>
          
          <div className={`mt-3 p-2 rounded ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
            <strong className="text-green-600">✨ Pro Tips:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Use Ed25519 keys (more secure, smaller size)</li>
              <li>• Add SSH key to ssh-agent for convenience</li>
              <li>• Use different keys for different purposes</li>
              <li>• Never share your private key (.ssh/id_*)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSHKeysManager;
