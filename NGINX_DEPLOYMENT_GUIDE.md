# 🚀 WinCloud Builder - Production Deployment với Nginx

## 📋 **Tổng quan**

Hướng dẫn deploy WinCloud Builder lên VPS với **Nginx reverse proxy** cho domain `wincloud.app` đã có sẵn.

### **🌐 Architecture:**
```
Internet → CloudFlare → VPS (139.99.91.108) → Nginx → Docker Services

wincloud.app         → Nginx → Home (Vue.js)
panel.wincloud.app   → Nginx → Frontend (React)
api.wincloud.app     → Nginx → Backend (FastAPI)
```

### **🐳 Docker Services:**
- **nginx**: Reverse proxy với SSL
- **backend**: FastAPI + Redis + PostgreSQL
- **frontend**: React build với Nginx
- **home**: Vue.js landing page
- **db**: PostgreSQL 15
- **redis**: Redis 7 với persistence
- **backup**: Auto database backup

## 🚀 **Quick Start**

### **1. Clone project lên VPS:**
```bash
# SSH vào VPS
ssh root@139.99.91.108

# Clone project
git clone <your-repo> /opt/wincloud
cd /opt/wincloud
```

### **2. Setup SSL certificates:**
```bash
# CloudFlare Origin Certificate (Khuyến nghị)
./scripts/setup-ssl-docker.sh

# Chọn option 1 và paste certificates từ CloudFlare
```

### **3. Deploy ngay:**
```bash
# Setup và deploy tự động
./deploy-nginx.sh setup

# Hoặc từng bước:
cp env.docker.example .env
nano .env  # Chỉnh sửa passwords
./deploy-nginx.sh setup
```

### **4. Kiểm tra:**
```bash
# Check services
./deploy-nginx.sh status

# Check health
./deploy-nginx.sh health

# View logs
./deploy-nginx.sh logs
```

## ⚙️ **Environment Configuration**

### **File `.env` cần chỉnh sửa:**
```env
# Database
POSTGRES_PASSWORD=your-secure-db-password

# Redis  
REDIS_PASSWORD=your-secure-redis-password

# Application
SECRET_KEY=your-super-secret-production-key

# DigitalOcean
DO_SSH_KEY_ID=your-digitalocean-ssh-key-id

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
```

## 🔐 **SSL Certificate Setup**

### **Option 1: CloudFlare Origin Certificate (Khuyến nghị)**
```bash
# Chạy script setup
./scripts/setup-ssl-docker.sh

# Chọn option 1
# Vào CloudFlare Dashboard → SSL/TLS → Origin Server
# Create Certificate cho *.wincloud.app
# Copy paste certificate và private key
```

### **Option 2: Let's Encrypt**
```bash
# Cài certbot trước
sudo apt install certbot

# Chạy script
./scripts/setup-ssl-docker.sh

# Chọn option 2 (auto setup)
```

### **Option 3: Manual setup**
```bash
# Tạo thư mục
mkdir -p nginx/ssl

# Copy certificates
sudo cp /path/to/your/cert.pem nginx/ssl/wincloud.app.pem
sudo cp /path/to/your/key.pem nginx/ssl/wincloud.app.key

# Set permissions
chmod 644 nginx/ssl/wincloud.app.pem
chmod 600 nginx/ssl/wincloud.app.key
```

## 🌐 **DNS Configuration**

### **CloudFlare DNS Records:**
```
Type  Name                  Content           Proxy
A     wincloud.app         139.99.91.108     🟠 Proxied
A     panel.wincloud.app   139.99.91.108     🟠 Proxied  
A     api.wincloud.app     139.99.91.108     🟠 Proxied
A     www.wincloud.app     139.99.91.108     🟠 Proxied
```

### **CloudFlare SSL Settings:**
- **Encryption Mode**: Full (Strict)
- **Always Use HTTPS**: ON
- **TLS Version**: 1.2 minimum
- **HSTS**: Enabled

## 📁 **File Structure**

```
wincloud-builder/
├── docker-compose.nginx.yml     # Production với Nginx
├── deploy-nginx.sh              # Deploy script chính
├── env.docker.example           # Environment template
├── nginx/
│   ├── nginx.conf              # Main Nginx config
│   ├── conf.d/
│   │   └── wincloud.conf       # Domain configurations
│   └── ssl/                    # SSL certificates
│       ├── wincloud.app.pem
│       └── wincloud.app.key
├── scripts/
│   └── setup-ssl-docker.sh     # SSL setup script
└── backend/tokens_secure.json   # DigitalOcean API tokens (encrypted)
```

## 🛠️ **Deploy Commands**

### **Main Commands:**
```bash
# Setup và deploy lần đầu
./deploy-nginx.sh setup

# Start services
./deploy-nginx.sh start

# Stop services  
./deploy-nginx.sh stop

# Restart services
./deploy-nginx.sh restart

# View logs
./deploy-nginx.sh logs

# Check status
./deploy-nginx.sh status

# Health check
./deploy-nginx.sh health

# SSL info
./deploy-nginx.sh ssl

# Manual backup
./deploy-nginx.sh backup

# Clean everything
./deploy-nginx.sh clean
```

### **Docker Commands:**
```bash
# Manual Docker commands
docker-compose -f docker-compose.nginx.yml up -d
docker-compose -f docker-compose.nginx.yml down
docker-compose -f docker-compose.nginx.yml logs -f
docker-compose -f docker-compose.nginx.yml ps
```

## 🌍 **URLs sau khi deploy**

### **Production URLs:**
- **Landing Page**: https://wincloud.app
- **Control Panel**: https://panel.wincloud.app  
- **API Backend**: https://api.wincloud.app
- **API Docs**: https://api.wincloud.app/docs

### **Health Check URLs:**
- **Main Health**: https://wincloud.app/health
- **Panel Health**: https://panel.wincloud.app/health
- **API Health**: https://api.wincloud.app/health

## 📊 **Monitoring & Maintenance**

### **1. View Service Status:**
```bash
# Container status
./deploy-nginx.sh status

# Resource usage
docker stats

# Service health
./deploy-nginx.sh health
```

### **2. View Logs:**
```bash
# All services
./deploy-nginx.sh logs

# Specific service
docker-compose -f docker-compose.nginx.yml logs -f nginx
docker-compose -f docker-compose.nginx.yml logs -f backend
docker-compose -f docker-compose.nginx.yml logs -f redis
```

### **3. Database Management:**
```bash
# Connect to database
docker-compose -f docker-compose.nginx.yml exec db psql -U wincloud -d wincloud_prod

# Manual backup
./deploy-nginx.sh backup

# View backup files
docker-compose -f docker-compose.nginx.yml exec backup ls -la /backup/
```

### **4. Redis Management:**
```bash
# Connect to Redis
docker-compose -f docker-compose.nginx.yml exec redis redis-cli -a your-redis-password

# Redis info
docker-compose -f docker-compose.nginx.yml exec redis redis-cli -a your-redis-password INFO memory
```

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **1. SSL Certificate Errors:**
```bash
# Check certificate
./deploy-nginx.sh ssl

# Verify certificate files
ls -la nginx/ssl/
openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout | head -20
```

#### **2. Service Not Starting:**
```bash
# Check logs
./deploy-nginx.sh logs

# Check specific service
docker-compose -f docker-compose.nginx.yml logs backend
```

#### **3. Database Connection Issues:**
```bash
# Check database health
docker-compose -f docker-compose.nginx.yml exec db pg_isready -U wincloud

# Check environment variables
docker-compose -f docker-compose.nginx.yml exec backend env | grep DATABASE
```

#### **4. Redis Connection Issues:**
```bash
# Check Redis health
docker-compose -f docker-compose.nginx.yml exec redis redis-cli -a your-password ping

# Check Redis logs
docker-compose -f docker-compose.nginx.yml logs redis
```

#### **5. Domain Not Accessible:**
```bash
# Check DNS resolution
nslookup wincloud.app
nslookup panel.wincloud.app
nslookup api.wincloud.app

# Check CloudFlare proxy status
# Ensure DNS records are proxied (orange cloud)
```

### **Performance Issues:**
```bash
# Check resource usage
docker stats

# Check Nginx access logs
docker-compose -f docker-compose.nginx.yml exec nginx tail -f /var/log/nginx/access.log

# Check backend performance
curl -w "@curl-format.txt" -o /dev/null -s https://api.wincloud.app/health
```

## 🔄 **Updates & Maintenance**

### **1. Update Application:**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./deploy-nginx.sh stop
./deploy-nginx.sh setup
```

### **2. Update SSL Certificates:**
```bash
# Renew CloudFlare certificate (manual)
./scripts/setup-ssl-docker.sh

# Let's Encrypt auto-renewal (if using)
sudo certbot renew --dry-run
```

### **3. Database Maintenance:**
```bash
# Manual backup
./deploy-nginx.sh backup

# Database cleanup (if needed)
docker-compose -f docker-compose.nginx.yml exec db psql -U wincloud -d wincloud_prod -c "VACUUM ANALYZE;"
```

## 🎯 **Performance Optimization**

### **Nginx Optimization:**
- ✅ Gzip compression enabled
- ✅ Static file caching
- ✅ Rate limiting configured
- ✅ SSL session caching
- ✅ HTTP/2 enabled

### **Database Optimization:**
- ✅ Connection pooling
- ✅ Proper indexes
- ✅ Regular backups
- ✅ Health checks

### **Redis Optimization:**
- ✅ Memory limit set (512MB)
- ✅ LRU eviction policy
- ✅ AOF persistence
- ✅ Connection pooling

## 📈 **Scaling**

### **Horizontal Scaling:**
```bash
# Scale backend instances
docker-compose -f docker-compose.nginx.yml up -d --scale backend=3

# Load balancer configuration in nginx.conf
upstream backend_servers {
    server backend_1:5000;
    server backend_2:5000;
    server backend_3:5000;
}
```

### **Resource Limits:**
```yaml
# In docker-compose.nginx.yml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

## ✅ **Final Checklist**

### **Before Go-Live:**
- [ ] SSL certificates installed and valid
- [ ] DNS records pointing to VPS
- [ ] Environment variables configured
- [ ] DigitalOcean tokens added
- [ ] Database initialized
- [ ] Redis configured
- [ ] All services healthy
- [ ] Domains accessible
- [ ] API endpoints working
- [ ] Backup system active

### **Post-Deployment:**
- [ ] Monitor logs for errors
- [ ] Test VPS creation functionality
- [ ] Verify email notifications (if configured)
- [ ] Check OAuth login (if configured)
- [ ] Monitor resource usage
- [ ] Setup monitoring alerts

---

## 🎉 **Deployment Complete!**

WinCloud Builder giờ đã ready cho production với:
- ✅ **Full SSL/HTTPS** với CloudFlare
- ✅ **Nginx Reverse Proxy** với rate limiting
- ✅ **Redis** cho caching và sessions
- ✅ **PostgreSQL** với auto backup
- ✅ **Health checks** và monitoring
- ✅ **Domain routing** cho wincloud.app

### **Production URLs:**
- 🌍 **https://wincloud.app** - Landing page
- 🎛️ **https://panel.wincloud.app** - Control panel
- 🔧 **https://api.wincloud.app** - API backend

**Happy deployment! 🚀**
