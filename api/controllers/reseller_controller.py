from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.reseller import Reseller, CreditTransaction, ResellerApplication
from models.ticket import Ticket, TicketStatus
from security.password import hash_password, verify_password
from schemas.reseller import ResellerCreate, ResellerUpdate, CreditAssignRequest
from decimal import Decimal
from datetime import datetime


def create_reseller(db: Session, reseller_data: ResellerCreate, admin_id: int):
    # Check if username or email already exists
    existing = db.query(Reseller).filter(
        (Reseller.username == reseller_data.username) | 
        (Reseller.email == reseller_data.email)
    ).first()
    if existing:
        raise ValueError("Username or email already exists")
    
    reseller = Reseller(
        username=reseller_data.username,
        email=reseller_data.email,
        password_hash=hash_password(reseller_data.password),
        company_name=reseller_data.company_name,
        contact_person=reseller_data.contact_person,
        phone=reseller_data.phone,
        address=reseller_data.address,
        credits=reseller_data.initial_credits or Decimal("0.00"),
        admin_id=admin_id
    )
    db.add(reseller)
    db.commit()
    db.refresh(reseller)
    
    # Assign applications if provided
    if reseller_data.app_ids:
        for app_id in reseller_data.app_ids:
            assignment = ResellerApplication(
                reseller_id=reseller.id,
                app_id=app_id,
                is_active=True
            )
            db.add(assignment)
        db.commit()
    
    # Create initial credit transaction if credits were assigned
    if reseller_data.initial_credits and reseller_data.initial_credits > 0:
        transaction = CreditTransaction(
            reseller_id=reseller.id,
            amount=reseller_data.initial_credits,
            balance_after=reseller_data.initial_credits,
            transaction_type="admin_assign",
            description="Initial credits assigned",
            admin_id=admin_id
        )
        db.add(transaction)
        db.commit()
    
    return reseller


def get_resellers(db: Session, admin_id: int = None):
    query = db.query(Reseller)
    if admin_id:
        query = query.filter(Reseller.admin_id == admin_id)
    return query.order_by(desc(Reseller.created_at)).all()


def get_reseller_by_id(db: Session, reseller_id: int):
    return db.query(Reseller).filter(Reseller.id == reseller_id).first()


def get_reseller_by_username(db: Session, username: str):
    return db.query(Reseller).filter(Reseller.username == username).first()


def update_reseller(db: Session, reseller_id: int, reseller_data: ResellerUpdate):
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if not reseller:
        return None
    
    # Handle app_ids separately
    app_ids = None
    update_data = reseller_data.dict(exclude_unset=True)
    if "app_ids" in update_data:
        app_ids = update_data.pop("app_ids")
    
    # Update reseller fields
    for key, value in update_data.items():
        setattr(reseller, key, value)
    
    db.commit()
    db.refresh(reseller)
    
    # Handle app assignments if provided
    if app_ids is not None:
        # Remove existing assignments
        db.query(ResellerApplication).filter(
            ResellerApplication.reseller_id == reseller_id
        ).delete()
        db.commit()
        
        # Add new assignments
        for app_id in app_ids:
            assignment = ResellerApplication(
                reseller_id=reseller_id,
                app_id=app_id,
                is_active=True
            )
            db.add(assignment)
        db.commit()
    
    return reseller


def assign_credits(db: Session, credit_data: CreditAssignRequest, admin_id: int):
    reseller = db.query(Reseller).filter(Reseller.id == credit_data.reseller_id).first()
    if not reseller:
        raise ValueError("Reseller not found")
    
    new_balance = reseller.credits + credit_data.amount
    reseller.credits = new_balance
    
    transaction = CreditTransaction(
        reseller_id=reseller.id,
        amount=credit_data.amount,
        balance_after=new_balance,
        transaction_type="admin_assign",
        description=credit_data.description or "Credits assigned by admin",
        admin_id=admin_id
    )
    db.add(transaction)
    db.commit()
    db.refresh(reseller)
    db.refresh(transaction)
    
    return transaction


def get_credit_transactions(db: Session, reseller_id: int = None, limit: int = 100):
    query = db.query(CreditTransaction)
    if reseller_id:
        query = query.filter(CreditTransaction.reseller_id == reseller_id)
    return query.order_by(desc(CreditTransaction.created_at)).limit(limit).all()


def approve_topup_request(db: Session, ticket_id: int, admin_id: int):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket or ticket.ticket_type != "topup_request":
        raise ValueError("Invalid topup request ticket")
    
    if ticket.status == TicketStatus.RESOLVED:
        raise ValueError("Topup request already processed")
    
    reseller = db.query(Reseller).filter(Reseller.id == ticket.reseller_id).first()
    if not reseller:
        raise ValueError("Reseller not found")
    
    new_balance = reseller.credits + ticket.topup_amount
    reseller.credits = new_balance
    
    transaction = CreditTransaction(
        reseller_id=reseller.id,
        amount=ticket.topup_amount,
        balance_after=new_balance,
        transaction_type="topup_approved",
        description=f"Topup approved for ticket #{ticket.id}",
        admin_id=admin_id,
        ticket_id=ticket_id
    )
    db.add(transaction)
    
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()
    ticket.assigned_to_admin_id = admin_id
    
    db.commit()
    db.refresh(transaction)
    return transaction


def delete_reseller(db: Session, reseller_id: int):
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if not reseller:
        return False
    db.delete(reseller)
    db.commit()
    return True


def assign_app_to_reseller(db: Session, reseller_id: int, app_id: int):
    from models.app import App
    
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if not reseller:
        raise ValueError("Reseller not found")
    
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise ValueError("Application not found")
    
    # Check if already assigned
    existing = db.query(ResellerApplication).filter(
        ResellerApplication.reseller_id == reseller_id,
        ResellerApplication.app_id == app_id
    ).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        return {"message": "Application already assigned", "assignment_id": existing.id}
    
    assignment = ResellerApplication(
        reseller_id=reseller_id,
        app_id=app_id,
        is_active=True
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Application assigned successfully", "assignment_id": assignment.id}


def remove_app_from_reseller(db: Session, reseller_id: int, app_id: int):
    assignment = db.query(ResellerApplication).filter(
        ResellerApplication.reseller_id == reseller_id,
        ResellerApplication.app_id == app_id
    ).first()
    if not assignment:
        return False
    db.delete(assignment)
    db.commit()
    return True


def add_reseller_balance(db: Session, reseller_id: int, amount: Decimal, admin_id: int, description: str = None):
    """Add credits to reseller balance"""
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if not reseller:
        raise ValueError("Reseller not found")
    
    new_balance = reseller.credits + amount
    reseller.credits = new_balance
    
    transaction = CreditTransaction(
        reseller_id=reseller.id,
        amount=amount,
        balance_after=new_balance,
        transaction_type="admin_assign",
        description=description or "Credits added by admin",
        admin_id=admin_id
    )
    db.add(transaction)
    db.commit()
    db.refresh(reseller)
    db.refresh(transaction)
    
    return transaction


def deduct_reseller_balance(db: Session, reseller_id: int, amount: Decimal, admin_id: int, description: str = None):
    """Deduct credits from reseller balance"""
    reseller = db.query(Reseller).filter(Reseller.id == reseller_id).first()
    if not reseller:
        raise ValueError("Reseller not found")
    
    if reseller.credits < amount:
        raise ValueError(f"Insufficient credits. Available: {reseller.credits}, Required: {amount}")
    
    new_balance = reseller.credits - amount
    reseller.credits = new_balance
    
    transaction = CreditTransaction(
        reseller_id=reseller.id,
        amount=-amount,
        balance_after=new_balance,
        transaction_type="admin_deduct",
        description=description or "Credits deducted by admin",
        admin_id=admin_id
    )
    db.add(transaction)
    db.commit()
    db.refresh(reseller)
    db.refresh(transaction)
    
    return transaction


def get_reseller_applications(db: Session, reseller_id: int):
    from models.app import App
    from models.license import License
    from sqlalchemy import func

    assignments = db.query(ResellerApplication).filter(
        ResellerApplication.reseller_id == reseller_id,
        ResellerApplication.is_active == True
    ).all()

    apps = []
    for assignment in assignments:
        app = db.query(App).filter(App.id == assignment.app_id).first()
        if app:
            # Count licenses for this app
            licenses_count = db.query(func.count(License.id)).filter(
                License.app_id == app.id
            ).scalar()

            apps.append({
                "id": app.id,
                "name": app.name,
                "description": None,  # App model doesn't have description
                "version": app.version,
                "status": "active",  # All assigned apps are considered active
                "created_at": app.created_at.isoformat() if app.created_at else None,
                "licenses_count": licenses_count or 0,
            })

    return apps
