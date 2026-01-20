import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'faerion_auth.db')
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # === LICENSES TABLE MIGRATIONS ===
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(licenses)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Existing columns in licenses: {columns}")
    
    if 'hwid_bound_at' not in columns:
        print('Adding hwid_bound_at column...')
        cursor.execute('ALTER TABLE licenses ADD COLUMN hwid_bound_at DATETIME')
        print('✓ hwid_bound_at added')
    else:
        print('✓ hwid_bound_at already exists')
    
    if 'hwid_hash' not in columns:
        print('Adding hwid_hash column...')
        cursor.execute('ALTER TABLE licenses ADD COLUMN hwid_hash VARCHAR(64)')
        cursor.execute('CREATE INDEX idx_licenses_hwid_hash ON licenses(hwid_hash)')
        print('✓ hwid_hash added')
    else:
        print('✓ hwid_hash already exists')

    # === USERS TABLE MIGRATIONS ===
    print("\n--- Checking users table ---")
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]
    print(f"Existing columns in users: {user_columns}")
    
    if 'license_key' not in user_columns:
        print('Adding license_key column...')
        cursor.execute('ALTER TABLE users ADD COLUMN license_key VARCHAR(255)')
        cursor.execute('CREATE INDEX idx_users_license_key ON users(license_key)')
        print('✓ license_key added')
    else:
        print('✓ license_key already exists')
    
    if 'pc_name' not in user_columns:
        print('Adding pc_name column...')
        cursor.execute('ALTER TABLE users ADD COLUMN pc_name VARCHAR(255)')
        print('✓ pc_name added')
    else:
        print('✓ pc_name already exists')
    
    conn.commit()
    print('\n✓ Migration completed successfully!')
    
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()
