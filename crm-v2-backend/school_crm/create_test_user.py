from app import create_app
from extensions import db
from models import User
import hashlib

app = create_app()

def create_test_commercial():
    with app.app_context():
        email = "test_comm@example.com"
        existing = User.query.filter_by(email=email).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            
        user = User(username='test_comm', email=email, role='commercial')
        user.set_password('testpass123')
        db.session.add(user)
        db.session.commit()
        print(f"Created test commercial user: {email} / testpass123")

if __name__ == '__main__':
    create_test_commercial()
