from app import create_app
from models import User

app = create_app()

with app.app_context():
    print("--- User List ---")
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id} | Username: {u.username} | Email: {u.email} | Role: {u.role} | Active: {u.is_active}")
        
    print("\n--- Password Check ---")
    commercial = User.query.filter_by(username='commercial').first()
    if commercial:
        print(f"Commercial user found. Check pass 'commercial123': {commercial.check_password('commercial123')}")
    else:
        print("Commercial user NOT FOUND")
    print("-----------------")
