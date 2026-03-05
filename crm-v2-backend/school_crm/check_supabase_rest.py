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

# Supabase REST API endpoint for prospects
rest_url = f"{url}/rest/v1/prospects?select=*&limit=5"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(rest_url, headers=headers)
    print("Status:", response.status_code)
    if response.status_code == 200:
        data = response.json()
        print("Data Sample:")
        print(json.dumps(data, indent=2))
    else:
        print("Error:", response.text)
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
