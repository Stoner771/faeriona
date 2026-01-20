from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class SubscriptionTier(str, enum.Enum):
    """Subscription tier levels"""
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False, index=True)
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.BASIC, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    
    # Subscription details
    subscription_key = Column(String(255), unique=True, index=True, nullable=False)
    start_date = Column(DateTime, server_default=func.now(), nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    auto_renew = Column(Boolean, default=False)
    
    # Pricing and billing
    price = Column(Integer, default=0)  # in cents
    currency = Column(String(3), default="USD")
    billing_cycle = Column(String(50), default="monthly")  # monthly, yearly, lifetime
    
    # Features
    max_devices = Column(Integer, default=1)
    max_apps = Column(Integer, default=1)
    priority_support = Column(Boolean, default=False)
    advanced_features = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    last_renewal_date = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    app = relationship("App", back_populates="subscriptions")
    
    class Config:
        use_enum_values = True
