# 🖥️ VPS Requirements for WinCloud Deployment

## 🎯 Domain Structure (Final)
```
wincloud.app         → Landing/Marketing (Port 7000)
panel.wincloud.app   → Control Panel (Port 5173)  
api.wincloud.app     → Backend API (Port 5000)
```

## 💻 **VPS SPECIFICATIONS**

### **🏆 RECOMMENDED (Production Ready):**
```yaml
CPU: 4 vCPUs
RAM: 8GB  
Storage: 80GB SSD
Bandwidth: 4TB/month
OS: Ubuntu 22.04 LTS
Provider: DigitalOcean, Vultr, Linode, or AWS
Cost: ~$40-60/month
```

### **🥈 MINIMUM (Budget Option):**
```yaml
CPU: 2 vCPUs
RAM: 4GB
Storage: 50GB SSD  
Bandwidth: 2TB/month
OS: Ubuntu 22.04 LTS
Cost: ~$20-30/month
```

### **🥉 DEVELOPMENT/TESTING:**
```yaml
CPU: 1-2 vCPUs
RAM: 2GB
Storage: 25GB SSD
Bandwidth: 1TB/month
OS: Ubuntu 22.04 LTS
Cost: ~$10-15/month
```

## 🛠️ **TECHNICAL REQUIREMENTS**

### **Operating System:**
- ✅ **Ubuntu 22.04 LTS** (Recommended)
- ✅ **Ubuntu 20.04 LTS** (Alternative)
- ✅ **Debian 11/12** (Alternative)
- ❌ **CentOS** (Not recommended - EOL)

### **Required Software Stack:**
```bash
# Web Server
Nginx 1.20+

# Runtime
Node.js 18+ LTS
Python 3.10+
PM2 (Process Manager)

# Database
PostgreSQL 14+
Redis 6+

# SSL
CloudFlare Origin Certificate
Certbot (backup)

# Monitoring
htop, iostat, netstat
fail2ban (security)
```

### **Network Requirements:**
- ✅ **Static IP** (required for DNS)
- ✅ **Root access** or sudo privileges
- ✅ **Port access**: 22, 80, 443, 5000, 5173, 7000
- ✅ **IPv4 + IPv6** support (preferred)

## 🌐 **PROVIDER RECOMMENDATIONS**

### **🏆 #1: DigitalOcean** (Best for this project)
```yaml
Droplet: "Premium Intel" 
4 vCPU, 8GB RAM, 80GB SSD
Location: Singapore (for Vietnam)
Features:
  ✅ CloudFlare integration
  ✅ 1-click Ubuntu
  ✅ Floating IP
  ✅ Firewall included
  ✅ Monitoring included
Cost: $48/month
```

### **🥈 #2: Vultr**
```yaml
Instance: "High Frequency"
4 vCPU, 8GB RAM, 128GB SSD  
Location: Singapore
Features:
  ✅ NVMe SSD
  ✅ CloudFlare integration
  ✅ DDoS protection
Cost: $48/month
```

### **🥉 #3: Linode (Akamai)**
```yaml
Instance: "Dedicated 8GB"
4 vCPU, 8GB RAM, 160GB SSD
Location: Singapore
Features:
  ✅ Dedicated CPU
  ✅ 40Gbps network
  ✅ Cloud firewall
Cost: $60/month
```

## 📍 **LOCATION RECOMMENDATIONS**

### **For Vietnamese Users:**
1. **Singapore** (Best latency ~30-50ms)
2. **Japan (Tokyo)** (Good latency ~80-100ms)  
3. **Hong Kong** (Decent latency ~60-80ms)
4. **US West (San Francisco)** (Higher latency ~200ms)

### **Network Test:**
```bash
# Test from Vietnam to different regions
ping -c 10 singapore.vultr.com
ping -c 10 hkg-ping.vultr.com  
ping -c 10 nrt-ping.vultr.com
```

## 🔧 **DEPLOYMENT SPECIFICATIONS**

### **Resource Usage Estimation:**
```yaml
Services Running:
- Nginx: ~50MB RAM
- PostgreSQL: ~200MB RAM
- Redis: ~50MB RAM  
- Python API: ~300MB RAM
- Node.js Frontend: ~150MB RAM
- PM2: ~30MB RAM
- System: ~500MB RAM

Total RAM Usage: ~1.3GB
Recommended: 4GB+ (with 2.7GB free for buffers)
```

### **Storage Breakdown:**
```yaml
OS + Software: ~15GB
Database: ~5-20GB (depends on usage)
Logs: ~1-5GB
Uploads/Cache: ~5-10GB  
Free Space: ~30GB+

Total Storage: 50GB minimum, 80GB recommended
```

### **Bandwidth Estimation:**
```yaml
API Requests: ~100MB/day/user
Frontend Assets: ~50MB/day/user
Database Sync: ~20MB/day/user

For 100 users: ~17GB/month
For 500 users: ~85GB/month
For 1000 users: ~170GB/month

Recommended: 2TB+/month
```

## 🔒 **SECURITY REQUIREMENTS**

### **Essential Security:**
```bash
# Firewall Rules
Port 22: SSH (restricted IPs)
Port 80: HTTP (CloudFlare only)
Port 443: HTTPS (CloudFlare only)
Port 5000-5173: Internal (localhost only)

# fail2ban Protection
SSH brute force protection
Rate limiting
DDoS mitigation (via CloudFlare)
```

### **SSL Certificate:**
- ✅ **CloudFlare Origin Certificate** (Free + Easy)
- ✅ **Let's Encrypt** (Free backup option)
- ✅ **Wildcard support** for *.wincloud.app

## 📊 **PERFORMANCE OPTIMIZATION**

### **Database Optimization:**
```sql
-- PostgreSQL config for 8GB RAM
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### **Nginx Optimization:**
```nginx
# Nginx worker optimization
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

## 🚀 **QUICK SETUP COMMANDS**

### **DigitalOcean Droplet Creation:**
```bash
# Via CLI (if you use doctl)
doctl compute droplet create wincloud-production \
  --size s-4vcpu-8gb \
  --image ubuntu-22-04-x64 \
  --region sgp1 \
  --vpc-uuid your-vpc-id \
  --ssh-keys your-ssh-key-id \
  --enable-monitoring \
  --enable-private-networking
```

### **Initial Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y nginx postgresql redis-server nodejs npm python3 python3-pip git htop

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp  
sudo ufw allow 443/tcp
sudo ufw enable
```

## 💰 **COST BREAKDOWN**

### **Monthly Costs:**
```yaml
VPS (DigitalOcean 4vCPU/8GB): $48
Domain (wincloud.app): $12/year = $1/month
CloudFlare Pro (optional): $20/month
Monitoring (optional): $10/month

Total: $49-79/month
Annual: $588-948/year
```

### **Cost Optimization:**
- Start with 2vCPU/4GB ($24/month)
- Scale up based on traffic
- Use CloudFlare free tier initially
- Monitor actual usage before upgrading

## 📋 **DEPLOYMENT CHECKLIST**

### **Before Purchase:**
- [ ] Choose provider (DigitalOcean recommended)
- [ ] Select region (Singapore for Vietnam)
- [ ] Configure SSH keys
- [ ] Setup billing alerts

### **After Purchase:**
- [ ] Update system packages
- [ ] Configure firewall
- [ ] Install software stack
- [ ] Setup CloudFlare DNS
- [ ] Deploy WinCloud application
- [ ] Configure SSL certificates
- [ ] Setup monitoring
- [ ] Test all domains

## 🎯 **RECOMMENDED PURCHASE:**

**DigitalOcean Droplet:**
- **Size**: s-4vcpu-8gb-intel ($48/month)
- **Region**: Singapore (sgp1)
- **OS**: Ubuntu 22.04 LTS
- **Additional**: Monitoring, Private Networking
- **Backups**: Weekly ($9.60/month additional)

**Total Setup Cost**: ~$60/month for production-ready hosting

Ready to proceed với setup này anh? 🚀
