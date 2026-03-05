import os
from datetime import timedelta
from dotenv import load_dotenv

# Ensure environment variables are loaded
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-prod-2026'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
    
    if not SQLALCHEMY_DATABASE_URI:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///school_crm.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Flask-Login
    REMEMBER_COOKIE_DURATION = timedelta(days=7)
    REMEMBER_COOKIE_SECURE = False  # Set to True in production
    REMEMBER_COOKIE_HTTPONLY = True
    
    # CORS
    CORS_ORIGINS = [
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", 
        "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", 
        "http://127.0.0.1:5175", "https://www.linkedin.com"
    ]
    
    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None'
    
    # Pagination
    ITEMS_PER_PAGE = 20
    
    # Target countries for scoring
    TARGET_COUNTRIES = ['France', 'Switzerland', 'Belgium', 'Luxembourg', 'Germany']
    
    # SMTP Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', True)
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@schoolcrm.com')
    
    # Supabase Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
