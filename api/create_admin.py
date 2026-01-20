#!/usr/bin/env python3
"""
Script to create an admin user via command line
Usage: python create_admin.py
"""
import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
from models.admin import Admin
from security.password import hash_password


def create_admin(username: str, password: str, email: str = None):
    """Create a new admin user in the database"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.username == username).first()
        if existing_admin:
            print(f"❌ Error: Admin with username '{username}' already exists!")
            return False
        
        # Hash the password
        password_hash = hash_password(password)
        
        # Create new admin
        new_admin = Admin(
            username=username,
            password_hash=password_hash,
            email=email,
            is_active=True
        )
        
        # Add to database
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        print(f"✓ Admin created successfully!")
        print(f"  Username: {new_admin.username}")
        print(f"  Email: {new_admin.email or 'Not set'}")
        print(f"  ID: {new_admin.id}")
        print(f"  Created at: {new_admin.created_at}")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin: {str(e)}")
        return False
    finally:
        db.close()


def main():
    """Main function to handle command line input"""
    print("=" * 50)
    print("Admin User Creation Tool")
    print("=" * 50)
    
    # Get username
    username = input("Enter admin username: ").strip()
    if not username:
        print("❌ Username cannot be empty!")
        return
    
    # Get password
    password = input("Enter admin password: ").strip()
    if not password:
        print("❌ Password cannot be empty!")
        return
    
    # Get email (optional)
    email = input("Enter admin email (optional): ").strip()
    if not email:
        email = None
    
    # Confirm
    print("\nConfirm admin creation:")
    print(f"  Username: {username}")
    print(f"  Email: {email or 'Not set'}")
    confirm = input("Continue? (yes/no): ").strip().lower()
    
    if confirm in ['yes', 'y']:
        create_admin(username, password, email)
    else:
        print("❌ Admin creation cancelled.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line arguments: python create_admin.py <username> <password> [email]
        username = sys.argv[1]
        password = sys.argv[2]
        email = sys.argv[3] if len(sys.argv) > 3 else None
        create_admin(username, password, email)
    else:
        # Interactive mode
        main()
