from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class WinCloudException(HTTPException):
    """Base exception for WinCloud Builder"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotAuthenticatedException(WinCloudException):
    """Raised when user is not authenticated"""
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class PermissionDeniedException(WinCloudException):
    """Raised when user doesn't have permission"""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class NotFoundException(WinCloudException):
    """Raised when resource is not found"""
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )


class BadRequestException(WinCloudException):
    """Raised for bad requests"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class ConflictException(WinCloudException):
    """Raised when there's a conflict"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class DigitalOceanException(WinCloudException):
    """Raised when DigitalOcean API fails"""
    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        self.original_error = original_error
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"DigitalOcean API error: {detail}"
        )


class BuildException(WinCloudException):
    """Raised when build process fails"""
    def __init__(self, detail: str, droplet_id: Optional[str] = None):
        self.droplet_id = droplet_id
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Build error: {detail}"
        )


class ValidationException(WinCloudException):
    """Raised for validation errors"""
    def __init__(self, detail: str, field: Optional[str] = None):
        self.field = field
        message = f"Validation error"
        if field:
            message += f" for field '{field}'"
        message += f": {detail}"
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message
        )


class RateLimitException(WinCloudException):
    """Raised when rate limit is exceeded"""
    def __init__(self, detail: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        headers = {}
        if retry_after:
            headers["Retry-After"] = str(retry_after)
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers=headers
        )


class ConfigurationException(WinCloudException):
    """Raised when there's a configuration error"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {detail}"
        )
