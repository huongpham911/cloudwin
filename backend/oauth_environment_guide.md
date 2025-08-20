# OAuth Environment Configuration Guide for WinCloud Builder

## 🌍 **Dual Environment OAuth Setup**

WinCloud Builder now supports automatic OAuth URL switching between development and production environments.

## 🔧 **How It Works**

### **Environment Detection**
```python
# oauth_service.py automatically detects environment
ENVIRONMENT=development → http://localhost:5000/api/v1/auth/{provider}/callback
ENVIRONMENT=production  → https://api.wincloud.app/api/v1/auth/{provider}/callback
```

### **Automatic URL Generation**
```python
# Development
self.base_url = 'http://localhost:5000'

# Production  
self.base_url = 'https://api.wincloud.app'

# Callback URLs are generated automatically:
# - Google: {base_url}/api/v1/auth/google/callback
# - Facebook: {base_url}/api/v1/auth/facebook/callback
# - GitHub: {base_url}/api/v1/auth/github/callback
```

## 📋 **Facebook App Configuration**

### **Required Callback URLs (Both Environments)**
```yaml
Facebook App Settings > Products > Facebook Login > Settings:

Valid OAuth Redirect URIs:
  ✅ http://localhost:5000/api/v1/auth/facebook/callback
  ✅ https://api.wincloud.app/api/v1/auth/facebook/callback

App Domains:
  ✅ localhost
  ✅ wincloud.app
  ✅ api.wincloud.app

Site URL (Primary):
  Development: http://localhost:5173
  Production: https://wincloud.app
```

## 🧪 **Testing OAuth Endpoints**

### **Development Testing**
```bash
# Set environment to development
ENVIRONMENT=development

# Test Facebook OAuth
GET http://localhost:5000/api/v1/auth/facebook

# Expected response:
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=http://localhost:5000/api/v1/auth/facebook/callback&scope=email,public_profile&response_type=code&state=random_state",
  "provider": "facebook"
}
```

### **Production Testing**
```bash
# Set environment to production
ENVIRONMENT=production

# Test Facebook OAuth
GET https://api.wincloud.app/api/v1/auth/facebook

# Expected response:
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=https://api.wincloud.app/api/v1/auth/facebook/callback&scope=email,public_profile&response_type=code&state=random_state",
  "provider": "facebook"
}
```

## 🔄 **Environment Configuration Files**

### **Development (.env or .env.oauth)**
```bash
ENVIRONMENT=development
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GITHUB_CLIENT_ID=Ov23liL6OdNV2AswPsZs
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **Production (configs/production.env)**
```bash
ENVIRONMENT=production
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GITHUB_CLIENT_ID=Ov23liL6OdNV2AswPsZs
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🚀 **Deployment Process**

### **Step 1: Development Setup**
```bash
1. Create Facebook App at https://developers.facebook.com/
2. Configure callback URLs (include both dev and prod)
3. Get App ID and App Secret
4. Update .env.oauth with credentials
5. Set ENVIRONMENT=development
6. Test with localhost endpoints
```

### **Step 2: Production Deployment**
```bash
1. Update production config files
2. Set ENVIRONMENT=production
3. Deploy to server
4. Test with domain endpoints
5. Verify OAuth flow works end-to-end
```

## ⚡ **Benefits**

### **Seamless Environment Switching**
- ✅ No code changes needed between environments
- ✅ Automatic URL detection
- ✅ Single OAuth service for all providers
- ✅ Environment-aware redirect URLs

### **Easy Testing**
- 🧪 Test development locally
- 🚀 Deploy to production without changes
- 🔄 Switch environments with single variable
- 📊 Consistent OAuth flow across environments

## 🔧 **Troubleshooting**

### **Common Issues**
```yaml
Issue: OAuth callback fails
Solution: 
  - Check ENVIRONMENT variable is set correctly
  - Verify Facebook App has both callback URLs
  - Ensure domain/localhost is accessible

Issue: Wrong redirect URL
Solution:
  - Verify ENVIRONMENT=production in production
  - Check Facebook App callback URL configuration
  - Confirm base_url generation in oauth_service.py

Issue: Facebook App not found
Solution:
  - Verify FACEBOOK_APP_ID is correct
  - Check App is in Live mode (for production)
  - Confirm App Secret is properly set
```

## 📝 **Configuration Checklist**

### **Facebook App Configuration**
- [ ] App created at https://developers.facebook.com/
- [ ] Facebook Login product added
- [ ] Both callback URLs configured
- [ ] App domains set correctly
- [ ] App is in Live mode (for production)
- [ ] Privacy Policy URL set (for Live mode)

### **WinCloud Configuration**
- [ ] FACEBOOK_APP_ID set in environment files
- [ ] FACEBOOK_APP_SECRET set securely
- [ ] ENVIRONMENT variable configured correctly
- [ ] OAuth service updated with dual environment support
- [ ] All config files updated (dev and prod)

### **Testing Checklist**
- [ ] Development OAuth flow works
- [ ] Production OAuth flow works
- [ ] Environment switching works correctly
- [ ] Callback URLs resolve properly
- [ ] User data is fetched successfully
