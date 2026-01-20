"""
Custom exceptions and error handlers for Faerion API
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from datetime import datetime


class FaerionException(Exception):
    """Base exception for Faerion API"""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "UNKNOWN_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(FaerionException):
    """Authentication failed"""
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_FAILED",
            details=details
        )


class AuthorizationError(FaerionException):
    """User not authorized for this action"""
    def __init__(self, message: str = "Access denied", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_FAILED",
            details=details
        )


class ResourceNotFoundError(FaerionException):
    """Resource not found"""
    def __init__(self, resource: str = "Resource", details: Optional[Dict] = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details=details
        )


class ValidationError(FaerionException):
    """Validation error"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details
        )


class ConflictError(FaerionException):
    """Resource already exists"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            details=details
        )


class RateLimitError(FaerionException):
    """Rate limit exceeded"""
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details=details
        )


class InvalidCredentialsError(AuthenticationError):
    """Invalid username or password"""
    def __init__(self, details: Optional[Dict] = None):
        super().__init__(
            message="Invalid username or password",
            details=details
        )
        self.error_code = "INVALID_CREDENTIALS"


class TokenExpiredError(AuthenticationError):
    """JWT token expired"""
    def __init__(self, details: Optional[Dict] = None):
        super().__init__(
            message="Token expired",
            details=details
        )
        self.error_code = "TOKEN_EXPIRED"


class InvalidTokenError(AuthenticationError):
    """Invalid JWT token"""
    def __init__(self, details: Optional[Dict] = None):
        super().__init__(
            message="Invalid token",
            details=details
        )
        self.error_code = "INVALID_TOKEN"


class UserBannedError(AuthenticationError):
    """User account is banned"""
    def __init__(self, reason: Optional[str] = None):
        details = {"ban_reason": reason} if reason else None
        super().__init__(
            message="User account is banned",
            details=details
        )
        self.error_code = "USER_BANNED"


class InsufficientPermissionsError(AuthorizationError):
    """User lacks required permissions"""
    def __init__(self, required_role: Optional[str] = None):
        details = {"required_role": required_role} if required_role else None
        super().__init__(
            message=f"Insufficient permissions" + (f" (requires {required_role})" if required_role else ""),
            details=details
        )
        self.error_code = "INSUFFICIENT_PERMISSIONS"


class ApplicationNotFoundError(ResourceNotFoundError):
    """Application not found"""
    def __init__(self):
        super().__init__(
            resource="Application",
            details={"resource_type": "application"}
        )
        self.error_code = "APPLICATION_NOT_FOUND"


class UserNotFoundError(ResourceNotFoundError):
    """User not found"""
    def __init__(self):
        super().__init__(
            resource="User",
            details={"resource_type": "user"}
        )
        self.error_code = "USER_NOT_FOUND"


class LicenseNotFoundError(ResourceNotFoundError):
    """License not found"""
    def __init__(self):
        super().__init__(
            resource="License",
            details={"resource_type": "license"}
        )
        self.error_code = "LICENSE_NOT_FOUND"


class InvalidLicenseError(ValidationError):
    """License is invalid or expired"""
    def __init__(self, reason: Optional[str] = None):
        super().__init__(
            message=f"Invalid license" + (f": {reason}" if reason else ""),
            details={"reason": reason} if reason else None
        )
        self.error_code = "INVALID_LICENSE"


class DatabaseError(FaerionException):
    """Database operation error"""
    def __init__(self, message: str = "Database error", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            details=details
        )


class ExternalServiceError(FaerionException):
    """External service error (webhook, email, etc)"""
    def __init__(self, service: str, message: str = "External service error", details: Optional[Dict] = None):
        details = details or {}
        details["service"] = service
        super().__init__(
            message=f"{service}: {message}",
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details=details
        )


class FileUploadError(ValidationError):
    """File upload error"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            details=details
        )
        self.error_code = "FILE_UPLOAD_ERROR"


class InvalidFormatError(ValidationError):
    """Invalid data format"""
    def __init__(self, field: str, expected: str, details: Optional[Dict] = None):
        details = details or {}
        details["field"] = field
        details["expected"] = expected
        super().__init__(
            message=f"Invalid format for {field}: expected {expected}",
            details=details
        )
        self.error_code = "INVALID_FORMAT"


def format_error_response(exc: FaerionException) -> Dict[str, Any]:
    """Format exception as API response"""
    return {
        "status": "error",
        "message": exc.message,
        "error_code": exc.error_code,
        "details": exc.details if exc.details else None,
        "timestamp": datetime.utcnow().isoformat()
    }
