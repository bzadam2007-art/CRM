import os
import sys
from dotenv import load_dotenv

# Add the current directory to path
sys.path.append(os.getcwd())

# Load environment variables
load_dotenv()

from app import create_app
from extensions import db

print("Attempting to connect to Supabase...")
try:
    app = create_app()
    with app.app_context():
        # Import models to ensure they are registered
        import models
        # Create all tables
        db.create_all()
        print("Successfully connected to Supabase and created tables!")
        
        # Check if we can query users
        admin = models.User.query.filter_by(username='admin').first()
        if admin:
            print(f"Verified: Admin user exists (ID: {admin.id})")
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
    sys.exit(1)
