export interface UserDataTemplate {
  id: string;
  name: string;
  description: string;
  category: 'windows' | 'linux' | 'custom';
  script: string;
  icon?: string;
}

export const userDataTemplates: UserDataTemplate[] = [
  // Windows Templates
  {
    id: 'win10-lite',
    name: 'Windows 10 Lite',
    description: 'Lightweight Windows 10 installation script',
    category: 'windows',
    icon: '🪟',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/12.sh -o boot-win-lite.sh
chmod +x boot-win-lite.sh
./boot-win-lite.sh`
  },
  {
    id: 'win10-h24',
    name: 'Windows 10 H24',
    description: 'Windows 10 with 24H2 updates',
    category: 'windows',
    icon: '🪟',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win10-h24.sh -o boot-win10-h24.sh
chmod +x boot-win10-h24.sh
./boot-win10-h24.sh`
  },
  {
    id: 'win11-lite',
    name: 'Windows 11 Lite',
    description: 'Lightweight Windows 11 installation script',
    category: 'windows',
    icon: '🪟',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win11-lite.sh -o boot-win11-lite.sh
chmod +x boot-win11-lite.sh
./boot-win11-lite.sh`
  },
  {
    id: 'win11-pro',
    name: 'Windows 11 Pro',
    description: 'Windows 11 Professional edition with full features',
    category: 'windows',
    icon: '🪟',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win11-pro.sh -o boot-win11-pro.sh
chmod +x boot-win11-pro.sh
./boot-win11-pro.sh`
  },
  {
    id: 'win-server-2022',
    name: 'Windows Server 2022',
    description: 'Windows Server 2022 installation script',
    category: 'windows',
    icon: '🖥️',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win-server-2022.sh -o boot-win-server.sh
chmod +x boot-win-server.sh
./boot-win-server.sh`
  },
  {
    id: 'win10-gaming',
    name: 'Windows 10 Gaming',
    description: 'Windows 10 optimized for gaming with GPU drivers',
    category: 'windows',
    icon: '🎮',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win10-gaming.sh -o boot-win10-gaming.sh
chmod +x boot-win10-gaming.sh
./boot-win10-gaming.sh`
  },
  {
    id: 'test-winsetup',
    name: 'Test WinSetup Script',
    description: 'Test script từ kangta911/wewilwill repository',
    category: 'windows',
    icon: '🧪',
    script: `#!/bin/bash
curl -sL -o winsetup.sh https://raw.githubusercontent.com/kangta911/wewilwill/main/winsetup.sh
chmod +x winsetup.sh
./winsetup.sh`
  },
  {
    id: 'win11-dev',
    name: 'Windows 11 Developer',
    description: 'Windows 11 with development tools pre-installed',
    category: 'windows',
    icon: '👨‍💻',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win11-dev.sh -o boot-win11-dev.sh
chmod +x boot-win11-dev.sh
./boot-win11-dev.sh`
  },
  {
    id: 'windows-rdp-optimized',
    name: 'Windows RDP Optimized',
    description: 'Windows installation optimized for Remote Desktop Performance',
    category: 'windows',
    icon: '🖥️',
    script: `#!/bin/bash
curl -sL https://raw.githubusercontent.com/kangta911/wewilwill/main/win-rdp-optimized.sh -o boot-win-rdp.sh
chmod +x boot-win-rdp.sh
./boot-win-rdp.sh`
  },

  // Linux Templates
  {
    id: 'ubuntu-basic',
    name: 'Ubuntu Basic Setup',
    description: 'Basic Ubuntu server setup with common packages',
    category: 'linux',
    icon: '🐧',
    script: `#!/bin/bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nano htop unzip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
usermod -aG docker $USER

# Clean up
rm get-docker.sh
apt autoremove -y

echo "Ubuntu basic setup completed!"
reboot`
  },
  {
    id: 'nginx-webserver',
    name: 'Nginx Web Server',
    description: 'Install and configure Nginx web server',
    category: 'linux',
    icon: '🌐',
    script: `#!/bin/bash
# Update system
apt update && apt upgrade -y

# Install Nginx
apt install -y nginx

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Configure firewall
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable

# Create a simple index page
cat > /var/www/html/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Welcome to WinCloud VPS</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <h1>🚀 Your VPS is Ready!</h1>
    <p>Nginx web server is running successfully.</p>
    <p>Server: $(hostname -I | awk '{print $1}')</p>
</body>
</html>
EOF

echo "Nginx web server setup completed!"
systemctl status nginx`
  },
  {
    id: 'docker-compose',
    name: 'Docker + Docker Compose',
    description: 'Install Docker and Docker Compose for container management',
    category: 'linux',
    icon: '🐳',
    script: `#!/bin/bash
# Update system
apt update && apt upgrade -y

# Install prerequisites
apt install -y curl wget git software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker (New official method)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
systemctl start docker
systemctl enable docker

# Install Docker Compose (standalone)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Add user to docker group
usermod -aG docker $USER

# Create docker-compose example
mkdir -p /opt/docker-apps
cat > /opt/docker-apps/docker-compose.yml << EOF
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
EOF

echo "Docker and Docker Compose installed successfully!"
docker --version
docker-compose --version
echo "✅ Please logout and login again to use Docker without sudo"`
  }
];

export const getTemplatesByCategory = (category: 'windows' | 'linux' | 'custom') => {
  return userDataTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return userDataTemplates.find(template => template.id === id);
};
