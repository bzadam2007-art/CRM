from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(UserMixin, db.Model):
    """User model with authentication"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='commercial')  # 'admin' or 'commercial'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    prospects = db.relationship('Prospect', backref='assigned_to', lazy='dynamic', foreign_keys='Prospect.assigned_to_id')
    interactions = db.relationship('Interaction', backref='created_by', lazy='dynamic')

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class Prospect(db.Model):
    """Prospect/School model"""
    id = db.Column(db.Integer, primary_key=True)
    school_name = db.Column(db.String(100), nullable=False, index=True)
    country = db.Column(db.String(50), nullable=False, index=True)
    school_type = db.Column(db.String(20), nullable=False)  # 'public' or 'private'
    contact_name = db.Column(db.String(100))
    contact_role = db.Column(db.String(50), nullable=False)  # 'Director', 'Teacher', 'Other'
    contact_phone = db.Column(db.String(20))
    email = db.Column(db.String(120), index=True)
    
    # Lead information
    status = db.Column(db.String(30), default='Nouveau', index=True)  # Pipeline status
    score = db.Column(db.Integer, default=0)
    priority = db.Column(db.String(20), default='Faible', index=True)  # 'Prioritaire', 'Moyen', 'Faible'
    
    # Qualification data
    country_group = db.Column(db.String(20), default='other')  # 'canada', 'uae', 'other'
    
    # Tracking
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    last_interaction = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Additional fields
    website = db.Column(db.String(255))
    student_count = db.Column(db.Integer)
    notes = db.Column(db.Text)
    
    # Qualification interactions
    interaction_email_sent = db.Column(db.Boolean, default=False)
    interaction_response_received = db.Column(db.Boolean, default=False)
    
    # Relationships
    interactions = db.relationship('Interaction', backref='prospect', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'school_name': self.school_name,
            'country': self.country,
            'country_group': self.country_group,
            'school_type': self.school_type,
            'contact_name': self.contact_name,
            'contact_role': self.contact_role,
            'contact_phone': self.contact_phone,
            'email': self.email,
            'status': self.status,
            'score': self.score,
            'priority': self.priority,
            'assigned_to': self.assigned_to.username if self.assigned_to else None,
            'last_interaction': self.last_interaction.isoformat() if self.last_interaction else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'website': self.website,
            'student_count': self.student_count,
            'notes': self.notes,
            'interaction_email_sent': self.interaction_email_sent,
            'interaction_response_received': self.interaction_response_received
        }

class Interaction(db.Model):
    """Track interactions with prospects"""
    id = db.Column(db.Integer, primary_key=True)
    prospect_id = db.Column(db.Integer, db.ForeignKey('prospect.id'), nullable=False, index=True)
    interaction_type = db.Column(db.String(50), nullable=False)  # 'email', 'call', 'meeting', etc.
    description = db.Column(db.Text)
    result = db.Column(db.String(50))  # 'positive', 'neutral', 'negative'
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'prospect_id': self.prospect_id,
            'interaction_type': self.interaction_type,
            'description': self.description,
            'result': self.result,
            'created_by': self.created_by.username,
            'created_at': self.created_at.isoformat()
        }

class ScoringLog(db.Model):
    """Log scoring calculations for audit trail"""
    id = db.Column(db.Integer, primary_key=True)
    prospect_id = db.Column(db.Integer, db.ForeignKey('prospect.id'), nullable=False, index=True)
    old_score = db.Column(db.Integer)
    new_score = db.Column(db.Integer)
    scoring_details = db.Column(db.JSON)  # Store breakdown of score calculation
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'prospect_id': self.prospect_id,
            'old_score': self.old_score,
            'new_score': self.new_score,
            'scoring_details': self.scoring_details,
            'created_at': self.created_at.isoformat()
        }
