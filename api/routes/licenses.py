from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.license import License
from models.user import User
from models.app import App
from schemas.license import LicenseCreate, LicenseResponse, LicenseResetHWID
from utils.license_generator import generate_license_key
from utils.webhook import send_discord_webhook
from datetime import datetime, timedelta
import asyncio

router = APIRouter()

# Discord webhook URL for license logging
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1460645375118540842/yNyYWCOywIbXznYbuZJoehpP5hyvYwWXJQNFIUk_C-cnsruuYfSKAreol-y2enGA7qJu"


@router.post("/", response_model=list[LicenseResponse])
async def create_licenses(
    license_data: LicenseCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = db.query(App).filter(
        App.id == license_data.app_id,
        App.admin_id == current_admin.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    licenses = []
    license_keys = []
    for _ in range(license_data.count):
        expiry = None
        if not license_data.is_lifetime:
            if license_data.duration_days:
                expiry = datetime.utcnow() + timedelta(days=license_data.duration_days)
        
        license_obj = License(
            key=generate_license_key(),
            app_id=license_data.app_id,
            expires_at=expiry,
            is_active=True
        )
        db.add(license_obj)
        licenses.append(license_obj)
        license_keys.append(license_obj.key)
    
    db.commit()
    for lic in licenses:
        db.refresh(lic)
    
    # Send to Discord webhook
    try:
        keys_text = "\n".join(license_keys)
        expiry_str = f"{license_data.duration_days} days" if license_data.duration_days else "Lifetime"
        
        await send_discord_webhook(
            DISCORD_WEBHOOK_URL,
            title="🔑 New License Keys Generated",
            description=f"**App:** {app.name}\n**Admin:** {current_admin.username}\n**Count:** {license_data.count}",
            color=3447003,
            fields={
                "Keys": f"```{keys_text}```",
                "Expiry": expiry_str,
                "Created": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }
        )
    except Exception as e:
        print(f"Error sending Discord webhook: {e}")
    
    # Convert to response format
    return [
        LicenseResponse(
            id=lic.id,
            license_key=lic.key,
            hwid=lic.hwid,
            expiry_timestamp=lic.expires_at,
            is_active=lic.is_active,
            app_id=lic.app_id,
            user_id=lic.user_id,
            created_at=lic.created_at
        ) for lic in licenses
    ]


@router.get("/", response_model=list[LicenseResponse])
async def get_licenses(
    app_id: int = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(License).join(App).filter(App.admin_id == current_admin.id)
    if app_id:
        query = query.filter(License.app_id == app_id)
    licenses = query.all()
    # Convert to response format
    return [
        LicenseResponse(
            id=lic.id,
            license_key=lic.key,
            hwid=lic.hwid,
            expiry_timestamp=lic.expires_at,
            is_active=lic.is_active,
            app_id=lic.app_id,
            user_id=lic.user_id,
            created_at=lic.created_at,
            app_name=lic.app.name if lic.app else None,
            status="used" if lic.user_id else "unused"
        ) for lic in licenses
    ]


@router.post("/reset-hwid", response_model=LicenseResponse)
async def reset_hwid(
    request: LicenseResetHWID,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    license_obj = db.query(License).join(App).filter(
        License.key == request.license_key,
        App.admin_id == current_admin.id
    ).first()
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )
    license_obj.hwid = request.hwid
    # If clearing hwid (null) also clear hash and bound timestamp
    if not request.hwid:
        license_obj.hwid_hash = None
        license_obj.hwid_bound_at = None
    else:
        # Update hash and bound timestamp when setting a new HWID
        from security.hwid import hash_hwid
        license_obj.hwid_hash = hash_hwid(request.hwid)
        license_obj.hwid_bound_at = datetime.utcnow()

    db.commit()
    db.refresh(license_obj)
    return LicenseResponse(
        id=license_obj.id,
        license_key=license_obj.key,
        hwid=license_obj.hwid,
        expiry_timestamp=license_obj.expires_at,
        is_active=license_obj.is_active,
        app_id=license_obj.app_id,
        user_id=license_obj.user_id,
        created_at=license_obj.created_at,
        app_name=license_obj.app.name if license_obj.app else None
    )


@router.delete("/{license_id}")
async def delete_license(
    license_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    license_obj = db.query(License).join(App).filter(
        License.id == license_id,
        App.admin_id == current_admin.id
    ).first()
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )
    # If this license is tied to a user, attempt to remove that user
    if license_obj.user_id:
        user = db.query(User).filter(User.id == license_obj.user_id).first()
        if user:
            # Only delete the user if they have no other licenses or are an ephemeral license user
            other_licenses = db.query(License).filter(License.user_id == user.id, License.id != license_obj.id).count()
            if other_licenses == 0 or (user.username and user.username.startswith("license_")):
                db.delete(user)

    db.delete(license_obj)
    db.commit()
    return {"success": True, "message": "License deleted"}

