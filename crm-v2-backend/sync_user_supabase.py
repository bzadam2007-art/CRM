"""Sync commercial user to Supabase via REST"""
import urllib.request
import urllib.error
import urllib.parse
import json
import ssl
import hashlib

SUPABASE_URL = "https://zcgnfelzcyzyzyfmwkhz.supabase.co"
SERVICE_KEY = "sb_publishable_Z9U6WO2nt_0zDwelfhtLzg_NzhL_RPP"

def sync_user():
    print("Syncing commercial user to Supabase (REST)...")
    
    # 1. Fix admin email if it conflicts
    print("Checking/Fixing admin email (ID 1)...")
    admin_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.1"
    admin_data = json.dumps({"email": "admin@schoolcrm.com"}).encode("utf-8")
    
    req_admin = urllib.request.Request(admin_url, data=admin_data, method="PATCH")
    req_admin.add_header("apikey", SERVICE_KEY)
    req_admin.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req_admin.add_header("Content-Type", "application/json")
    req_admin.add_header("Prefer", "return=representation")
    
    ctx = ssl.create_default_context()
    
    try:
        resp = urllib.request.urlopen(req_admin, context=ctx)
        print(f"[OK] Admin email update response: {resp.status}")
        print(resp.read().decode())
    except Exception as e:
        print(f"[WARN] Failed to update admin (might not exist or other error): {e}")

    # 2. Sync Custom User
    # Calculate SHA-256 hash
    password = "commercial123"
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    print(f"Password hash: {password_hash}")
    
    # Data to upsert
    user_data = {
        "username": "commercial",
        "email": "commercial@schoolcrm.com",
        "password_hash": password_hash,
        "role": "commercial",
        "is_active": True
    }
    
    # URL for the table 'users'
    # API.ts uses 'users', so we should target that
    url = f"{SUPABASE_URL}/rest/v1/users?on_conflict=username"
    
    data = json.dumps(user_data).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    # minimal=return representation not needed, but nice to check
    req.add_header("Prefer", "resolution=merge-duplicates,return=representation")
    
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        print("[OK] User synced successfully!")
        print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Failed to sync user: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"[ERROR] Exception: {e}")

if __name__ == "__main__":
    sync_user()
