/**
 * User Data / Cloud-Init Service for WinCloud
 * Handles cloud-init script generation and management
 */

import api from './api'

export interface UserDataRequest {
  droplet_name: string
  webhook_url?: string
  build_token?: string
  ssh_public_key?: string
  commands?: string[]
}

export interface UserDataResponse {
  success: boolean
  user_data?: string
  droplet_name?: string
  type?: 'windows_builder' | 'simple'
  error?: string
}

export interface TemplateResponse {
  success: boolean
  template?: string
  template_path?: string
  error?: string
}

class UserDataService {
  /**
   * Generate cloud-init user data script
   */
  async generateUserData(request: UserDataRequest): Promise<UserDataResponse> {
    try {
      const response = await api.post('/api/v1/user-data/generate', request)
      return response.data
    } catch (error: any) {
      console.error('Error generating user data:', error)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to generate user data'
      }
    }
  }

  /**
   * Generate Windows builder cloud-init script
   */
  async generateWindowsBuilderUserData(
    dropletName: string,
    webhookUrl: string,
    buildToken: string,
    sshPublicKey?: string
  ): Promise<UserDataResponse> {
    return this.generateUserData({
      droplet_name: dropletName,
      webhook_url: webhookUrl,
      build_token: buildToken,
      ssh_public_key: sshPublicKey
    })
  }

  /**
   * Generate simple cloud-init script with custom commands
   */
  async generateSimpleUserData(
    dropletName: string,
    commands: string[]
  ): Promise<UserDataResponse> {
    return this.generateUserData({
      droplet_name: dropletName,
      commands
    })
  }

  /**
   * Get the cloud-init template
   */
  async getTemplate(): Promise<TemplateResponse> {
    try {
      const response = await api.get('/api/v1/user-data/template')
      return response.data
    } catch (error: any) {
      console.error('Error getting template:', error)
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get template'
      }
    }
  }

  /**
   * Generate common cloud-init scripts for different use cases
   */
  getCommonScripts() {
    return {
      nginx: [
        'apt-get update',
        'apt-get install -y nginx',
        'systemctl start nginx',
        'systemctl enable nginx',
        'ufw allow "Nginx Full"'
      ],
      docker: [
        'apt-get update',
        'apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release',
        'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg',
        'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null',
        'apt-get update',
        'apt-get install -y docker-ce docker-ce-cli containerd.io',
        'systemctl start docker',
        'systemctl enable docker',
        'usermod -aG docker ubuntu'
      ],
      nodejs: [
        'apt-get update',
        'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -',
        'apt-get install -y nodejs',
        'npm install -g pm2',
        'ufw allow 3000'
      ],
      python: [
        'apt-get update',
        'apt-get install -y python3 python3-pip python3-venv',
        'pip3 install --upgrade pip',
        'apt-get install -y python3-dev build-essential'
      ],
      lamp: [
        'apt-get update',
        'apt-get install -y apache2 mysql-server php libapache2-mod-php php-mysql',
        'systemctl start apache2',
        'systemctl enable apache2',
        'systemctl start mysql',
        'systemctl enable mysql',
        'ufw allow "Apache Full"'
      ]
    }
  }

  /**
   * Validate cloud-init script syntax
   */
  validateCloudInit(script: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Basic validation
    if (!script.trim()) {
      errors.push('Script cannot be empty')
      return { valid: false, errors }
    }

    // Check for cloud-config header
    if (!script.includes('#cloud-config')) {
      errors.push('Script should start with #cloud-config')
    }

    // Check for common YAML issues
    const lines = script.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for tab characters (YAML doesn't allow tabs)
      if (line.includes('\t')) {
        errors.push(`Line ${i + 1}: YAML doesn't allow tab characters, use spaces`)
      }
      
      // Check for inconsistent indentation
      if (line.match(/^\s+/) && line.match(/^\s+/)?.[0].length % 2 !== 0) {
        errors.push(`Line ${i + 1}: Use 2-space indentation`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const userDataService = new UserDataService()
export default userDataService
