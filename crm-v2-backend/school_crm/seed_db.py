"""
Seed the database with realistic school data for demo purposes.
Includes varied countries, roles, and statuses to test scoring logic.
"""
from app import create_app
from extensions import db
from models import User, Prospect, Interaction
from utils.scoring import recalculate_prospect_score
from datetime import datetime, timedelta
import random

app = create_app()

def seed_data():
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Check if users exist, create admin if not
        if not User.query.filter_by(username='admin').first():
            print("Creating admin user...")
            admin = User(username='admin', email='admin@schoolcrm.com', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
        
        # Check if commercial user exists, create or update
        commercial = User.query.filter_by(username='commercial').first()
        import hashlib
        commercial_hash = hashlib.sha256('commercial123'.encode()).hexdigest()
        
        if not commercial:
            print("Creating commercial user...")
            commercial = User(username='commercial', email='commercial@schoolcrm.com', role='commercial')
            commercial.password_hash = commercial_hash
            db.session.add(commercial)
            db.session.commit()
        else:
            print("Updating commercial user...")
            commercial.email = 'commercial@schoolcrm.com'
            commercial.password_hash = commercial_hash
            db.session.add(commercial)
            db.session.commit()
        
        admin = User.query.filter_by(username='admin').first()
        
        # Clear existing prospects to ensure clean slate (optional, but good for demo)
        # db.session.query(Interaction).delete()
        # db.session.query(Prospect).delete()
        # db.session.commit()
        
        # Define realistic data
        schools = [
            # Target Countries (High Score Potential)
            {
                "school_name": "International School of Paris",
                "country": "France",
                "school_type": "Private",
                "contact_name": "Marie Dubois",
                "contact_role": "Director",
                "email": "director@isp.fr",
                "status": "Intéressé",
                "website": "www.isp.fr",
                "student_count": 850
            },
            {
                "school_name": "American School of London",
                "country": "United Kingdom",
                "school_type": "Private",
                "contact_name": "John Smith",
                "contact_role": "Head of School",
                "email": "head@asl.org.uk",
                "status": "Démo planifiée",
                "website": "www.asl.org.uk",
                "student_count": 1200
            },
            {
                "school_name": "Lycée Français de New York",
                "country": "United States",
                "school_type": "Private",
                "contact_name": "Jean-Paul Sartre",
                "contact_role": "Proviseur",
                "email": "proviseur@lfny.org",
                "status": "Client",
                "website": "www.lfny.org",
                "student_count": 980
            },
            
            # Medium/Low Score Potential
            {
                "school_name": "Public High School Berlin",
                "country": "Germany",
                "school_type": "Public",
                "contact_name": "Hans Muller",
                "contact_role": "Teacher",
                "email": "h.muller@berlin-schule.de",
                "status": "Nouveau",
                "website": "www.berlin-schule.de",
                "student_count": 1500
            },
            {
                "school_name": "Escuela Madrid",
                "country": "Spain",
                "school_type": "Public",
                "contact_name": "Elena Rodriguez",
                "contact_role": "Secretary",
                "email": "info@madrid-school.es",
                "status": "Contacté",
                "website": "www.madrid-school.es",
                "student_count": 600
            },
             {
                "school_name": "Tokyo International School",
                "country": "Japan",
                "school_type": "Private",
                "contact_name": "Kenji Tanaka",
                "contact_role": "Director",
                "email": "k.tanaka@tis.jp",
                "status": "Nouveau",
                "website": "www.tis.jp",
                "student_count": 700
            },
             {
                "school_name": "Dubai British School",
                "country": "UAE",
                "school_type": "Private",
                "contact_name": "Sarah Jones",
                "contact_role": "Principal",
                "email": "principal@dbs.ae",
                "status": "Répondu",
                "website": "www.dbs.ae",
                "student_count": 1100
             }
        ]
        
        print(f"Seeding {len(schools)} prospects...")
        
        for data in schools:
            # Check if exists
            if Prospect.query.filter_by(email=data['email']).first():
                continue
                
            prospect = Prospect(
                school_name=data['school_name'],
                country=data['country'],
                school_type=data['school_type'],
                contact_name=data['contact_name'],
                contact_role=data['contact_role'],
                email=data['email'],
                website=data['website'],
                student_count=data['student_count'],
                status=data['status'],
                assigned_to_id=admin.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
            )
            
            db.session.add(prospect)
            db.session.commit() # Commit to get ID
            
            # Recalculate Score
            recalculate_prospect_score(prospect)
            
            # Add some interactions for realistic history
            if data['status'] in ['Contacté', 'Répondu', 'Intéressé', 'Client']:
                interaction = Interaction(
                    prospect_id=prospect.id,
                    interaction_type='Email',
                    description=f"Initial contact email sent to {data['contact_name']}",
                    result='Positive',
                    created_by_id=admin.id,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(5, 30))
                )
                db.session.add(interaction)
                
            if data['status'] in ['Démo planifiée', 'Client']:
                interaction = Interaction(
                    prospect_id=prospect.id,
                    interaction_type='Call',
                    description="Introductory call and demo scheduling",
                    result='Done',
                    created_by_id=admin.id,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 5))
                )
                db.session.add(interaction)
                
            db.session.commit()
            
            # Recalculate to capture interaction points
            recalculate_prospect_score(prospect)
            
        print("Seeding complete!")

if __name__ == '__main__':
    seed_data()
