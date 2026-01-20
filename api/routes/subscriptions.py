from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db
from middleware.auth import get_current_admin
from models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from models.user import User
from models.app import App
from schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionDetailResponse,
    SubscriptionListResponse,
    RenewSubscriptionRequest,
    CancelSubscriptionRequest
)
from utils.license_generator import generate_license_key
from datetime import datetime, timedelta
import uuid

router = APIRouter()


def generate_subscription_key():
    """Generate a unique subscription key"""
    return f"SUB-{uuid.uuid4().hex[:16].upper()}"


@router.post("/", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new subscription"""
    # Verify user exists and belongs to admin's app
    user = db.query(User).filter(User.id == subscription_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify app exists and belongs to admin
    app = db.query(App).filter(
        and_(App.id == subscription_data.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check if user already has active subscription for this app
    existing = db.query(Subscription).filter(
        and_(
            Subscription.user_id == subscription_data.user_id,
            Subscription.app_id == subscription_data.app_id,
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has an active subscription for this app"
        )
    
    # Calculate expiry date
    expiry_date = datetime.utcnow() + timedelta(days=subscription_data.duration_days or 30)
    
    # Create subscription
    subscription = Subscription(
        user_id=subscription_data.user_id,
        app_id=subscription_data.app_id,
        tier=subscription_data.tier,
        subscription_key=generate_subscription_key(),
        expiry_date=expiry_date,
        auto_renew=subscription_data.auto_renew,
        price=subscription_data.price,
        currency=subscription_data.currency,
        billing_cycle=subscription_data.billing_cycle,
        max_devices=subscription_data.max_devices,
        max_apps=subscription_data.max_apps,
        priority_support=subscription_data.priority_support,
        advanced_features=subscription_data.advanced_features,
        notes=subscription_data.notes
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.get("/{subscription_id}", response_model=SubscriptionDetailResponse)
async def get_subscription(
    subscription_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get subscription details"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access to this subscription's app
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    response = SubscriptionDetailResponse(
        **{**subscription.__dict__, "user_username": subscription.user.username, "app_name": subscription.app.name}
    )
    return response


@router.get("/", response_model=SubscriptionListResponse)
async def list_subscriptions(
    app_id: int = None,
    status_filter: str = None,
    skip: int = 0,
    limit: int = 10,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List subscriptions with filtering"""
    query = db.query(Subscription)
    
    if app_id:
        # Verify admin has access to this app
        app = db.query(App).filter(
            and_(App.id == app_id, App.admin_id == current_admin.id)
        ).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        query = query.filter(Subscription.app_id == app_id)
    else:
        # If no app specified, only show subscriptions for admin's apps
        admin_app_ids = db.query(App.id).filter(App.admin_id == current_admin.id).all()
        app_ids = [app[0] for app in admin_app_ids]
        query = query.filter(Subscription.app_id.in_(app_ids))
    
    if status_filter:
        query = query.filter(Subscription.status == status_filter)
    
    total = query.count()
    subscriptions = query.offset(skip).limit(limit).all()
    
    return SubscriptionListResponse(
        total=total,
        subscriptions=subscriptions,
        page=skip // limit + 1,
        page_size=limit
    )


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: int,
    update_data: SubscriptionUpdate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(subscription, field, value)
    
    subscription.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
async def renew_subscription(
    subscription_id: int,
    renew_data: RenewSubscriptionRequest,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Renew a subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Calculate new expiry date
    duration = renew_data.duration_days or 30
    if subscription.expiry_date > datetime.utcnow():
        # Extend from current expiry
        new_expiry = subscription.expiry_date + timedelta(days=duration)
    else:
        # Extend from today
        new_expiry = datetime.utcnow() + timedelta(days=duration)
    
    subscription.expiry_date = new_expiry
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.last_renewal_date = datetime.utcnow()
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: int,
    cancel_data: CancelSubscriptionRequest,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Cancel a subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    subscription.status = SubscriptionStatus.CANCELLED
    if cancel_data.reason:
        subscription.notes = (subscription.notes or "") + f"\n[CANCELLED] {cancel_data.reason}"
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.post("/{subscription_id}/suspend", response_model=SubscriptionResponse)
async def suspend_subscription(
    subscription_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    subscription.status = SubscriptionStatus.SUSPENDED
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.post("/{subscription_id}/activate", response_model=SubscriptionResponse)
async def activate_subscription(
    subscription_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate a subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if subscription has expired
    if subscription.expiry_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate expired subscription"
        )
    
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    subscription_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a subscription"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Verify admin has access
    app = db.query(App).filter(
        and_(App.id == subscription.app_id, App.admin_id == current_admin.id)
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    db.delete(subscription)
    db.commit()
