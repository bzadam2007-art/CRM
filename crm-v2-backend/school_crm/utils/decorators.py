import os
from functools import wraps
from flask import jsonify, request, current_app
from flask_login import current_user

def is_internal_request():
    """Verify if the request has a valid internal API key."""
    api_key = request.headers.get('X-Internal-API-Key')
    secret = current_app.config.get('SECRET_KEY')
    return api_key == secret

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated and not is_internal_request():
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Admin check: Must be authenticated as admin OR provide internal key
        if is_internal_request():
            return f(*args, **kwargs)
            
        if not current_user.is_authenticated or current_user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        return f(*args, **kwargs)
    return decorated_function
