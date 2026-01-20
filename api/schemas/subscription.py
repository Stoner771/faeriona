from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class SubscriptionTierEnum(str, Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class SubscriptionStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class SubscriptionCreate(BaseModel):
    user_id: int
    app_id: int
    tier: SubscriptionTierEnum = SubscriptionTierEnum.BASIC
    duration_days: Optional[int] = 30
    billing_cycle: str = "monthly"
    price: int = 0
    currency: str = "USD"
    auto_renew: bool = False
    max_devices: int = 1
    max_apps: int = 1
    priority_support: bool = False
    advanced_features: bool = False
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    tier: Optional[SubscriptionTierEnum] = None
    status: Optional[SubscriptionStatusEnum] = None
    auto_renew: Optional[bool] = None
    max_devices: Optional[int] = None
    max_apps: Optional[int] = None
    priority_support: Optional[bool] = None
    advanced_features: Optional[bool] = None
    notes: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    app_id: int
    tier: str
    status: str
    subscription_key: str
    start_date: datetime
    expiry_date: datetime
    auto_renew: bool
    price: int
    currency: str
    billing_cycle: str
    max_devices: int
    max_apps: int
    priority_support: bool
    advanced_features: bool
    created_at: datetime
    updated_at: datetime
    last_renewal_date: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class SubscriptionDetailResponse(SubscriptionResponse):
    """Extended response with user and app details"""
    user_username: Optional[str] = None
    app_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionListResponse(BaseModel):
    total: int
    subscriptions: list[SubscriptionResponse]
    page: int
    page_size: int


class RenewSubscriptionRequest(BaseModel):
    subscription_id: int
    duration_days: Optional[int] = None


class CancelSubscriptionRequest(BaseModel):
    subscription_id: int
    reason: Optional[str] = None
