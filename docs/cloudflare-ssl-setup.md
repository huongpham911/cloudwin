# 🌩️ CloudFlare SSL Setup for WinCloud.app

## 🎯 Domain Architecture

```
┌─────────────────────────────────────────────────────┐
│                CloudFlare Edge                       │
├─────────────────────────────────────────────────────┤
│ wincloud.app         → Home/Landing (Port 7000)    │
│ api.wincloud.app     → API Backend  (Port 5000)    │
│ vps.wincloud.app     → VPS Frontend (Port 5173)    │
└─────────────────────────────────────────────────────┘
                         │
                   ┌─────▼─────┐
                   │   Server  │
                   │ (Your VPS)│
                   └───────────┘
```

## 🔐 CloudFlare SSL Configuration

### **1. SSL/TLS Settings:**
```yaml
# CloudFlare Dashboard → SSL/TLS → Overview
Encryption Mode: "Full (Strict)"
# Ensures end-to-end encryption

# CloudFlare Dashboard → SSL/TLS → Edge Certificates
Always Use HTTPS: "On"
Minimum TLS Version: "TLS 1.2"
Opportunistic Encryption: "On"
TLS 1.3: "On"
Automatic HTTPS Rewrites: "On"
```

### **2. DNS Records Setup:**
```dns
# CloudFlare DNS Records
Type  Name                  Content              Proxy  TTL
A     wincloud.app         YOUR_SERVER_IP       ✅     Auto
A     api.wincloud.app     YOUR_SERVER_IP       ✅     Auto  
A     vps.wincloud.app     YOUR_SERVER_IP       ✅     Auto
A     www.wincloud.app     YOUR_SERVER_IP       ✅     Auto
```

### **3. Page Rules (Important!):**
```yaml
# Rule 1: Force HTTPS
URL: "*wincloud.app/*"
Settings: "Always Use HTTPS"

# Rule 2: Security Headers
URL: "api.wincloud.app/*"
Settings: 
  - "Security Level: High"
  - "Browser Integrity Check: On"

# Rule 3: Cache Rules
URL: "wincloud.app/*"
Settings: "Cache Level: Standard"
```

## 🛡️ Security Headers via CloudFlare

### **Transform Rules → Modify Response Header:**
```yaml
# For api.wincloud.app
When: hostname equals "api.wincloud.app"
Then: Set static → 
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

## 🚀 Origin Server Configuration

### **Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/wincloud
server {
    listen 80;
    server_name wincloud.app www.wincloud.app;
    
    # Redirect to HTTPS (CloudFlare handles this, but backup)
    return 301 https://$server_name$request_uri;
}

# Home/Landing - Port 7000
server {
    listen 443 ssl;
    server_name wincloud.app www.wincloud.app;
    
    # CloudFlare Origin Certificate
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    
    location / {
        proxy_pass http://localhost:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# API Backend - Port 5000
server {
    listen 443 ssl;
    server_name api.wincloud.app;
    
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # API specific headers
        proxy_set_header X-API-Domain api.wincloud.app;
        
        # CORS for API
        add_header Access-Control-Allow-Origin "https://vps.wincloud.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    }
}

# VPS Frontend - Port 5173
server {
    listen 443 ssl;
    server_name vps.wincloud.app;
    
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # WebSocket support for Vite dev server
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📋 SSL Certificate Setup

### **Option 1: CloudFlare Origin Certificate (Recommended)**
```bash
# Generate in CloudFlare Dashboard
# SSL/TLS → Origin Server → Create Certificate

# Download and install:
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo nano /etc/ssl/certs/wincloud.app.pem    # Paste certificate
sudo nano /etc/ssl/private/wincloud.app.key  # Paste private key
sudo chmod 600 /etc/ssl/private/wincloud.app.key
```

### **Option 2: Let's Encrypt (Alternative)**
```bash
# If you want Let's Encrypt instead
sudo certbot --nginx -d wincloud.app -d www.wincloud.app -d api.wincloud.app -d vps.wincloud.app
```

## 🔧 Application Configuration Updates

### **Backend API (Port 5000):**
```python
# Update allowed hosts in FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.wincloud.app", "localhost", "127.0.0.1"]
)

# Update CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wincloud.app",
        "https://vps.wincloud.app", 
        "https://www.wincloud.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### **Frontend (Port 5173):**
```typescript
// Update API base URL
const API_BASE_URL = 'https://api.wincloud.app'

// Update in vite.config.ts
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  // Remove proxy since we're using separate domain
})
```

## 🚀 Deployment Script

### **deploy-ssl.sh:**
```bash
#!/bin/bash
echo "🌩️ Deploying WinCloud with CloudFlare SSL..."

# 1. Update Nginx configuration
sudo cp nginx/wincloud.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/wincloud.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 2. Start services
pm2 start ecosystem.config.js

# 3. Verify SSL
echo "🔍 Testing SSL endpoints..."
curl -I https://wincloud.app
curl -I https://api.wincloud.app/health  
curl -I https://vps.wincloud.app

echo "✅ Deployment complete!"
```

## 📊 Performance Optimization

### **CloudFlare Settings:**
```yaml
# Performance → Optimization
Auto Minify: 
  - JavaScript: On
  - CSS: On
  - HTML: On

Rocket Loader: On
Mirage: On (for images)
Polish: Lossy (compress images)

# Caching → Configuration  
Browser Cache TTL: 4 hours
```

## 🛡️ Security Recommendations

### **CloudFlare Firewall:**
```yaml
# Firewall Rules
Rule 1: "Block threats"
Expression: (cf.threat_score > 10)
Action: Block

Rule 2: "Rate limit API"  
Expression: (http.host eq "api.wincloud.app")
Action: Rate limit (100 requests per minute)

Rule 3: "Geo-blocking" (optional)
Expression: (ip.geoip.country ne "VN" and ip.geoip.country ne "US")
Action: Challenge
```

## 🔍 Monitoring & Analytics

### **CloudFlare Analytics:**
- Monitor traffic patterns
- Track security threats
- Performance metrics
- SSL certificate status

### **Health Checks:**
```bash
# Add to crontab
*/5 * * * * curl -sf https://api.wincloud.app/health || echo "API Down"
*/5 * * * * curl -sf https://vps.wincloud.app || echo "Frontend Down"  
*/5 * * * * curl -sf https://wincloud.app || echo "Home Down"
```
