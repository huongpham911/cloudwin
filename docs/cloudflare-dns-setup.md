# 🌩️ CloudFlare DNS Setup for WinCloud
## Server IP: 139.99.91.108

## 📋 DNS Records Setup

### **Step 1: Add DNS Records in CloudFlare**

Go to **CloudFlare Dashboard** → **DNS** → **Records**

Add these A records:

```dns
Type  Name                  Content           Proxy Status  TTL
A     wincloud.app         139.99.91.108     🟠 Proxied    Auto
A     panel.wincloud.app   139.99.91.108     🟠 Proxied    Auto  
A     api.wincloud.app     139.99.91.108     🟠 Proxied    Auto
A     www.wincloud.app     139.99.91.108     🟠 Proxied    Auto
```

### **Step 2: SSL/TLS Configuration**

1. **Go to SSL/TLS → Overview**
   - Set Encryption Mode: **"Full (Strict)"**

2. **Go to SSL/TLS → Edge Certificates**
   - Always Use HTTPS: **ON**
   - Minimum TLS Version: **TLS 1.2**
   - TLS 1.3: **ON**
   - Automatic HTTPS Rewrites: **ON**

### **Step 3: Create Origin Certificate**

1. **Go to SSL/TLS → Origin Server**
2. **Click "Create Certificate"**
3. **Settings:**
   - Key Type: **RSA (2048)**
   - Hostnames: `*.wincloud.app, wincloud.app`
   - Certificate Validity: **15 years**
4. **Click "Create"**

5. **Save the files on your VPS:**
```bash
# Certificate (save as /etc/ssl/certs/wincloud.app.pem)
sudo nano /etc/ssl/certs/wincloud.app.pem
# Paste the Origin Certificate

# Private Key (save as /etc/ssl/private/wincloud.app.key)  
sudo nano /etc/ssl/private/wincloud.app.key
# Paste the Private key

# Set correct permissions
sudo chmod 644 /etc/ssl/certs/wincloud.app.pem
sudo chmod 600 /etc/ssl/private/wincloud.app.key
```

### **Step 4: Page Rules (Optional but Recommended)**

**Go to Rules → Page Rules**

**Rule 1: Force HTTPS**
- URL: `*wincloud.app/*`
- Setting: **Always Use HTTPS**

**Rule 2: Cache API Responses**  
- URL: `api.wincloud.app/api/v1/public/*`
- Settings: **Cache Level: Standard**

### **Step 5: Security Settings**

**Go to Security → Settings**
- Security Level: **Medium**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **ON**
- Privacy Pass Support: **ON**

### **Step 6: Firewall Rules (Optional)**

**Go to Security → WAF**

**Rule 1: Rate Limiting for API**
```
Rule Name: API Rate Limit
Field: Hostname
Operator: equals
Value: api.wincloud.app
Action: Rate Limit (100 requests per minute)
```

**Rule 2: Block Bad Bots**
```
Rule Name: Block Bad Bots
Field: User Agent  
Operator: contains
Value: sqlmap
Action: Block
```

### **Step 7: Performance Optimization**

**Go to Speed → Optimization**
- Auto Minify: **JavaScript: ON, CSS: ON, HTML: ON**
- Rocket Loader: **ON**
- Mirage: **ON**

**Go to Caching → Configuration**
- Caching Level: **Standard**
- Browser Cache TTL: **4 hours**

## 🔍 **Verification Commands**

Run these on your VPS to verify DNS:

```bash
# Check DNS resolution
nslookup wincloud.app
nslookup panel.wincloud.app
nslookup api.wincloud.app

# Check if pointing to your IP
dig +short wincloud.app
dig +short panel.wincloud.app  
dig +short api.wincloud.app

# Test SSL connectivity
curl -I https://wincloud.app
curl -I https://panel.wincloud.app
curl -I https://api.wincloud.app/health
```

## 📊 **Expected Results:**

All domains should resolve to: **139.99.91.108**

SSL test should show:
- ✅ HTTPS working
- ✅ Valid SSL certificate
- ✅ Secure connection

## ⚠️ **Important Notes:**

1. **DNS Propagation**: May take 5-15 minutes
2. **Proxy Status**: Keep "Proxied" ON for DDoS protection
3. **Origin Certificate**: Only works with CloudFlare proxy
4. **Backup**: Save certificate files securely

## 🚀 **Quick Setup Script:**

```bash
# Run this on your VPS after DNS setup
sudo apt update
git clone https://github.com/your-repo/wincloud-builder.git
cd wincloud-builder
chmod +x scripts/setup-2gb-vps.sh
./scripts/setup-2gb-vps.sh
```

---

**🎯 After DNS setup is complete, your domains will be:**
- **https://wincloud.app** → Landing Page
- **https://panel.wincloud.app** → Control Panel  
- **https://api.wincloud.app** → API Backend
