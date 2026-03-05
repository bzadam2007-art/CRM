"""
Authentication routes for login/logout and user management.
Supports both HTML forms and JSON APIs for React frontend.
"""
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import User
from extensions import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ==================== JSON API Routes ====================

@bp.route('/login', methods=['POST'])
def api_login():
    """
    Login endpoint for React frontend.
    Expected JSON: {email: str, password: str, remember: bool}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user is None or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'User account is inactive'
            }), 403
        
        login_user(user, remember=data.get('remember', False))
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Login error: {str(e)}'
        }), 500


@bp.route('/logout', methods=['POST'])
@login_required
def api_logout():
    """Logout endpoint"""
    logout_user()
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    }), 200


@bp.route('/me', methods=['GET'])
@login_required
def api_me():
    """Get current logged-in user info"""
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    }), 200


@bp.route('/register', methods=['POST'])
def api_register():
    """
    Register a new user.
    Expected JSON: {username: str, email: str, password: str}
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(key in data for key in ['username', 'email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Username, email, and password are required'
            }), 400
        
        # Check if user exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 409
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        # Create user
        user = User(
            username=data['username'],
            email=data['email'],
            role='commercial'  # Default role
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Registration error: {str(e)}'
        }), 500


@bp.route('/change-password', methods=['POST'])
@login_required
def api_change_password():
    """
    Change password for logged-in user.
    Expected JSON: {current_password: str, new_password: str}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({
                'success': False,
                'message': 'Current and new passwords are required'
            }), 400
        
        if not current_user.check_password(data['current_password']):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        current_user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ==================== HTML Routes (Legacy) ====================

@bp.route('/login-page', methods=['GET'])
def login_page():
    """HTML login page"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    return render_template('login.html')


@bp.route('/logout-page')
@login_required
def logout_page():
    """HTML logout"""
    logout_user()
    flash('You have been logged out.')
    return redirect(url_for('auth.login_page'))


# ==================== Admin Routes ====================

@bp.route('/admin/create-user', methods=['POST'])
@login_required
def admin_create_user():
    """
    Create a new user (admin only).
    Expected JSON: {username: str, email: str, password: str, role: str}
    """
    if current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Admin access required'
        }), 403
    
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['username', 'email', 'password', 'role']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Check if user exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 409
        
        # Create user
        user = User(
            username=data['username'],
            email=data['email'],
            role=data.get('role', 'commercial')
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/update-role', methods=['POST'])
@login_required
def update_user_role():
    """
    Update user role (admin only or self).
    Expected JSON: {user_id: int, role: str}
    """
    if current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Admin access required'
        }), 403
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        new_role = data.get('role')
        
        if not user_id or not new_role:
            return jsonify({
                'success': False,
                'message': 'user_id and role are required'
            }), 400
        
        if new_role not in ['admin', 'commercial']:
            return jsonify({
                'success': False,
                'message': f'Invalid role. Allowed: admin, commercial'
            }), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        user.role = new_role
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User role updated to {new_role}',
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500
