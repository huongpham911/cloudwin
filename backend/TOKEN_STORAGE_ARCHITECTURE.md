# 🔐 Token Storage Architecture - WinCloud Builder

## 📁 Cấu trúc lưu trữ tokens

### 1. **File chính - `user_tokens.json`**
**Vị trí:** `backend/user_tokens.json`
**Mục đích:** Lưu trữ TẤT CẢ tokens của tất cả users trong hệ thống

**Cấu trúc:**
```json
{
  "user_id_1": {
    "tokens": [
      {
        "token": "dop_v1_xxxxx...",
        "name": "token_name", 
        "added_at": "2025-08-03T22:19:27.284712",
        "is_valid": true,
        "last_used": "2025-08-04T11:21:53.340190"
      },
      // ... more tokens for this user
    ],
    "created_at": "2025-08-03T22:19:27.284694",
    "last_updated": "2025-08-03T22:19:27.284718"
  },
  "user_id_2": {
    // ... tokens for user 2
  }
}
```

### 2. **File secure - `tokens_secure.json`**
**Vị trí:** `backend/tokens_secure.json`
**Mục đích:** File chính lưu trữ tokens đã được mã hóa an toàn

**Cấu trúc:**
```json
{
  "users": {
    "admin_user": {
      "tokens": [
        {
          "encrypted_token": "Z0FBQUFBQm9wQzl5...",
          "salt": "W7D6cwenBW1e8/hZ/BbiSu6FvLSqmKvy9FXo54D8cxc=",
          "fingerprint": "d577c71d365aac12",
          "created_at": "2025-08-19T08:01:54.574044",
          "last_used": null,
          "usage_count": 0,
          "is_valid": true,
          "name": "Primary Token"
        }
      ],
      "created_at": "2025-08-18T14:44:50.309737",
      "total_tokens": 1,
      "updated_at": "2025-08-19T08:01:54.574082"
    }
  },
  "last_updated": "2025-08-19T08:01:54.574095",
  "version": "2.0",
  "encryption": "AES-256-Fernet-PBKDF2"
}
```

## 🔧 Services quản lý tokens

### 1. **UserTokenManager** 
**File:** `backend/user_token_manager.py`
**Chức năng:**
- Load/Save `user_tokens.json`
- Add/Remove tokens cho từng user
- Validate tokens

### 2. **SecureTokenService**
**File:** `backend/app/services/secure_token_service.py`
**Chức năng:**
- Mã hóa/giải mã tokens
- Lưu trữ an toàn
- Token rotation

## 📊 Admin Dashboard Token Analytics

### **Endpoint:** `GET /api/v1/admin/analytics`

**Cách hoạt động:**
1. **Primary:** Đọc từ `user_tokens.json` (chứa tất cả users)
2. **Fallback 1:** Đọc từ `secure_token_service` 
3. **Fallback 2:** Đọc từ `tokens.json` (legacy)

**Response format:**
```json
{
  "users": {
    "total": 10,
    "active": 8,
    "admin": 2,
    "with_tokens": 5
  },
  "tokens": {
    "total": 12,
    "valid": 10,
    "invalid": 2,
    "users_with_tokens": 5,
    "tokens_list": [
      {
        "user_email": "user@example.com",
        "user_name": "User Name",
        "user_id": "123",
        "token": "dop_v1_xxxxx...",
        "masked_token": "***...d645b5",
        "status": "valid",
        "valid": true,
        "created_at": "2025-08-03T22:19:27.284712",
        "last_used": "2025-08-04T11:21:53.340190",
        "name": "token_name"
      }
    ]
  },
  "droplets": {
    "total": 25,
    "running": 20,
    "stopped": 5
  },
  "system": {
    "uptime": "Running",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

## 🚀 Cách Admin Dashboard thống kê Spaces & Droplets

### **Process Flow:**
1. **Load tokens:** Admin analytics đọc `user_tokens.json` để lấy tất cả tokens
2. **For each valid token:**
   - Gọi DigitalOcean API để lấy Spaces keys
   - Gọi DigitalOcean API để lấy Droplets
   - Gọi DigitalOcean API để lấy Buckets và Files
3. **Aggregate data:** Tổng hợp tất cả dữ liệu từ các accounts
4. **Display:** Hiển thị thống kê tổng hợp

### **API Calls per Token:**
```
/spaces/                    → List Spaces keys
/spaces/buckets/           → List Buckets  
/spaces/buckets/{name}/files → List Files
/droplets                  → List Droplets
```

## 🔒 Security Notes

1. **Token Masking:** Chỉ hiển thị 10 ký tự cuối của token
2. **Admin Only:** Chỉ admin mới access được analytics endpoint
3. **Fallback Mechanism:** 3 tầng fallback đảm bảo luôn có data
4. **Error Handling:** Graceful degradation nếu tokens invalid

## 📝 File Locations Summary

```
backend/
├── user_tokens.json          ← MAIN FILE - All user tokens (plaintext)
├── tokens_secure.json        ← SECURE FILE - Encrypted tokens (primary)
├── tokens_encrypted.json     ← Encrypted tokens (if any)
├── user_token_manager.py     ← Token management class
└── app/services/
    ├── secure_token_service.py ← Encryption service
    └── digitalocean_service.py ← DO API service
```

## 🎯 Key Points

- **`user_tokens.json` là file chính** chứa tất cả tokens của tất cả users
- **Admin dashboard** đọc file này để thống kê toàn bộ hệ thống
- **Mỗi user** có thể có nhiều tokens
- **Tokens được validate** thông qua DigitalOcean API
- **Fallback mechanism** đảm bảo hệ thống luôn hoạt động
