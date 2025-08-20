from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import traceback
from uuid import uuid4

from app.core.exceptions import WinCloudException

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid4())
        start_time = time.time()
        
        # Add request ID to logs
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else None
            }
        )
        
        try:
            response = await call_next(request)
            
            # Log successful requests
            duration = time.time() - start_time
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration": f"{duration:.3f}s"
                }
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response
            
        except WinCloudException as e:
            # Handle our custom exceptions
            duration = time.time() - start_time
            logger.warning(
                f"Request failed with WinCloudException",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": e.status_code,
                    "detail": e.detail,
                    "duration": f"{duration:.3f}s"
                }
            )
            
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "detail": e.detail,
                    "request_id": request_id
                },
                headers=e.headers if e.headers else {"X-Request-ID": request_id}
            )
            
        except Exception as e:
            # Handle unexpected exceptions
            duration = time.time() - start_time
            error_id = str(uuid4())
            
            # Log the full traceback
            logger.error(
                f"Unexpected error occurred",
                extra={
                    "request_id": request_id,
                    "error_id": error_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "duration": f"{duration:.3f}s",
                    "traceback": traceback.format_exc()
                }
            )
            
            # Return generic error response
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An unexpected error occurred",
                    "error_id": error_id,
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, calls: int = 60, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for WebSocket connections
        if request.url.path.startswith("/ws"):
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean up old entries
        self.clients = {
            ip: times for ip, times in self.clients.items()
            if any(t > now - self.period for t in times)
        }
        
        # Check rate limit
        if client_ip in self.clients:
            recent_calls = [t for t in self.clients[client_ip] if t > now - self.period]
            if len(recent_calls) >= self.calls:
                retry_after = int(self.period - (now - min(recent_calls)))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"},
                    headers={"Retry-After": str(retry_after)}
                )
            self.clients[client_ip] = recent_calls + [now]
        else:
            self.clients[client_ip] = [now]
        
        return await call_next(request)
