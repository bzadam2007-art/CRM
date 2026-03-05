"""Create tables in Supabase using the REST API"""
import urllib.request
import urllib.error
import json
import ssl

SUPABASE_URL = "https://zcgnfelzcyzyzyfmwkhz.supabase.co"
SERVICE_KEY = "sb_publishable_Z9U6WO2nt_0zDwelfhtLzg_NzhL_RPP"

# SQL to create all tables (note: "user" is quoted because it's a reserved word)
SQL_STATEMENTS = [
    # 1. Users table
    '''CREATE TABLE IF NOT EXISTS public."user" (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(256) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'commercial',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )''',
    'CREATE INDEX IF NOT EXISTS idx_user_username ON public."user"(username)',
    'CREATE INDEX IF NOT EXISTS idx_user_email ON public."user"(email)',
    
    # 2. Prospects table
    '''CREATE TABLE IF NOT EXISTS public.prospect (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(100) NOT NULL,
        country VARCHAR(50) NOT NULL,
        school_type VARCHAR(20) NOT NULL,
        contact_name VARCHAR(100),
        contact_role VARCHAR(50) NOT NULL,
        contact_phone VARCHAR(20),
        email VARCHAR(120),
        status VARCHAR(30) DEFAULT 'Nouveau',
        score INTEGER DEFAULT 0,
        priority VARCHAR(20) DEFAULT 'Faible',
        assigned_to_id INTEGER REFERENCES public."user"(id),
        last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        website VARCHAR(255),
        student_count INTEGER,
        notes TEXT,
        interaction_email_sent BOOLEAN DEFAULT FALSE,
        interaction_response_received BOOLEAN DEFAULT FALSE
    )''',
    'CREATE INDEX IF NOT EXISTS idx_prospect_school_name ON public.prospect(school_name)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_country ON public.prospect(country)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_status ON public.prospect(status)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_priority ON public.prospect(priority)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_last_interaction ON public.prospect(last_interaction)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_created_at ON public.prospect(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_prospect_email ON public.prospect(email)',
    
    # 3. Interactions table
    '''CREATE TABLE IF NOT EXISTS public.interaction (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER NOT NULL REFERENCES public.prospect(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL,
        description TEXT,
        result VARCHAR(50),
        created_by_id INTEGER NOT NULL REFERENCES public."user"(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )''',
    'CREATE INDEX IF NOT EXISTS idx_interaction_prospect_id ON public.interaction(prospect_id)',
    'CREATE INDEX IF NOT EXISTS idx_interaction_created_at ON public.interaction(created_at)',
    
    # 4. Scoring Logs table
    '''CREATE TABLE IF NOT EXISTS public.scoring_log (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER NOT NULL REFERENCES public.prospect(id) ON DELETE CASCADE,
        old_score INTEGER,
        new_score INTEGER,
        scoring_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )''',
    'CREATE INDEX IF NOT EXISTS idx_scoring_log_prospect_id ON public.scoring_log(prospect_id)',
    'CREATE INDEX IF NOT EXISTS idx_scoring_log_created_at ON public.scoring_log(created_at)',
]

def run_sql_via_rpc(sql):
    """Execute SQL via Supabase's pg_net or direct query"""
    # Use the Supabase SQL endpoint
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


def check_connection():
    """Quick check if the Supabase API is reachable"""
    url = f"{SUPABASE_URL}/rest/v1/"
    req = urllib.request.Request(url)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    
    ctx = ssl.create_default_context()
    
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        print(f"[OK] Supabase API reachable (status {resp.status})")
        return True
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Supabase API error: {e.code} - {e.read().decode()}")
        return False
    except Exception as e:
        print(f"[ERROR] Cannot reach Supabase: {e}")
        return False


if __name__ == "__main__":
    print("=== Supabase Table Creator ===\n")
    
    if not check_connection():
        print("Cannot connect to Supabase. Aborting.")
        exit(1)
    
    # Try running all SQL as one batch via RPC
    full_sql = ";\n".join(SQL_STATEMENTS)
    ok, result = run_sql_via_rpc(full_sql)
    
    if ok:
        print("[OK] All tables created successfully!")
    else:
        print(f"RPC method not available: {result}")
        print("\nThe Supabase anon key cannot create tables directly.")
        print("You need to run the SQL in the Supabase SQL Editor.")
        print("The SQL file is at: supabase_schema.sql")
