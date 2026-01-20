from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models.app import App
from models.user import User
from models.license import License
from models.variable import Variable
from models.file import File
from security.jwt import create_access_token
from security.password import hash_password, verify_password
from security.hwid import hash_hwid
from schemas.auth import LoginRequest, LicenseLoginRequest, RegisterRequest, InitRequest, AuthResponse
from schemas.user import UserInfoResponse
from utils.logger import create_log
from utils.webhook import send_webhook
from datetime import datetime, timedelta
from middleware.auth import get_current_user, get_current_admin
import asyncio

router = APIRouter()


def get_app_by_secret(db: Session, secret: str):
    app = db.query(App).filter(App.secret == secret).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return app


@router.post("/init")
async def init(request: InitRequest, db: Session = Depends(get_db)):
    app = get_app_by_secret(db, request.app_secret)
    
    # If force_update is enabled, client must update
    if app.force_update:
        return {
            "success": False,
            "message": "Update required",
            "version": app.version,
            "update_required": True
        }
    
    return {
        "success": True,
        "message": "Initialization successful",
        "version": app.version,
        "update_required": False
    }


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    client_request: Request,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, request.app_secret)
    user = db.query(User).filter(
        User.username == request.username,
        User.app_id == app.id
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        create_log(
            db, app.id, "login_failed",
            ip_address=client_request.client.host,
            user_agent=client_request.headers.get("user-agent"),
            details=f"Failed login attempt for username: {request.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account banned: {user.ban_reason or 'No reason provided'}"
        )
    
    if request.hwid:
        hwid_hash = hash_hwid(request.hwid)
        if user.hwid and user.hwid != hwid_hash:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HWID mismatch"
            )
        if not user.hwid:
            user.hwid = hwid_hash
    
    user.last_login_time = datetime.utcnow()
    user.ip_address = client_request.client.host
    db.commit()
    
    token, expiry = create_access_token({
        "user_id": user.id,
        "app_id": app.id,
        "type": "user"
    })
    
    create_log(
        db, app.id, "login_success",
        ip_address=client_request.client.host,
        user_agent=client_request.headers.get("user-agent"),
        user_id=user.id,
        details=f"User {user.username} logged in successfully"
    )
    
    if app.webhook_url:
        asyncio.create_task(send_webhook(app.webhook_url, "login", {
            "user_id": user.id,
            "username": user.username,
            "ip_address": client_request.client.host
        }))
    
    return AuthResponse(
        success=True,
        message="Login successful",
        token=token,
        expiry=expiry
    )


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    client_request: Request,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, request.app_secret)
    
    existing = db.query(User).filter(
        User.username == request.username,
        User.app_id == app.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    user = User(
        username=request.username,
        password_hash=hash_password(request.password),
        email=request.email,
        app_id=app.id,
        hwid=hash_hwid(request.hwid) if request.hwid else None,
        ip_address=client_request.client.host
    )
    
    if request.license_key:
        license_obj = db.query(License).filter(
            License.key == request.license_key,
            License.app_id == app.id,
            License.is_active == True
        ).first()
        if license_obj:
            if license_obj.hwid and license_obj.hwid != user.hwid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="License already bound to different HWID"
                )
            license_obj.hwid = user.hwid
            license_obj.user_id = None
            if license_obj.expires_at:
                user.expiry_timestamp = license_obj.expires_at
            user.subscription_name = "Premium"
            license_obj.user_id = user.id
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token, expiry = create_access_token({
        "user_id": user.id,
        "app_id": app.id,
        "type": "user"
    })
    
    create_log(
        db, app.id, "register",
        ip_address=client_request.client.host,
        user_agent=client_request.headers.get("user-agent"),
        user_id=user.id,
        details=f"User {user.username} registered"
    )
    
    if app.webhook_url:
        asyncio.create_task(send_webhook(app.webhook_url, "register", {
            "user_id": user.id,
            "username": user.username,
            "ip_address": client_request.client.host
        }))
    
    return AuthResponse(
        success=True,
        message="Registration successful",
        token=token,
        expiry=expiry
    )


@router.post("/license", response_model=AuthResponse)
async def license_login(
    request: LicenseLoginRequest,
    client_request: Request,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, request.app_secret)
    license_obj = db.query(License).filter(
        License.key == request.license_key,
        License.app_id == app.id,
        License.is_active == True
    ).first()
    
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid license key"
        )
    
    if license_obj.expires_at and license_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License has expired"
        )
    
    # Normalize incoming HWID (raw string) and a secure hash
    hwid_raw = request.hwid if request.hwid else None
    hwid_hash = hash_hwid(hwid_raw) if hwid_raw else None

    # If license already has a hashed HWID bound, compare against that
    if license_obj.hwid_hash and hwid_hash and license_obj.hwid_hash != hwid_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HWID mismatch"
        )

    # Bind raw HWID and hash when first used
    if not license_obj.hwid and hwid_raw:
        license_obj.hwid = hwid_raw
        license_obj.hwid_bound_at = datetime.utcnow()

    if not license_obj.hwid_hash and hwid_hash:
        license_obj.hwid_hash = hwid_hash
    
    user = None
    pc_username = request.username if request.username else None
    pc_name = request.pc_name if request.pc_name else None
    print(f"DEBUG: PC Username received from client: '{pc_username}'")
    print(f"DEBUG: PC Name received from client: '{pc_name}'")
    
    if license_obj.user_id:
        user = db.query(User).filter(User.id == license_obj.user_id).first()
        if user:
            # Update username if we received a new one
            if pc_username and (user.username.startswith("license_") or user.username != pc_username):
                user.username = pc_username
                print(f"DEBUG: Updated username to '{pc_username}'")
            # Update PC name
            if pc_name:
                user.pc_name = pc_name
                print(f"DEBUG: Updated pc_name to '{pc_name}'")
            user.last_login_time = datetime.utcnow()
            user.ip_address = client_request.client.host
            db.commit()
    else:
        # Create new user with PC username or fallback to license key
        username = pc_username if pc_username and pc_username.strip() else f"license_{license_obj.key[:8]}"
        print(f"DEBUG: Creating new user with username: '{username}'")
        user = User(
            username=username,
            password_hash=hash_password(""),
            app_id=app.id,
            hwid=hwid_hash,
            ip_address=client_request.client.host,
            subscription_name="Premium",
            expiry_timestamp=license_obj.expires_at,
            license_key=license_obj.key,
            pc_name=pc_name  # Store PC name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        license_obj.user_id = user.id
        db.commit()
    
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account banned"
        )
    
    token, expiry = create_access_token({
        "user_id": user.id,
        "app_id": app.id,
        "type": "user"
    })
    
    create_log(
        db, app.id, "license_login",
        ip_address=client_request.client.host,
        user_agent=client_request.headers.get("user-agent"),
        user_id=user.id,
        details=f"License login: {request.license_key}"
    )
    
    return AuthResponse(
        success=True,
        message="License authentication successful",
        token=token,
        expiry=expiry
    )


@router.get("/validate")
async def validate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.expiry_timestamp and current_user.expiry_timestamp < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription expired"
        )
    return {"valid": True, "message": "Token is valid"}


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    create_log(
        db, current_user.app_id, "logout",
        user_id=current_user.id,
        details=f"User {current_user.username} logged out"
    )
    return {"success": True, "message": "Logged out successfully"}


@router.get("/userinfo", response_model=UserInfoResponse)
async def get_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/vars")
async def get_vars(
    app_secret: str,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, app_secret)
    variables = db.query(Variable).filter(Variable.app_id == app.id).all()
    return {var.key: var.value for var in variables}


@router.get("/files")
async def get_files(
    app_secret: str,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, app_secret)
    files = db.query(File).filter(File.app_id == app.id).all()
    return [
        {
            "id": f.id,
            "filename": f.filename,
            "url": f"/api/files/download/{f.id}?secret={app_secret}",
            "size": f.file_size,
            "mime_type": f.mime_type
        }
        for f in files
    ]


@router.get("/files/download/{file_id}")
async def download_file_client(
    file_id: int,
    secret: str,
    db: Session = Depends(get_db)
):
    from fastapi.responses import FileResponse as FastAPIFileResponse
    app = get_app_by_secret(db, secret)
    file_obj = db.query(File).filter(
        File.id == file_id,
        File.app_id == app.id
    ).first()
    if not file_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    import os
    if not os.path.exists(file_obj.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    return FastAPIFileResponse(
        file_obj.file_path,
        filename=file_obj.filename,
        media_type=file_obj.mime_type
    )


@router.get("/licenses")
async def get_licenses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        licenses = db.query(License).filter(
            License.user_id == current_user.id
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "id": lic.id,
                "license_key": lic.key,
                "hwid": lic.hwid,
                "hwid_bound_at": lic.hwid_bound_at.isoformat() if lic.hwid_bound_at and isinstance(lic.hwid_bound_at, datetime) else lic.hwid_bound_at,
                "hwid_hash": lic.hwid_hash,
                "expiry_timestamp": lic.expires_at.isoformat() if lic.expires_at and isinstance(lic.expires_at, datetime) else lic.expires_at,
                "is_active": lic.is_active,
                "app_id": lic.app_id,
                "user_id": lic.user_id,
                "created_at": lic.created_at.isoformat() if lic.created_at and isinstance(lic.created_at, datetime) else lic.created_at
            }
            for lic in licenses
        ]
    except Exception as e:
        import logging
        logging.error(f"Failed to get licenses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve licenses"
        )


@router.get("/admin/licenses")
async def get_admin_licenses(
    skip: int = 0,
    limit: int = 100,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    try:
        # Get all licenses for apps owned by this admin
        licenses = db.query(License).join(App).filter(
            App.admin_id == current_admin.id
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "id": lic.id,
                "license_key": lic.key,
                "hwid": lic.hwid,
                "hwid_bound_at": lic.hwid_bound_at.isoformat() if lic.hwid_bound_at and isinstance(lic.hwid_bound_at, datetime) else lic.hwid_bound_at,
                "hwid_hash": lic.hwid_hash,
                "expiry_timestamp": lic.expires_at.isoformat() if lic.expires_at and isinstance(lic.expires_at, datetime) else lic.expires_at,
                "is_active": lic.is_active,
                "app_id": lic.app_id,
                "app_name": lic.app.name if lic.app else None,
                "user_id": lic.user_id,
                "created_at": lic.created_at.isoformat() if lic.created_at and isinstance(lic.created_at, datetime) else lic.created_at
            }
            for lic in licenses
        ]
    except Exception as e:
        import logging
        logging.error(f"Failed to get admin licenses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve licenses"
        )


@router.get("/logs")
async def get_logs(
    app_secret: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    app = get_app_by_secret(db, app_secret)
    from models.log import Log
    logs = db.query(Log).filter(Log.app_id == app.id).order_by(Log.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "ip_address": log.ip_address,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

