import React, { useState, useEffect } from 'react';
import { TrashIcon, CameraIcon, ClockIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';

interface Snapshot {
  id: number;
  name: string;
  distribution: string;
  slug: string | null;
  public: boolean;
  regions: string[];
  created_at: string;
  min_disk_size: number;
  type: string;
  size_gigabytes: number;
}

interface SnapshotManagerProps {
  dropletId: string;
  dropletName?: string;
  onSnapshotCreated?: () => void;
  isDark?: boolean;
}

const SnapshotManager: React.FC<SnapshotManagerProps> = ({ 
  dropletId, 
  dropletName,
  onSnapshotCreated,
  isDark = false
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  // Fetch snapshots
  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/v1/droplets/${dropletId}/snapshots`);
      setSnapshots(response.data.snapshots || []);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      setError('Failed to load snapshots');
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  // Create snapshot
  const createSnapshot = async () => {
    try {
      setCreating(true);
      setError(null);
      
      const finalSnapshotName = snapshotName.trim() || `${dropletName || `WP`}-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '')}`;
      
      await api.post(`/api/v1/droplets/${dropletId}/snapshot`, {
        name: finalSnapshotName
      });
      
      // Refresh snapshots after a delay (snapshot creation takes time)
      setTimeout(() => {
        fetchSnapshots();
      }, 2000);
      
      // Reset form
      setSnapshotName('');
      setShowCreateForm(false);
      
      if (onSnapshotCreated) {
        onSnapshotCreated();
      }
    } catch (err: any) {
      console.error('Error creating snapshot:', err);
      setError(err.response?.data?.detail || 'Failed to create snapshot');
    } finally {
      setCreating(false);
    }
  };

  // Delete snapshot
  const deleteSnapshot = async (snapshotId: number, snapshotName: string) => {
    if (!confirm(`Are you sure you want to delete snapshot "${snapshotName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(snapshotId);
      setError(null);
      await api.delete(`/api/v1/snapshots/${snapshotId}`);
      
      // Remove from local state immediately
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    } catch (err: any) {
      console.error('Error deleting snapshot:', err);
      setError(err.response?.data?.detail || 'Failed to delete snapshot');
    } finally {
      setDeleting(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format size
  const formatSize = (gb: number) => {
    return `${gb} GB`;
  };

  useEffect(() => {
    fetchSnapshots();
    // Generate default snapshot name when component mounts
    const defaultName = `${dropletName || `WP`}-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '')}`;
    setSnapshotName(defaultName);
  }, [dropletId]);

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CameraIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Snapshots</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage snapshots for {dropletName || `Droplet ${dropletId}`}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <CameraIcon className="h-4 w-4 mr-2" />
          Create Snapshot
        </button>
      </div>

      {/* Create Snapshot Form */}
      {showCreateForm && (
        <div className={`mb-6 p-6 border ${isDark ? 'border-blue-600 bg-blue-900/10' : 'border-blue-200 bg-blue-50'} rounded-lg`}>
          <h4 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            Take snapshot
          </h4>
          
          <div className={`mb-4 p-3 ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-100 border-blue-300'} border rounded-md`}>
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              We recommend <span className="font-medium">turning off your Droplet</span> before taking a snapshot to ensure data consistency.{' '}
              <a href="#" className={`${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} underline`}>
                Learn more
              </a>
            </p>
          </div>

          <div className={`mb-4 p-3 ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-md`}>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              Snapshot cost is based on space used (not the size of the filesystem) and charged at a rate of <strong>$0.06/GiB/mo</strong>.
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Creating a snapshot takes about <strong>1 to 3 minutes per GB</strong> of used disk space on the Droplet, so a Droplet with 10 GB of used disk space would take 10 to 30 minutes. This time can vary depending on factors like current disk activity and load levels on the Droplet or hypervisor.
            </p>
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Enter snapshot name
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Enter snapshot name"
                className={`flex-1 px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              <button
                onClick={createSnapshot}
                disabled={creating || !snapshotName.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Take live snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`mb-4 p-4 border ${isDark ? 'border-red-600 bg-red-900/20' : 'border-red-200 bg-red-50'} rounded-md`}>
          <div className="flex">
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>Error</h3>
              <div className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Snapshots List */}
      {!loading && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <CameraIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No snapshots</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Create your first snapshot to backup this droplet.
              </p>
            </div>
          ) : (
            <>
              <div className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-200'} pb-2 mb-4`}>
                <h4 className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Droplet snapshots
                </h4>
              </div>
              
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`flex items-center justify-between p-4 border ${isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'} rounded-lg`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 ${isDark ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                          <CameraIcon className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                            {snapshot.name}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                            {snapshot.distribution}
                          </span>
                        </div>
                        
                        <div className={`mt-1 flex items-center space-x-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{formatDate(snapshot.created_at)}</span>
                          </div>
                          <span>•</span>
                          <span>{formatSize(snapshot.size_gigabytes)}</span>
                          <span>•</span>
                          <span>ID: {snapshot.id}</span>
                          {snapshot.regions.length > 0 && (
                            <>
                              <span>•</span>
                              <span>Region: {snapshot.regions[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteSnapshot(snapshot.id, snapshot.name)}
                        disabled={deleting === snapshot.id}
                        className={`inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:${isDark ? 'bg-red-900/20' : 'bg-red-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Delete snapshot"
                      >
                        {deleting === snapshot.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapshotManager;
