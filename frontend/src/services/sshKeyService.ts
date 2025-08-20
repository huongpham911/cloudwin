import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface SSHKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  created_at: string;
}

export interface CreateSSHKeyRequest {
  name: string;
  public_key: string;
}

class SSHKeyService {
  async getSSHKeys(): Promise<SSHKey[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ssh_keys`);
      return response.data.ssh_keys || [];
    } catch (error) {
      console.error('Error fetching SSH keys:', error);
      
      // Return mock data for development if backend is not available
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.warn('Backend not available, using mock SSH keys data');
        return [
          {
            id: 1,
            name: 'My Laptop Key',
            fingerprint: 'SHA256:abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
            public_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbqajDVdNW9p8N2GjHlN5s8pWrC3H5K2wC4E5fVf3p1jDk8F2nH4qB9E7aP3tF6gQ2dR5m1C8hG6eV9jN2fL3dE user@hostname',
            created_at: '2025-07-30T14:00:00Z'
          },
          {
            id: 2, 
            name: 'Server Access Key',
            fingerprint: 'SHA256:xyz987uvw654rst321opq098nml765kji432hgf109edc876ba',
            public_key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl admin@server',
            created_at: '2025-07-29T10:30:00Z'
          }
        ];
      }
      
      throw error;
    }
  }

  async createSSHKey(keyData: CreateSSHKeyRequest): Promise<SSHKey> {
    try {
      const response = await axios.post(`${API_BASE_URL}/ssh_keys`, keyData);
      return response.data.ssh_key;
    } catch (error) {
      console.error('Error creating SSH key:', error);
      
      // Mock success for development
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.warn('Backend not available, simulating SSH key creation');
        const mockKey: SSHKey = {
          id: Date.now(), // Use timestamp as mock ID
          name: keyData.name,
          fingerprint: `SHA256:${Math.random().toString(36).substring(2, 45)}`,
          public_key: keyData.public_key,
          created_at: new Date().toISOString()
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return mockKey;
      }
      
      throw error;
    }
  }

  async deleteSSHKey(keyId: number): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/ssh_keys/${keyId}`);
    } catch (error) {
      console.error('Error deleting SSH key:', error);
      
      // Mock success for development
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.warn('Backend not available, simulating SSH key deletion');
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      throw error;
    }
  }

  async updateSSHKey(keyId: number, name: string): Promise<SSHKey> {
    try {
      const response = await axios.put(`${API_BASE_URL}/ssh_keys/${keyId}`, { name });
      return response.data.ssh_key;
    } catch (error) {
      console.error('Error updating SSH key:', error);
      
      // Mock success for development  
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.warn('Backend not available, simulating SSH key update');
        const mockKey: SSHKey = {
          id: keyId,
          name: name,
          fingerprint: `SHA256:${Math.random().toString(36).substring(2, 45)}`,
          public_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbqajDVdNW9p8N2GjHlN5s8pWrC3H5K2wC4E5fVf3p1jDk8F2nH4qB9E7aP3tF6gQ2dR5m1C8hG6eV9jN2fL3dE user@hostname',
          created_at: new Date().toISOString()
        };
        
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockKey;
      }
      
      throw error;
    }
  }

  // Utility function to validate SSH public key format
  validateSSHKey(publicKey: string): { valid: boolean; error?: string } {
    if (!publicKey.trim()) {
      return { valid: false, error: 'SSH key cannot be empty' };
    }

    // Basic SSH key format validation
    const sshKeyRegex = /^(ssh-rsa|ssh-dss|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+[=]{0,3}(\s+.*)?$/;
    
    if (!sshKeyRegex.test(publicKey.trim())) {
      return { 
        valid: false, 
        error: 'Invalid SSH key format. Must start with ssh-rsa, ssh-ed25519, etc.' 
      };
    }

    // Check key length (basic validation)
    const keyParts = publicKey.trim().split(/\s+/);
    if (keyParts.length < 2) {
      return { 
        valid: false, 
        error: 'SSH key must contain key type and key data' 
      };
    }

    return { valid: true };
  }

  // Generate fingerprint locally (for preview before uploading)
  async generateFingerprint(publicKey: string): Promise<string> {
    try {
      // This is a simplified fingerprint generation
      // In production, you might want to use a proper crypto library
      const encoder = new TextEncoder();
      const data = encoder.encode(publicKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Format as SSH fingerprint (simplified)
      return `SHA256:${hashHex.substring(0, 43)}`;
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      return 'Unable to generate fingerprint';
    }
  }
}

export const sshKeyService = new SSHKeyService();
