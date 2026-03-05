from app import app
from models import Prospect
import json

with app.app_context():
    prospects = Prospect.query.all()
    results = []
    for p in prospects:
        results.append({
            "id": p.id,
            "name": p.school_name,
            "email": p.email,
            "type": p.school_type
        })
    print(json.dumps(results, indent=2))
