import urllib.request
import urllib.error
import json
import ssl
import os
from dotenv import load_dotenv

load_dotenv()

# Use the SERVICE_KEY from create_tables_supabase.py as it has higher privileges
SUPABASE_URL = "https://zcgnfelzcyzyzyfmwkhz.supabase.co"
SERVICE_KEY = "sb_publishable_Z9U6WO2nt_0zDwelfhtLzg_NzhL_RPP"

SQL = '''
CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial default templates if not exists
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('email_templates', '{}')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('email_config', '{"mail_server": "", "mail_port": 587, "mail_use_tls": true, "mail_username": "", "mail_default_sender": "", "is_configured": false}')
ON CONFLICT (setting_key) DO NOTHING;
'''

def run_sql_via_rpc(sql):
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    data = json.dumps({"query": sql}).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    
    ctx = ssl.create_default_context()
    
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return True, resp.read().decode()
    except urllib.error.HTTPError as e:
        return False, e.read().decode()

if __name__ == "__main__":
    print("Creating app_settings table...")
    ok, result = run_sql_via_rpc(SQL)
    if ok:
        print("Success!")
    else:
        print(f"Failed: {result}")
        print("\nNote: If RPC 'exec_sql' is missing, you must run the SQL manually in Supabase SQL editor:")
        print(SQL)
