import os
import yaml
from typing import Optional, Dict
import base64

class CloudInitService:
    """Service for generating cloud-init user data"""
    
    def __init__(self):
        self.template_path = os.path.join(
            os.path.dirname(__file__), 
            "..", 
            "templates", 
            "cloud-init.yaml"
        )
    
    def generate_user_data(
        self,
        droplet_name: str,
        webhook_url: str,
        build_token: str,
        ssh_public_key: Optional[str] = None
    ) -> str:
        """Generate cloud-init user data for Windows builder droplet"""
        
        # Load the template
        with open(self.template_path, 'r') as f:
            template = f.read()
        
        # Replace placeholders
        user_data = template.replace("{{ droplet_name }}", droplet_name)
        
        if ssh_public_key:
            user_data = user_data.replace("{{ ssh_public_key }}", ssh_public_key)
        else:
            # Remove SSH key section if not provided
            user_data = user_data.replace("ssh_authorized_keys:\n  - \"{{ ssh_public_key }}\"", "")
        
        # Add environment variables for webhook
        env_vars = f"""
  # Set environment variables for webhook
  - echo 'export WEBHOOK_URL="{webhook_url}"' >> /etc/environment
  - echo 'export BUILD_TOKEN="{build_token}"' >> /etc/environment
  - source /etc/environment
"""
        
        # Insert env vars after packages installation
        user_data = user_data.replace("# Create working directories", env_vars + "\n  # Create working directories")
        
        return user_data
    
    def generate_simple_user_data(self, commands: list) -> str:
        """Generate simple cloud-init user data from command list"""
        
        cloud_config = {
            '#cloud-config': None,
            'package_update': True,
            'package_upgrade': True,
            'packages': [
                'qemu-kvm',
                'libvirt-daemon-system',
                'wget',
                'curl',
                'genisoimage',
                'python3',
                'python3-pip',
                'ufw'
            ],
            'runcmd': commands
        }
        
        # Convert to YAML format
        yaml_content = yaml.dump(cloud_config, default_flow_style=False)
        # Fix the cloud-config header
        yaml_content = "#cloud-config\n" + yaml_content.replace("'#cloud-config': null\n", "")
        
        return yaml_content
    
    def encode_user_data(self, user_data: str) -> str:
        """Encode user data to base64 if needed"""
        # DigitalOcean accepts plain text cloud-init
        return user_data
