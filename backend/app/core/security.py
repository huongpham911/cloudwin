from datetime import datetime, timedelta
from typing import Any, Union, Optional, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import secrets
import string
import hashlib
import hmac
import time
from fastapi import HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from redis import Redis
import json

# Redis for rate limiting and security
redis_client = Redis(host='localhost', port=6379, db=1, decode_responses=True)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityService:
    def __init__(self):
        self.failed_attempts = {}
        self.blocked_ips = set()
        
    def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if request is within rate limit"""
        current_time = int(time.time())
        window_start = current_time - window
        
        # Get current requests in window
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window)
        
        results = pipe.execute()
        request_count = results[1]
        
        return request_count < limit
    
    def log_failed_login(self, ip_address: str, email: str):
        """Log failed login attempt"""
        key = f"failed_login:{ip_address}"
        current_time = int(time.time())
        
        # Increment failed attempts
        pipe = redis_client.pipeline()
        pipe.zadd(key, {str(current_time): current_time})
        pipe.zcount(key, current_time - 3600, current_time)  # Last hour
        pipe.expire(key, 3600)
        
        results = pipe.execute()
        failed_count = results[1]
        
        # Block IP after 5 failed attempts in 1 hour
        if failed_count >= 5:
            self.block_ip(ip_address, duration=3600)
            
        # Log security event
        self.log_security_event({
            'type': 'failed_login',
            'ip_address': ip_address,
            'email': email,
            'failed_count': failed_count,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def block_ip(self, ip_address: str, duration: int = 3600):
        """Block IP address for specified duration"""
        redis_client.setex(f"blocked_ip:{ip_address}", duration, "1")
        self.blocked_ips.add(ip_address)
        
        self.log_security_event({
            'type': 'ip_blocked',
            'ip_address': ip_address,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is blocked"""
        return redis_client.exists(f"blocked_ip:{ip_address}")
    
    def validate_input_security(self, data: Dict) -> Dict:
        """Validate input for security threats"""
        threats = []
        
        for key, value in data.items():
            if isinstance(value, str):
                # SQL Injection patterns
                sql_patterns = ['union', 'select', 'drop', 'delete', 'insert', 'update', '--', ';']
                if any(pattern in value.lower() for pattern in sql_patterns):
                    threats.append(f"Potential SQL injection in {key}")
                
                # XSS patterns
                xss_patterns = ['<script', 'javascript:', 'onload=', 'onerror=']
                if any(pattern in value.lower() for pattern in xss_patterns):
                    threats.append(f"Potential XSS in {key}")
                
                # Command injection
                cmd_patterns = ['&&', '||', ';', '|', '`', '$']
                if any(pattern in value for pattern in cmd_patterns):
                    threats.append(f"Potential command injection in {key}")
        
        if threats:
            self.log_security_event({
                'type': 'input_validation_threat',
                'threats': threats,
                'data': str(data)[:200],  # First 200 chars only
                'timestamp': datetime.utcnow().isoformat()
            })
            
        return {'threats': threats, 'is_safe': len(threats) == 0}
    
    def log_security_event(self, event: Dict):
        """Log security event to Redis and file"""
        event_key = f"security_event:{int(time.time())}"
        redis_client.setex(event_key, 86400, json.dumps(event))  # Keep for 24h
        
        # Also log to file for persistence
        with open('/var/log/wincloud/security.log', 'a') as f:
            f.write(f"{json.dumps(event)}\n")
    
    def get_security_stats(self) -> Dict:
        """Get security statistics"""
        current_time = int(time.time())
        hour_ago = current_time - 3600
        day_ago = current_time - 86400
        
        # Get events from last 24 hours
        event_keys = redis_client.keys("security_event:*")
        events = []
        
        for key in event_keys:
            event_data = redis_client.get(key)
            if event_data:
                events.append(json.loads(event_data))
        
        # Count by type
        event_counts = {}
        recent_events = []
        
        for event in events:
            event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
            if event_time > datetime.utcnow() - timedelta(hours=24):
                event_type = event['type']
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
                recent_events.append(event)
        
        return {
            'total_events_24h': len(recent_events),
            'event_counts': event_counts,
            'blocked_ips_count': len(redis_client.keys("blocked_ip:*")),
            'recent_events': sorted(recent_events, key=lambda x: x['timestamp'], reverse=True)[:10]
        }

# Global security service
security_service = SecurityService()

# Rate limiting decorator
def rate_limit(limit: int, window: int, key_func=None):
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func(request)
            else:
                key = f"rate_limit:{request.client.host}:{request.url.path}"
            
            if not security_service.check_rate_limit(key, limit, window):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# IP blocking middleware
async def security_middleware(request: Request, call_next):
    """Security middleware for IP blocking and threat detection"""
    
    client_ip = request.client.host
    
    # Check if IP is blocked
    if security_service.is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP address is temporarily blocked"
        )
    
    # Validate request data for security threats
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                data = json.loads(body.decode())
                validation = security_service.validate_input_security(data)
                
                if not validation['is_safe']:
                    security_service.log_security_event({
                        'type': 'blocked_malicious_request',
                        'ip_address': client_ip,
                        'threats': validation['threats'],
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Request contains potentially malicious content"
                    )
        except json.JSONDecodeError:
            pass  # Not JSON, skip validation
    
    response = await call_next(request)
    return response

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: The subject of the token (usually user ID)
        expires_delta: Optional custom expiration time
        additional_claims: Additional claims to include in token
        
    Returns:
        Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "type": "access",
        "iat": datetime.utcnow(),
        "jti": generate_token(16)  # JWT ID for session tracking
    }
    
    if additional_claims:
        to_encode.update(additional_claims)
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_user_tokens(user: 'User') -> Dict[str, str]:
    """
    Create access and refresh tokens for user with role information
    
    Args:
        user: User object with role relationship loaded
        
    Returns:
        Dict with access_token and refresh_token
    """
    # Include role information in token
    role_claims = {}
    if user.role:
        role_claims = {
            "role": user.role.name,
            "role_id": user.role.id,
            "is_admin": user.role.name.lower() == "admin"
        }
    
    # Create tokens with role claims
    access_token = create_access_token(
        subject=user.id,
        additional_claims=role_claims
    )
    
    refresh_token = create_refresh_token(
        subject=user.id,
        additional_claims=role_claims
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict] = None
) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        subject: The subject of the token (usually user ID)
        expires_delta: Optional custom expiration time
        additional_claims: Additional claims to include in token
        
    Returns:
        Encoded JWT refresh token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "type": "refresh",
        "iat": datetime.utcnow(),
        "jti": generate_token(16)  # JWT ID for session tracking
    }
    
    if additional_claims:
        to_encode.update(additional_claims)
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to compare against
        
    Returns:
        True if the password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The hashed password
    """
    return pwd_context.hash(password)


def decode_token(token: str) -> dict:
    """
    Decode a JWT token.
    
    Args:
        token: The JWT token to decode
        
    Returns:
        The decoded token payload
        
    Raises:
        JWTError: If the token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise


def generate_password(length: int = 12) -> str:
    """
    Generate a secure random password.
    
    Args:
        length: The length of the password to generate
        
    Returns:
        A random password string
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def generate_token(length: int = 32) -> str:
    """
    Generate a secure random token for various purposes.
    
    Args:
        length: The length of the token to generate
        
    Returns:
        A random token string
    """
    return secrets.token_urlsafe(length)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength based on security requirements.
    
    Args:
        password: The password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number"
    
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(char in string.punctuation for char in password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"


def get_current_user(token: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """
    Dependency to get current user from JWT token
    """
    from app.core.database import get_db
    from app.models.auth_models import User
    from sqlalchemy.orm import Session
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get database session
    db: Session = next(get_db())
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user
