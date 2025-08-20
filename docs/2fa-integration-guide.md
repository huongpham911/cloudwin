# 🔐 2FA Integration Guide - Hybrid System

## 📋 Tổng quan

WinCloud Builder hiện sử dụng **Hybrid 2FA System** kết hợp hai approaches:
1. **File-based 2FA** (hệ thống cũ) - lưu trong memory/file
2. **Database-based 2FA** (hệ thống mới) - lưu trong PostgreSQL với encryption

## 🔄 Cách hoạt động Integration

### ✅ **Setup 2FA mới**
- Luôn sử dụng **Enhanced Database System**
- Tự động tạo encrypted storage
- Backward compatibility với file system

### ✅ **Verify 2FA** 
- Ưu tiên **Database System** trước
- Fallback về **File System** nếu cần
- Auto-migration cho users thành công

### ✅ **Migration tự động**
- Users cũ được migrate khi login thành công
- Dữ liệu được encrypt và chuyển vào database
- File system vẫn hoạt động song song

## 🚀 API Endpoints

### Đã được cập nhật để support Hybrid:

```bash
POST /api/v1/auth/2fa/setup              # ✅ Hybrid Ready
POST /api/v1/auth/2fa/verify-setup       # ✅ Hybrid Ready  
POST /api/v1/auth/2fa/verify             # ✅ Hybrid Ready
GET  /api/v1/auth/2fa/status             # ✅ Hybrid Ready
POST /api/v1/auth/2fa/disable            # ✅ Hybrid Ready
POST /api/v1/auth/login                  # ✅ Hybrid Ready
```

### Response format mới:

**Setup 2FA:**
```json
{
  "secret": "JBSWY3DP...",
  "qr_code": "data:image/png;base64,...",
  "backup_codes": ["1234-5678", "2345-6789"],
  "instructions": [
    "Scan the QR code with your authenticator app",
    "Enter the 6-digit code to verify setup", 
    "Save backup codes securely"
  ]
}
```

**2FA Status:**
```json
{
  "enabled": true,
  "system": "database",          // "database" | "file" | null
  "verified": true,
  "migrated": true,
  "backup_codes_remaining": 7,
  "last_used_at": "2024-01-01T12:00:00Z",
  "migration_recommended": false
}
```

## 🔧 Technical Implementation

### Hybrid Service Architecture:
```
┌─────────────────────┐
│   API Endpoints     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Hybrid2FAService   │  ← Main orchestrator
└─────────┬───────────┘
          │
    ┌─────▼─────┐    ┌──────────────┐
    │ Enhanced  │    │  File-based  │
    │ Security  │    │  (Legacy)    │
    │ Service   │    │              │
    └─────┬─────┘    └──────┬───────┘
          │                 │
    ┌─────▼─────┐    ┌──────▼───────┐
    │PostgreSQL │    │  In-Memory   │
    │(Encrypted)│    │  Dictionary  │
    └───────────┘    └──────────────┘
```

### Key Features:
- ✅ **Seamless Migration**: Auto-migrate during successful logins
- ✅ **Backward Compatibility**: File system still works
- ✅ **Enhanced Security**: New setups use encrypted database
- ✅ **Fallback Support**: Graceful degradation if database fails
- ✅ **Audit Logging**: All operations logged for security

## 🔄 Migration Process

### 1. **Manual Migration Script**
```bash
cd backend
python scripts/migrate_2fa_to_database.py
```

### 2. **Automatic Migration** 
- Happens during successful 2FA login
- Transparent to users
- Preserves all existing backup codes

### 3. **Migration Status Check**
```python
# Check if user is migrated
status = hybrid_2fa.get_2fa_status(db, user_id, user_email)
is_migrated = status.get("migrated", False)
system_type = status.get("system")  # "database" | "file"
```

## 🛡️ Security Enhancements

### Database-based 2FA có:
- ✅ **AES Encryption** cho secrets và backup codes
- ✅ **Individual keys** per user  
- ✅ **Audit logging** cho mọi operations
- ✅ **Session tracking** with device fingerprinting
- ✅ **Risk scoring** và threat detection
- ✅ **Auto key rotation** capabilities

### File-based 2FA (legacy):
- ⚠️ **Plaintext storage** in memory
- ⚠️ **No audit logging**
- ⚠️ **No encryption**
- ⚠️ **Limited session management**

## 📊 Monitoring & Debugging

### Logs để track:
```bash
# Migration logs
✅ 2FA setup initiated for user {user_id} using hybrid system
✅ Successfully migrated user {user_id} 2FA to database
🔄 Scheduling auto-migration for user {user_id}

# Verification logs  
✅ 2FA verified for user {user_id} using enhanced system
✅ 2FA verified for user {user_id} using file system (fallback)
✅ Login with 2FA code for user {user_id} (hybrid)
```

### Status check endpoint:
```bash
GET /api/v1/auth/2fa/status
```

## 🚦 Deployment Steps

### 1. **Database Setup**
```bash
# Run Alembic migration
cd backend  
alembic upgrade head
```

### 2. **Start Application**
```bash
# Enhanced security features sẽ auto-initialize
python run_minimal_real_api.py
```

### 3. **Verify Integration**
```bash
# Test 2FA setup với user mới
curl -X POST /api/v1/auth/2fa/setup \
  -H "Authorization: Bearer {token}"

# Check status
curl -X GET /api/v1/auth/2fa/status \
  -H "Authorization: Bearer {token}"
```

## 🔮 Roadmap

### Phase 1: ✅ **Completed**
- [x] Hybrid service implementation
- [x] API endpoints integration
- [x] Migration script
- [x] Backward compatibility

### Phase 2: **Next Steps**
- [ ] Frontend UI updates
- [ ] Admin dashboard for 2FA management  
- [ ] Bulk migration tools
- [ ] Performance optimization

### Phase 3: **Future**
- [ ] WebAuthn support
- [ ] Hardware token support
- [ ] Risk-based authentication
- [ ] Complete file-system deprecation

## 🆘 Troubleshooting

### Common Issues:

**1. Migration fails:**
```bash
# Check database connection
python -c "from app.core.database import get_db; print('DB OK')"

# Check hybrid service
python -c "from app.services.hybrid_2fa_service import hybrid_2fa_service; print('Service OK')"
```

**2. 2FA verification fails:**
```bash
# Check logs for specific error
tail -f logs/app.log | grep "2FA"

# Test both systems
# Database: Enhanced security logs
# File: Legacy system logs
```

**3. Users stuck in file system:**
```bash
# Force migration
python scripts/migrate_2fa_to_database.py

# Or remove file-based 2FA to force re-setup
```

## 📞 Support

- **Logs**: Check `logs/app.log` for detailed 2FA operations
- **Database**: Check `two_factor_auth` table for migrated users
- **File System**: Check `app.registered_users` in memory
- **Hybrid Service**: Use `/api/v1/auth/2fa/status` endpoint

---

*🎯 Integration thành công! Users có thể continue sử dụng 2FA như bình thường, và system sẽ automatically upgrade security theo thời gian.*
