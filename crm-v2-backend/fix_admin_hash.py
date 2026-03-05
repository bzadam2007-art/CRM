import os
import hashlib
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env")
    exit(1)

# Headers for Supabase REST API
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def sync_admin():
    print("Syncing Admin user to Supabase with SHA-256 hash (via requests)...")
    
    # Calculate SHA-256 hash for 'admin123'
    password = "admin123"
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    print(f"Hash for '{password}': {password_hash}")

    # 1. Search for existing admin user
    url = f"{SUPABASE_URL}/rest/v1/users?email=eq.admin@schoolcrm.com"
    
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        users = response.json()
        
        if users:
            user = users[0]
            print(f"Found admin user with ID: {user['id']}")
            
            # Update
            update_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user['id']}"
            data = {
                "password_hash": password_hash,
                "role": "admin",
                "is_active": True,
                "username": "admin"
            }
            
            resp = requests.patch(update_url, headers=HEADERS, json=data)
            resp.raise_for_status()
            print("Updated admin user:", resp.json())
        else:
            print("Admin user not found, creating...")
            # Create
            create_url = f"{SUPABASE_URL}/rest/v1/users"
            data = {
                "username": "admin",
                "email": "admin@schoolcrm.com",
                "password_hash": password_hash,
                "role": "admin",
                "is_active": True
            }
            
            resp = requests.post(create_url, headers=HEADERS, json=data)
            resp.raise_for_status()
            print("Created admin user:", resp.json())
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sync_admin()
