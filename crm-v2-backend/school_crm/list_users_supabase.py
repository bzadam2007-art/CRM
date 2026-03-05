"""List users from Supabase via REST"""
import urllib.request
import urllib.error
import json
import ssl

SUPABASE_URL = "https://zcgnfelzcyzyzyfmwkhz.supabase.co"
SERVICE_KEY = "sb_publishable_Z9U6WO2nt_0zDwelfhtLzg_NzhL_RPP"

def list_users():
    print("Listing users from Supabase (REST)...")
    
    url = f"{SUPABASE_URL}/rest/v1/users?select=*"
    
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    
    ctx = ssl.create_default_context()
    
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        users = json.loads(resp.read().decode())
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"ID: {u.get('id')} | Username: {u.get('username')} | Email: {u.get('email')} | Role: {u.get('role')}")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Failed to list users: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"[ERROR] Exception: {e}")

if __name__ == "__main__":
    list_users()
