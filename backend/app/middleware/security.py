import time
import hashlib
import re
from typing import Dict, Optional, Set
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import redis
from app.core.config import settings

# Redis client for rate limiting
redis_client = redis.Redis(
    host=getattr(settings, 'REDIS_HOST', 'localhost'),
    port=getattr(settings, 'REDIS_PORT', 6379),
    db=0,
    decode_responses=True
)

class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis_client = redis_client
        self.failed_attempts: Dict[str, int] = {}
        self.blocked_ips: Set[str] = set()
        
        # XSS patterns to detect
        self.xss_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
            r'<embed[^>]*>.*?</embed>'
        ]
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        try:
            # 1. Check if IP is blocked
            if await self._is_ip_blocked(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "IP temporarily blocked due to suspicious activity"}
                )
            
            # 2. Rate limiting check
            if await self._check_rate_limit(client_ip, request.url.path):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"}
                )
            
            # 3. Input sanitization for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                await self._sanitize_request_body(request)
            
            # 4. Security headers
            response = await call_next(request)
            response = self._add_security_headers(response)
            
            # 5. Log request
            process_time = time.time() - start_time
            await self._log_request(request, response, process_time, client_ip)
            
            return response
            
        except HTTPException as e:
            # Track failed attempts for brute force protection
            if e.status_code == 401:
                await self._track_failed_attempt(client_ip)
            raise e
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        if self.redis_client:
            try:
                blocked = await self.redis_client.get(f"blocked_ip:{ip}")
                return blocked is not None
            except:
                pass
        
        return ip in self.blocked_ips
    
    async def _check_rate_limit(self, ip: str, path: str) -> bool:
        """Check rate limiting for IP and path"""
        if not self.redis_client:
            return False
        
        try:
            # Different limits for different endpoints
            if "/auth/" in path:
                limit = 10  # 10 requests per minute for auth
                window = 60
            elif "/api/v1/droplets" in path:
                limit = 30  # 30 requests per minute for droplets
                window = 60
            else:
                limit = settings.RATE_LIMIT_PER_MINUTE
                window = 60
            
            key = f"rate_limit:{ip}:{path}"
            current = await self.redis_client.get(key)
            
            if current is None:
                await self.redis_client.setex(key, window, 1)
                return False
            
            if int(current) >= limit:
                return True
            
            await self.redis_client.incr(key)
            return False
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return False
    
    async def _sanitize_request_body(self, request: Request):
        """Sanitize request body for XSS and injection attacks"""
        try:
            if request.headers.get("content-type", "").startswith("application/json"):
                body = await request.body()
                if body:
                    body_str = body.decode("utf-8")
                    
                    # Check for XSS patterns
                    for pattern in self.xss_patterns:
                        if re.search(pattern, body_str, re.IGNORECASE):
                            logger.warning(f"XSS attempt detected from {self._get_client_ip(request)}")
                            raise HTTPException(
                                status_code=400,
                                detail="Invalid input detected"
                            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Request sanitization error: {e}")
    
    def _add_security_headers(self, response: Response) -> Response:
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
    
    async def _track_failed_attempt(self, ip: str):
        """Track failed authentication attempts"""
        if self.redis_client:
            try:
                key = f"failed_attempts:{ip}"
                attempts = await self.redis_client.get(key)
                attempts = int(attempts) if attempts else 0
                attempts += 1
                
                await self.redis_client.setex(key, 3600, attempts)  # 1 hour expiry
                
                # Block IP after 5 failed attempts
                if attempts >= 5:
                    await self.redis_client.setex(f"blocked_ip:{ip}", 1800, "blocked")  # 30 min block
                    logger.warning(f"IP {ip} blocked due to {attempts} failed attempts")
                    
            except Exception as e:
                logger.error(f"Failed attempt tracking error: {e}")
    
    async def _log_request(self, request: Request, response: Response, process_time: float, client_ip: str):
        """Log request for monitoring"""
        log_data = {
            "method": request.method,
            "path": str(request.url.path),
            "client_ip": client_ip,
            "status_code": response.status_code,
            "process_time": round(process_time, 3),
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": time.time()
        }
        
        # Log suspicious activity
        if response.status_code >= 400:
            logger.warning(f"HTTP {response.status_code} from {client_ip}: {request.method} {request.url.path}")
