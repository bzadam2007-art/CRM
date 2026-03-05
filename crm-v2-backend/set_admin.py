import sys
import os

# Add the current directory to the path so we can import app and models
sys.path.append(os.getcwd())

try:
    from school_crm.app import create_app
    from school_crm.models import User, db
except ImportError:
    from app import create_app
    from models import User, db

app = create_app()
with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    if admin:
        admin.role = 'admin'
        db.session.commit()
        print(f"SUCCESS: User '{admin.username}' role set to 'admin'")
    else:
        print("ERROR: Admin user not found")
