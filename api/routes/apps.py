from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_admin
from models.app import App
from controllers.app_controller import (
    create_app, get_apps_by_admin, update_app, delete_app
)
from schemas.app import AppCreate, AppUpdate, AppResponse

router = APIRouter()


@router.post("/", response_model=AppResponse)
async def create_application(
    app_data: AppCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return create_app(db, app_data, current_admin.id)


@router.get("/", response_model=list[AppResponse])
async def get_applications(
    skip: int = 0,
    limit: int = 10,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(App).filter(App.admin_id == current_admin.id).offset(skip).limit(limit).all()


@router.patch("/{app_id}/toggle")
async def toggle_application(
    app_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from fastapi import HTTPException, status
    app = db.query(App).filter(
        App.id == app_id,
        App.admin_id == current_admin.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    app.force_update = not app.force_update
    db.commit()
    db.refresh(app)
    return AppResponse.from_orm(app)


@router.put("/{app_id}", response_model=AppResponse)
async def update_application(
    app_id: int,
    app_data: AppUpdate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    app = update_app(db, app_id, app_data, current_admin.id)
    if not app:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return app


@router.delete("/{app_id}")
async def delete_application(
    app_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    success = delete_app(db, app_id, current_admin.id)
    if not success:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return {"success": True, "message": "Application deleted"}

