from supabase import create_client, Client
import json
import os
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Supabase credentials missing in .env")
    exit(1)

supabase: Client = create_client(url, key)

try:
    # Fetch top 5 prospects
    response = supabase.table("prospects").select("*").limit(5).execute()
    print("Supabase Data Sample:")
    print(json.dumps(response.data, indent=2))
    
    if len(response.data) > 0:
        keys = response.data[0].keys()
        print(f"\nAvailable columns: {list(keys)}")
    else:
        print("\nNo prospects found in Supabase.")
except Exception as e:
    print(f"Error checking Supabase: {e}")
