import os
from dotenv import load_dotenv

# Load environment variables from .env file before other imports
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

from flask import Flask
from flask_cors import CORS
from config import Config, DevelopmentConfig
from extensions import db, login_manager, mail

def create_app(config_class=None):
    """Application factory pattern"""
    if config_class is None:
        env = os.environ.get('FLASK_ENV', 'development')
        config_class = DevelopmentConfig if env == 'development' else Config
    
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Flask extensions
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    
    # Setup user loader for session management
    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))
    
    # Setup CORS for React frontend
    CORS(app, 
         origins=config_class.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-API-Key'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         max_age=3600)

    # Custom unauthorized handler for API
    from flask import request, jsonify, redirect, url_for
    @login_manager.unauthorized_handler
    def unauthorized():
        if request.path.startswith('/api'):
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        return redirect(url_for('auth.login_page'))

    # Register Blueprints
    from routes.auth import bp as auth_bp
    from routes.main import bp as main_bp
    from routes.prospects import bp as prospects_bp
    from routes.import_export import bp as import_export_bp
    from routes.settings import bp as settings_bp
    from routes.email import bp as email_bp
    from routes.admin import bp as admin_bp
    from routes.import_linkedin import bp as import_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(prospects_bp)
    app.register_blueprint(import_export_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(import_bp)

    with app.app_context():
        # Import models to ensure they are registered with SQLAlchemy
        import models
        db.create_all()
        
        # Ensure email templates have proper placeholders
        from utils.email_service import EmailService
        EmailService.ensure_templates_have_placeholders()
        print("[OK] Email templates verified and repair applied if needed")
        
        # Create default admin if it doesn't exist
        admin_user = models.User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = models.User(
                username='admin',
                email='admin@schoolcrm.com',
                role='admin'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()
            print("[OK] Default admin user created (username: admin, password: admin123)")

    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
