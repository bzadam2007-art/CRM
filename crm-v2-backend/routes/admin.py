from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import User, Prospect, db
from utils.decorators import admin_required
from sqlalchemy import func
import hashlib

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@bp.route('/dashboard', methods=['GET'])
@login_required
@admin_required
def dashboard_stats():
    """Get high-level stats for admin dashboard"""
    total_users = User.query.count()
    total_prospects = Prospect.query.count()
    high_priority = Prospect.query.filter_by(priority='Prioritaire').count()
    
    # Calculate conversion rate (Client / Total)
    converted = Prospect.query.filter_by(status='Client').count()
    conversion_rate = round((converted / total_prospects * 100), 1) if total_prospects > 0 else 0
    
    # Status distribution
    status_counts = db.session.query(Prospect.status, func.count(Prospect.id)).group_by(Prospect.status).all()
    status_dist = {s: c for s, c in status_counts}
    
    # Country distribution (Top 5)
    country_counts = db.session.query(Prospect.country, func.count(Prospect.id)).group_by(Prospect.country).order_by(func.count(Prospect.id).desc()).limit(5).all()
    country_dist = {c: count for c, count in country_counts}
    
    return jsonify({
        'success': True,
        'stats': {
            'total_users': total_users,
            'total_prospects': total_prospects,
            'high_priority_leads': high_priority,
            'conversion_rate': conversion_rate,
            'status_distribution': status_dist,
            'country_distribution': country_dist
        }
    })

@bp.route('/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    """List all users"""
    users = User.query.all()
    return jsonify({
        'success': True,
        'users': [u.to_dict() for u in users]
    })

@bp.route('/users', methods=['POST'])
@login_required
@admin_required
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['username', 'email', 'password', 'role']):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
        
    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return jsonify({'success': False, 'message': 'User already exists'}), 409
        
    # SHA-256 hash for frontend compatibility
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
    
    new_user = User(
        username=data['username'],
        email=data['email'],
        password_hash=password_hash,
        role=data['role'],
        is_active=True
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User created successfully',
        'user': new_user.to_dict()
    })

@bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user with options for their prospects"""
    if user_id == current_user.id:
        return jsonify({'success': False, 'message': 'Cannot delete yourself'}), 400
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    data = request.get_json() or {}
    action = data.get('prospect_action', 'unassign') # 'delete', 'transfer', or 'unassign'
    transfer_to_id = data.get('transfer_to_id')
    
    if action == 'delete':
        # Delete all assigned prospects
        Prospect.query.filter_by(assigned_to_id=user_id).delete()
    elif action == 'transfer' and transfer_to_id:
        # Transfer prospects to another user
        Prospect.query.filter_by(assigned_to_id=user_id).update({Prospect.assigned_to_id: transfer_to_id})
    else:
        # Default: Unassign prospects so they are not deleted and can be reassigned
        Prospect.query.filter_by(assigned_to_id=user_id).update({Prospect.assigned_to_id: None})
    
    # Unassign interactions history anyway to avoid null foreign key if needed (or keep them as is if model allows)
    Interaction.query.filter_by(created_by_id=user_id).update({Interaction.created_by_id: None})
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User deleted successfully'})

@bp.route('/reset-system', methods=['POST'])
@login_required
@admin_required
def reset_system():
    """Wipe all prospects and interactions from the system"""
    try:
        # Delete all interactions first (foreign key dependency)
        Interaction.query.delete()
        # Delete all prospects
        Prospect.query.delete()
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'System reset successful. All prospects and interactions deleted.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Reset failed: {str(e)}'}), 500
