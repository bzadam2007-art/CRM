from app import app
from models import Prospect

with app.app_context():
    prospects = Prospect.query.all()
    print(f"Total Prospects: {len(prospects)}")
    for p in prospects[:10]:
        print(f"ID: {p.id}, Name: {p.school_name}, Email: {p.email}, Type: {p.school_type}")
