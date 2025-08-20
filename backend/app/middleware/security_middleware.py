"""
Security Middleware - Comprehensive security headers and protection
Enforces HTTPS, secure headers, and token transmission security
"""

import logging
from datetime import datetime
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import re
from typing import Dict, Any, Optional
import secrets

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware with:
    - HTTPS enforcement
    - Security headers
    - Token validation
    - Request sanitization
    """
    
    def __init__(self, app, enforce_https: bool = True):
        super().__init__(app)
        self.enforce_https = enforce_https
        self.nonce_store = {}  # For CSP nonces
        
    async def dispatch(self, request: Request, call_next):
        """Main security middleware handler"""
        
        # 1. HTTPS Enforcement
        if self.enforce_https and not self._is_secure_request(request):
            return self._redirect_to_https(request)
        
        # 2. Validate security headers
        security_check = self._validate_request_security(request)
        if security_check:
            return security_check
        
        # 3. Process request
        response = await call_next(request)
        
        # 4. Add security headers to response
        self._add_security_headers(response, request)
        
        # 5. Log security events
        self._log_security_event(request, response)
        
        return response
    
    def _is_secure_request(self, request: Request) -> bool:
        """Check if request is secure (HTTPS)"""
        # Check various headers for HTTPS
        if request.url.scheme == "https":
            return True
        
        # Check for proxy headers
        forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
        if forwarded_proto == "https":
            return True
        
        # Check for CloudFlare
        cf_visitor = request.headers.get("cf-visitor", "")
        if '"scheme":"https"' in cf_visitor:
            return True
        
        # Development bypass
        if request.client and request.client.host in ["127.0.0.1", "localhost"]:
            return True
        
        return False
    
    def _redirect_to_https(self, request: Request) -> Response:
        """Redirect HTTP to HTTPS"""
        https_url = str(request.url).replace("http://", "https://", 1)
        
        return JSONResponse(
            status_code=301,
            content={
                "error": "HTTPS Required",
                "message": "This API requires HTTPS for security",
                "redirect_url": https_url
            },
            headers={
                "Location": https_url,
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
            }
        )
    
    def _validate_request_security(self, request: Request) -> Optional[Response]:
        """Validate request security requirements"""
        
        # Block suspicious user agents
        user_agent = request.headers.get("user-agent", "").lower()
        suspicious_agents = [
            "bot", "crawler", "spider", "scraper",
            "curl", "wget", "python-requests", "postman"
        ]
        
        # Allow legitimate automated tools if they have proper auth
        auth_header = request.headers.get("authorization")
        if not auth_header and any(agent in user_agent for agent in suspicious_agents):
            if not request.url.path.startswith("/health"):  # Allow health checks
                logger.warning(f"🚫 Blocked suspicious user agent: {user_agent}")
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Forbidden",
                        "message": "Automated access requires authentication"
                    }
                )
        
        # Validate Content-Type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            # Allow FormData, JSON, and multipart
            allowed_types = [
                "application/json",
                "application/x-www-form-urlencoded",
                "multipart/form-data"
            ]
            
            if not any(allowed_type in content_type for allowed_type in allowed_types):
                logger.warning(f"🚫 Invalid content type: {content_type}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Invalid Content-Type",
                        "message": "Content-Type must be application/json or multipart/form-data"
                    }
                )
        
        # Check for required security headers
        required_headers = ["x-requested-with"]
        for header in required_headers:
            if header not in request.headers:
                # Skip for health checks and docs
                if request.url.path not in ["/health", "/docs", "/redoc", "/openapi.json"]:
                    logger.warning(f"🚫 Missing required header: {header}")
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": "Security Headers Required",
                            "message": f"Required header '{header}' is missing"
                        }
                    )
        
        return None
    
    def _add_security_headers(self, response: Response, request: Request):
        """Add comprehensive security headers"""
        
        # Generate CSP nonce
        nonce = secrets.token_urlsafe(16)
        
        # Security Headers
        security_headers = {
            # HTTPS and Transport Security
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Content Security Policy
            "Content-Security-Policy": (
                f"default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}' 'unsafe-inline' https://cdnjs.cloudflare.com; "
                f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                f"font-src 'self' https://fonts.gstatic.com; "
                f"img-src 'self' data: https:; "
                f"connect-src 'self' https://api.digitalocean.com; "
                f"object-src 'none'; "
                f"base-uri 'self'; "
                f"form-action 'self'; "
                f"frame-ancestors 'none'; "
                f"upgrade-insecure-requests"
            ),
            
            # XSS Protection
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy
            "Permissions-Policy": (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "accelerometer=(), ambient-light-sensor=()"
            ),
            
            # Cache Control for sensitive data
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            
            # Custom Security Headers
            "X-API-Version": "2.0",
            "X-Security-Policy": "enhanced",
            "X-Content-Security": "enabled",
            
            # CORS Security (if needed)
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Resource-Policy": "same-origin"
        }
        
        # Apply headers to response
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Add CSP nonce to response for frontend usage
        response.headers["X-CSP-Nonce"] = nonce
        
        # Token Security Headers (if auth endpoint)
        if "/auth/" in request.url.path:
            response.headers.update({
                "X-Token-Security": "enhanced",
                "X-Encryption": "AES-256",
                "Clear-Site-Data": '"cache", "storage"'  # Clear on logout
            })
    
    def _log_security_event(self, request: Request, response: Response):
        """Log security-relevant events"""
        
        # Log all authentication attempts
        if "/auth/" in request.url.path:
            status_code = response.status_code
            client_ip = self._get_client_ip(request)
            user_agent = request.headers.get("user-agent", "")
            
            event_type = "auth_attempt"
            if status_code == 200:
                event_type = "auth_success"
            elif status_code in [401, 403]:
                event_type = "auth_failure"
            
            logger.info(
                f"🔐 [{event_type}] IP: {client_ip} | "
                f"Status: {status_code} | "
                f"Path: {request.url.path} | "
                f"UA: {user_agent[:100]}"
            )
        
        # Log token operations
        if "/tokens" in request.url.path or "/api-keys" in request.url.path:
            client_ip = self._get_client_ip(request)
            logger.info(
                f"🔑 [token_operation] IP: {client_ip} | "
                f"Method: {request.method} | "
                f"Path: {request.url.path} | "
                f"Status: {response.status_code}"
            )
        
        # Log suspicious activities
        if response.status_code in [401, 403, 429]:
            client_ip = self._get_client_ip(request)
            logger.warning(
                f"🚨 [suspicious_activity] IP: {client_ip} | "
                f"Status: {response.status_code} | "
                f"Path: {request.url.path}"
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get real client IP considering proxies"""
        # Check various headers for real IP
        ip_headers = [
            "cf-connecting-ip",  # CloudFlare
            "x-forwarded-for",   # Standard proxy
            "x-real-ip",         # Nginx
            "x-client-ip"        # Custom
        ]
        
        for header in ip_headers:
            ip = request.headers.get(header)
            if ip:
                # Take first IP if comma-separated
                return ip.split(",")[0].strip()
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"


class TokenSecurityValidator:
    """
    Validate token security in requests
    """
    
    @staticmethod
    def validate_auth_header(auth_header: str) -> Dict[str, Any]:
        """Validate Authorization header security"""
        
        if not auth_header:
            return {"valid": False, "error": "Missing Authorization header"}
        
        if not auth_header.startswith("Bearer "):
            return {"valid": False, "error": "Invalid Authorization format"}
        
        token = auth_header.split("Bearer ")[1].strip()
        
        # Basic token validation
        if len(token) < 20:
            return {"valid": False, "error": "Token too short"}
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r"^[a-z]+$",  # All lowercase (weak)
            r"^[0-9]+$",  # All numbers (weak)
            r"^.{1,10}$", # Too short
            r"password|secret|key|token"  # Common words
        ]
        
        for pattern in suspicious_patterns:
            if re.match(pattern, token.lower()):
                return {"valid": False, "error": "Suspicious token pattern"}
        
        return {"valid": True, "token": token}
    
    @staticmethod
    def validate_do_token(do_token: str) -> Dict[str, Any]:
        """Validate DigitalOcean token format"""
        
        if not do_token:
            return {"valid": False, "error": "Missing DO token"}
        
        # DO token format: dop_v1_[64 hex characters]
        do_pattern = r"^dop_v1_[a-f0-9]{64}$"
        
        if not re.match(do_pattern, do_token):
            return {"valid": False, "error": "Invalid DO token format"}
        
        return {"valid": True, "token": do_token}


def create_security_middleware(app, enforce_https: bool = True):
    """Factory function to create security middleware"""
    return SecurityMiddleware(app, enforce_https=enforce_https)
