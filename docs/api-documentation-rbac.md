# WinCloud Builder API Documentation - RBAC Enabled

## Authentication & Authorization

### Overview
WinCloud Builder now implements Role-Based Access Control (RBAC) with two primary roles:
- **Admin**: Full system access including user management and system configuration
- **User**: Standard access to personal droplets and basic functionality

### Authentication Flow

#### 1. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "secure_password"
}
```

**Response:**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "user": {
        "id": "user-123",
        "username": "admin",
        "email": "admin@example.com",
        "role": {
            "name": "admin",
            "display_name": "Administrator",
            "permissions": ["all"]
        },
        "is_active": true
    }
}
```

#### 2. Protected Requests
Include the token in the Authorization header:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## API Endpoints by Role

### Public Endpoints (No Authentication Required)

#### Health Check
```http
GET /api/v1/health
```

#### System Status
```http
GET /api/v1/status
```

### User Endpoints (Requires Authentication)

#### Get Current User Profile
```http
GET /api/v1/users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
    "id": "user-123",
    "username": "user1",
    "email": "user1@example.com",
    "role": {
        "name": "user",
        "display_name": "Standard User"
    },
    "created_at": "2024-01-15T10:00:00Z",
    "is_active": true
}
```

#### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
    "email": "newemail@example.com"
}
```

#### Change Password
```http
POST /api/v1/users/me/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
    "current_password": "old_password",
    "new_password": "new_secure_password"
}
```

#### Get User Droplets
```http
GET /api/v1/droplets
Authorization: Bearer {token}
```

**Response:**
```json
{
    "droplets": [
        {
            "id": "droplet-123",
            "name": "my-windows-rdp",
            "status": "active",
            "ip": "159.89.123.456",
            "size": "s-2vcpu-4gb",
            "region": "nyc3",
            "created_at": "2024-01-15T10:00:00Z",
            "owner_id": "user-123"
        }
    ],
    "total": 1
}
```

#### Create Droplet
```http
POST /api/v1/droplets
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "my-new-rdp",
    "size": "s-2vcpu-4gb",
    "region": "nyc3",
    "template_id": "windows-rdp-template"
}
```

#### Droplet Actions (Power On/Off, Restart)
```http
POST /api/v1/droplets/{droplet_id}/actions
Authorization: Bearer {token}
Content-Type: application/json

{
    "action": "power_on"  // power_on, power_off, restart
}
```

#### Delete User Droplet
```http
DELETE /api/v1/droplets/{droplet_id}
Authorization: Bearer {token}
```

### Admin-Only Endpoints

#### User Management

##### List All Users
```http
GET /api/v1/admin/users
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
    "users": [
        {
            "id": "user-123",
            "username": "user1",
            "email": "user1@example.com",
            "role": {
                "name": "user",
                "display_name": "Standard User"
            },
            "is_active": true,
            "created_at": "2024-01-15T10:00:00Z",
            "last_login": "2024-01-16T14:30:00Z"
        }
    ],
    "total": 1,
    "page": 1,
    "per_page": 10
}
```

##### Create User
```http
POST /api/v1/admin/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "secure_password",
    "role_name": "user"
}
```

##### Update User
```http
PUT /api/v1/admin/users/{user_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
    "email": "updated@example.com",
    "is_active": true,
    "role_name": "admin"
}
```

##### Delete User
```http
DELETE /api/v1/admin/users/{user_id}
Authorization: Bearer {admin_token}
```

##### Reset User Password
```http
POST /api/v1/admin/users/{user_id}/reset-password
Authorization: Bearer {admin_token}
Content-Type: application/json

{
    "new_password": "new_secure_password"
}
```

#### System Management

##### Get All Droplets (Admin View)
```http
GET /api/v1/admin/droplets
Authorization: Bearer {admin_token}
```

**Response includes all droplets from all users:**
```json
{
    "droplets": [
        {
            "id": "droplet-123",
            "name": "user1-rdp",
            "status": "active",
            "owner": {
                "id": "user-123",
                "username": "user1",
                "email": "user1@example.com"
            },
            "ip": "159.89.123.456",
            "size": "s-2vcpu-4gb",
            "region": "nyc3",
            "created_at": "2024-01-15T10:00:00Z"
        }
    ],
    "total": 1
}
```

##### Force Delete Any Droplet
```http
DELETE /api/v1/admin/droplets/{droplet_id}
Authorization: Bearer {admin_token}
```

##### Get System Statistics
```http
GET /api/v1/admin/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
    "total_users": 25,
    "active_users": 23,
    "total_droplets": 45,
    "active_droplets": 42,
    "total_admin_users": 2,
    "system_uptime": "5 days, 14:23:45",
    "api_requests_today": 1234,
    "storage_used": "1.2GB"
}
```

##### Audit Logs
```http
GET /api/v1/admin/audit-logs
Authorization: Bearer {admin_token}
```

## Error Responses

### Authentication Errors
```json
{
    "detail": "Invalid credentials",
    "status_code": 401
}
```

### Authorization Errors
```json
{
    "detail": "Insufficient permissions. Admin role required.",
    "status_code": 403
}
```

### Validation Errors
```json
{
    "detail": [
        {
            "loc": ["body", "email"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ],
    "status_code": 422
}
```

### Resource Not Found
```json
{
    "detail": "User not found",
    "status_code": 404
}
```

## Rate Limiting

### User Endpoints
- **General API calls**: 100 requests per minute
- **Droplet creation**: 5 requests per hour
- **Password changes**: 3 requests per hour

### Admin Endpoints
- **User management**: 200 requests per minute
- **System operations**: 500 requests per minute

## Security Features

### JWT Token Security
- **Expiration**: 24 hours
- **Refresh**: Automatic refresh on valid requests
- **Invalidation**: Tokens invalidated on password change or role change

### Permission Validation
- Every protected endpoint validates user permissions
- Role-based access control enforced at API level
- User isolation for resource access (users can only access their own droplets)

### Audit Logging
- All admin actions are logged
- User login/logout events tracked
- Failed authentication attempts recorded
- Droplet creation/deletion logged with user context

## Integration Examples

### Frontend Authentication Flow
```javascript
// Login
const loginResponse = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'admin',
        password: 'password'
    })
});

const { access_token, user } = await loginResponse.json();

// Store token
localStorage.setItem('token', access_token);
localStorage.setItem('user', JSON.stringify(user));

// Make authenticated requests
const droplets = await fetch('/api/v1/droplets', {
    headers: {
        'Authorization': `Bearer ${access_token}`
    }
});
```

### Python Client Example
```python
import requests

class WinCloudClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.login(username, password)
    
    def login(self, username, password):
        response = self.session.post(f"{self.base_url}/api/v1/auth/login", 
                                   json={"username": username, "password": password})
        data = response.json()
        self.session.headers.update({
            'Authorization': f"Bearer {data['access_token']}"
        })
        self.user = data['user']
    
    def get_droplets(self):
        response = self.session.get(f"{self.base_url}/api/v1/droplets")
        return response.json()
    
    def create_droplet(self, name, size, region):
        response = self.session.post(f"{self.base_url}/api/v1/droplets",
                                   json={"name": name, "size": size, "region": region})
        return response.json()

# Usage
client = WinCloudClient('http://localhost:5000', 'admin', 'password')
droplets = client.get_droplets()
```

## Testing Endpoints

### Quick Health Check
```bash
curl -X GET http://localhost:5000/api/v1/health
```

### Test Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use the returned token for authenticated requests
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Admin Operations
```bash
# List all users (admin only)
curl -X GET http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get system stats (admin only)
curl -X GET http://localhost:5000/api/v1/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Migration Notes

### Upgrading from Non-RBAC Version
1. Run the migration script: `python scripts/migrate_to_rbac.py`
2. Set up first admin account: `python scripts/setup_admin.py`
3. Update frontend to handle role-based routing
4. Update any existing API clients to include authentication headers

### Breaking Changes
- All endpoints (except public ones) now require authentication
- User endpoints now only return data owned by the authenticated user
- Admin endpoints moved to `/admin/` namespace
- JWT tokens required for all protected operations

This completes the RBAC-enabled API documentation. All endpoints now properly handle authentication and authorization according to user roles.
