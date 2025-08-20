# 🛡️ WinCloud Builder - Enhanced Security Features

## 📋 Tổng Quan

WinCloud Builder hiện đã được trang bị **enterprise-grade security** với các tính năng bảo mật nâng cao:

### ✅ **Các Tính Năng Bảo Mật Mới:**

1. **🔐 Two-Factor Authentication (2FA)**
   - TOTP-based authentication
   - QR code setup với authenticator apps
   - Backup codes cho recovery
   - Disable/enable 2FA

2. **🔑 Encrypted API Key Management**
   - User-specific encryption
   - Key rotation scheduling
   - Usage tracking
   - Secure storage

3. **📱 Enhanced Session Management**
   - Device fingerprinting
   - Multi-session tracking
   - Session termination
   - Geographic tracking

4. **📊 Security Monitoring & Logging**
   - Detailed audit trails
   - Real-time threat detection
   - Security dashboard
   - Alert management

5. **🚨 Threat Detection & Response**
   - Brute force protection
   - Suspicious activity detection
   - Automated IP blocking
   - Risk scoring

## 🚀 API Endpoints

### **2FA Endpoints**

```bash
# Setup 2FA
POST /api/v1/security/2fa/setup
Response: QR code, backup codes, secret

# Verify 2FA setup
POST /api/v1/security/2fa/verify-setup
Body: {"token": "123456"}

# Verify 2FA token
POST /api/v1/security/2fa/verify
Body: {"token": "123456"}

# Disable 2FA
DELETE /api/v1/security/2fa/disable
Body: {"token": "123456"}

# Get 2FA status
GET /api/v1/security/2fa/status
```

### **Session Management**

```bash
# Get active sessions
GET /api/v1/security/sessions

# Terminate specific session
DELETE /api/v1/security/sessions/{session_id}

# Terminate all sessions
DELETE /api/v1/security/sessions/all
```

### **Security Monitoring**

```bash
# Get security events
GET /api/v1/security/events?limit=50&risk_level=high

# Security dashboard (Admin only)
GET /api/v1/security/dashboard
```

### **API Key Management**

```bash
# Create encrypted API key
POST /api/v1/security/api-keys
Body: {
  "key_name": "DigitalOcean Production",
  "key_type": "digitalocean", 
  "api_key": "dop_v1_xxx...",
  "auto_expire": true
}

# List API keys
GET /api/v1/security/api-keys

# Revoke API key
DELETE /api/v1/security/api-keys/{key_id}
```

## 🔧 Setup & Configuration

### **1. Environment Variables**

Thêm vào `.env`:

```bash
# Security Settings
SECURITY_ENCRYPTION_KEY=auto-generated
REDIS_URL=redis://localhost:6379/2
SECURITY_SESSION_TIMEOUT=1800
SECURITY_MAX_CONCURRENT_SESSIONS=3
SECURITY_2FA_ISSUER=WinCloud Builder
```

### **2. Database Migration**

```bash
cd backend
alembic upgrade head
```

### **3. Install Dependencies**

```bash
pip install cryptography==41.0.7 pyotp==2.9.0 qrcode[pil]==7.4.2
```

## 📱 Frontend Integration

### **2FA Setup Flow**

```typescript
// 1. Initiate 2FA setup
const setupResponse = await api.post('/security/2fa/setup');
const { qr_code, backup_codes, secret } = setupResponse.data;

// 2. Display QR code to user
<img src={qr_code} alt="2FA QR Code" />

// 3. User scans with authenticator app

// 4. Verify setup
const verifyResponse = await api.post('/security/2fa/verify-setup', {
  token: userInput
});

// 5. Show backup codes
backup_codes.forEach(code => console.log(code));
```

### **Session Management UI**

```typescript
// Get active sessions
const sessions = await api.get('/security/sessions');

// Display session list
sessions.data.map(session => (
  <div key={session.session_id}>
    <span>{session.location}</span>
    <span>{session.last_activity}</span>
    <button onClick={() => terminateSession(session.session_id)}>
      Terminate
    </button>
  </div>
));

// Terminate session
const terminateSession = async (sessionId) => {
  await api.delete(`/security/sessions/${sessionId}`);
};
```

### **API Key Management**

```typescript
// Create encrypted API key
const createKey = async (keyData) => {
  const response = await api.post('/security/api-keys', {
    key_name: keyData.name,
    key_type: 'digitalocean',
    api_key: keyData.key,
    auto_expire: true
  });
  
  return response.data;
};

// List encrypted keys
const listKeys = async () => {
  const response = await api.get('/security/api-keys');
  return response.data.api_keys;
};
```

## 🛡️ Security Best Practices

### **1. 2FA Implementation**

```python
# Backend verification
from app.services.security_service import enhanced_security

@router.post("/sensitive-operation")
async def sensitive_operation(
    request: SensitiveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Require 2FA for sensitive operations
    if not enhanced_security.verify_2fa_token(
        db, current_user.id, request.two_fa_token
    ):
        raise HTTPException(status_code=403, detail="2FA required")
    
    # Proceed with operation
    result = perform_sensitive_operation()
    
    # Log security event
    enhanced_security.log_security_event(
        db, current_user.id, "sensitive_operation_performed",
        {"operation": "api_key_creation"},
        risk_level="medium"
    )
    
    return result
```

### **2. Session Security**

```python
# Enhanced login with session tracking
@router.post("/login")
async def login(
    request: LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    user = authenticate_user(request.email, request.password)
    
    # Create secure session
    session_data = enhanced_security.create_secure_session(
        db, user.id, http_request
    )
    
    # Generate JWT with session ID
    access_token = create_access_token(
        subject=user.id,
        additional_claims={"session_id": session_data["session_id"]}
    )
    
    return {
        "access_token": access_token,
        "session_id": session_data["session_id"],
        "requires_2fa": has_2fa_enabled(user.id)
    }
```

### **3. API Key Security**

```python
# Secure API key usage
def get_decrypted_api_key(user_id: str, key_type: str) -> str:
    api_key_record = db.query(APIKeyManagement).filter(
        APIKeyManagement.user_id == user_id,
        APIKeyManagement.key_type == key_type,
        APIKeyManagement.is_active == True
    ).first()
    
    if not api_key_record:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Decrypt and return
    return enhanced_security.decrypt_api_key(
        api_key_record.encrypted_key, user_id
    )
```

## 📊 Security Monitoring

### **Security Dashboard Metrics**

```json
{
  "recent_events_24h": 45,
  "high_risk_events_7d": 3,
  "active_sessions": 12,
  "blocked_ips": 5,
  "security_alerts": 2,
  "failed_logins_24h": 8,
  "successful_logins_24h": 156,
  "2fa_adoption_rate": 78.5,
  "total_users": 245,
  "users_with_2fa": 192
}
```

### **Security Event Types**

- `login_success` / `login_failed`
- `2fa_setup_initiated` / `2fa_enabled` / `2fa_disabled`
- `session_created` / `session_terminated`
- `api_key_created` / `api_key_revoked`
- `password_changed`
- `suspicious_activity_detected`
- `ip_blocked` / `ip_unblocked`

### **Risk Levels**

- `low` - Normal activities
- `medium` - Potentially suspicious
- `high` - Likely security threat
- `critical` - Active security incident

## 🚨 Incident Response

### **Automated Response**

```python
# Auto-block on suspicious activity
def handle_suspicious_activity(user_id: str, ip_address: str):
    # Log high-risk event
    enhanced_security.log_security_event(
        db, user_id, "suspicious_activity_detected",
        {
            "ip_address": ip_address,
            "activity_type": "multiple_failed_logins",
            "threshold_exceeded": True
        },
        risk_level="high"
    )
    
    # Auto-block IP
    enhanced_security.block_ip(ip_address, duration=3600)
    
    # Terminate all user sessions
    enhanced_security.terminate_all_user_sessions(user_id)
    
    # Send security alert
    send_security_notification(user_id, "account_security_alert")
```

### **Manual Response**

```bash
# Admin endpoints for incident response
POST /api/v1/security/alerts/{alert_id}/resolve
PUT  /api/v1/security/users/{user_id}/lock
POST /api/v1/security/ip/{ip_address}/block
DELETE /api/v1/security/sessions/terminate-all/{user_id}
```

## 🔄 Maintenance & Updates

### **Regular Security Tasks**

```bash
# Weekly security review
GET /api/v1/security/dashboard
GET /api/v1/security/events?risk_level=high&limit=100

# Monthly key rotation
GET /api/v1/security/api-keys?expires_soon=true

# Quarterly security audit
GET /api/v1/security/audit-report?period=3months
```

### **Security Metrics Monitoring**

- Failed login rate < 5%
- 2FA adoption rate > 80%
- Session hijacking attempts = 0
- API key rotation compliance > 95%

## 🎯 Production Deployment

### **1. Security Checklist**

- [ ] Change default SECRET_KEY
- [ ] Enable HTTPS/TLS
- [ ] Configure Redis for session storage
- [ ] Set up security monitoring alerts
- [ ] Enable audit logging
- [ ] Configure backup encryption keys
- [ ] Test 2FA setup flow
- [ ] Verify API key encryption

### **2. Performance Considerations**

- Redis session storage for fast lookups
- Database indexes on security tables
- Rate limiting on security endpoints
- Background jobs for cleanup tasks

### **3. Compliance & Auditing**

- GDPR-compliant data handling
- SOC 2 security controls
- Regular penetration testing
- Security incident documentation

## 📚 Dependencies

```bash
# Core Security
cryptography==41.0.7    # Encryption/decryption
pyotp==2.9.0            # TOTP 2FA
qrcode[pil]==7.4.2      # QR code generation

# Infrastructure
redis>=4.0.0            # Session storage
fastapi>=0.104.1        # Security middleware
sqlalchemy>=2.0.23      # Secure database queries
```

## 🔗 Related Documentation

- [API Documentation](api-documentation-rbac.md)
- [SQLAlchemy Best Practices](sqlalchemy-best-practices.md)
- [Production Deployment](production-deployment.md)
- [Database Monitoring](../backend/app/api/v1/database_monitor.py)

---

**🛡️ Security is a continuous process. Regularly review and update these implementations based on the latest threats and best practices.**
