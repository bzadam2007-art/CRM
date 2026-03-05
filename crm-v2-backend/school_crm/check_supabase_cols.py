import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Supabase credentials missing in .env")
    exit(1)

rest_url = f"{url}/rest/v1/prospects?select=*&limit=1"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(rest_url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data:
            print("Columns in Supabase 'prospects' table:")
            print(", ".join(data[0].keys()))
            print("\nFull Sample Record:")
            print(json.dumps(data[0], indent=2))
        else:
            print("No data found in prospects table.")
    else:
        print("Error:", response.text)
except Exception as e:
    print(f"Error: {e}")
