"""
Standard response models for Faerion API
Provides consistent response structures across all endpoints
"""
from pydantic import BaseModel, Field
from typing import Generic, TypeVar, List, Optional, Any, Dict
from datetime import datetime
from enum import Enum


class ResponseStatus(str, Enum):
    """Standard response statuses"""
    SUCCESS = "success"
    ERROR = "error"
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    PARTIAL = "partial"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    NOT_FOUND = "not_found"


T = TypeVar('T')


class BaseResponse(BaseModel):
    """Base response model"""
    status: ResponseStatus
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SuccessResponse(BaseResponse):
    """Successful response with data"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Optional[Any] = None


class ErrorResponse(BaseResponse):
    """Error response"""
    status: ResponseStatus = ResponseStatus.ERROR
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class PaginatedResponse(BaseModel):
    """Paginated response"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class PaginatedSuccessResponse(BaseResponse):
    """Success response with pagination"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: PaginatedResponse


class AuthResponse(BaseModel):
    """Authentication response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expiry: int  # Unix timestamp
    expires_in: int  # Seconds
    user: Optional[Dict[str, Any]] = None


class AdminAuthResponse(BaseModel):
    """Admin authentication response"""
    token: str
    expiry: int
    admin_id: int
    username: str


class TokenResponse(BaseModel):
    """Token response"""
    token: str
    expiry: int
    expires_in: Optional[int] = None


class UserInfoResponse(BaseModel):
    """User information response"""
    id: int
    username: str
    email: Optional[str] = None
    hwid: Optional[str] = None
    is_banned: bool
    subscription_name: Optional[str] = None
    expiry_timestamp: Optional[datetime] = None
    account_creation_date: datetime
    last_login_time: Optional[datetime] = None


class UserDetailResponse(UserInfoResponse):
    """Detailed user information"""
    ip_address: Optional[str] = None
    ban_reason: Optional[str] = None
    app_id: int


class LicenseResponse(BaseModel):
    """License response"""
    id: int
    key: str
    status: str  # active, expired, revoked
    user_limit: Optional[int] = None
    created_at: datetime
    expiry_date: Optional[datetime] = None
    app_id: int


class AppResponse(BaseModel):
    """Application response"""
    id: int
    name: str
    version: str
    secret: str
    force_update: bool
    created_at: datetime
    user_count: int = 0


class ResellerResponse(BaseModel):
    """Reseller response"""
    id: int
    username: str
    email: str
    company_name: Optional[str] = None
    balance: float
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class ResellerDetailResponse(ResellerResponse):
    """Detailed reseller information"""
    total_sales: float = 0.0
    total_licenses_sold: int = 0
    commission_rate: float
    api_key: str


class TicketResponse(BaseModel):
    """Support ticket response"""
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator_id: int
    assigned_to: Optional[int] = None
    message_count: int = 0


class TicketDetailResponse(TicketResponse):
    """Detailed ticket information"""
    messages: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []


class FileResponse(BaseModel):
    """File response"""
    id: int
    filename: str
    original_filename: str
    size: int
    mime_type: str
    uploaded_at: datetime
    upload_id: int
    download_url: str


class LogResponse(BaseModel):
    """Log entry response"""
    id: int
    user_id: Optional[int] = None
    action: str
    ip_address: str
    user_agent: Optional[str] = None
    status_code: int
    timestamp: datetime


class WebhookResponse(BaseModel):
    """Webhook response"""
    success: bool
    message: str
    webhook_id: Optional[int] = None
    event_type: Optional[str] = None
    timestamp: datetime


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str  # healthy, unhealthy
    database: str  # connected, disconnected
    timestamp: datetime


class StatusResponse(BaseModel):
    """API status response"""
    status: str
    api: Dict[str, str]
    database: Dict[str, Any]
    configuration: Dict[str, Any]
    timestamp: datetime


class ValidationErrorResponse(BaseModel):
    """Validation error response"""
    status: ResponseStatus = ResponseStatus.ERROR
    message: str = "Validation error"
    error_code: str = "VALIDATION_ERROR"
    errors: List[Dict[str, Any]]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class NotFoundResponse(BaseModel):
    """Not found response"""
    status: ResponseStatus = ResponseStatus.NOT_FOUND
    message: str = "Resource not found"
    error_code: str = "NOT_FOUND"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UnauthorizedResponse(BaseModel):
    """Unauthorized response"""
    status: ResponseStatus = ResponseStatus.UNAUTHORIZED
    message: str = "Unauthorized access"
    error_code: str = "UNAUTHORIZED"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ForbiddenResponse(BaseModel):
    """Forbidden response"""
    status: ResponseStatus = ResponseStatus.FORBIDDEN
    message: str = "Access forbidden"
    error_code: str = "FORBIDDEN"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BulkOperationResponse(BaseModel):
    """Bulk operation response"""
    total: int
    successful: int
    failed: int
    errors: Optional[List[Dict[str, Any]]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
