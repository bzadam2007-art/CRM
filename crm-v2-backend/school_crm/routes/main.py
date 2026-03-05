"""
Main routes for dashboard and statistics.
Provides REST API endpoints for dashboard data and analytics.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from extensions import db
from models import Prospect, User, Interaction
from datetime import datetime, timedelta

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Root route - return JSON API info instead of HTML template"""
    return {
        'message': 'School CRM API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/login',
            'prospects': '/api/prospects',
            'dashboard': '/api/dashboard/stats'
        }
    }, 200


@bp.route('/api/dashboard/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics.
    Returns counts by status, priority, country, and timeline data.
    """
    try:
        # Total prospects
        total_prospects = Prospect.query.count()
        
        # Count by status
        by_status = db.session.query(
            Prospect.status,
            db.func.count(Prospect.id).label('count')
        ).group_by(Prospect.status).all()
        
        # Count by priority
        by_priority = db.session.query(
            Prospect.priority,
            db.func.count(Prospect.id).label('count')
        ).group_by(Prospect.priority).all()
        
        # Count by country (top 10)
        by_country = db.session.query(
            Prospect.country,
            db.func.count(Prospect.id).label('count')
        ).group_by(Prospect.country).order_by(
            db.func.count(Prospect.id).desc()
        ).limit(10).all()
        
        # Average score
        avg_score = db.session.query(
            db.func.avg(Prospect.score)
        ).scalar() or 0
        
        # High priority count
        high_priority = Prospect.query.filter_by(priority='Prioritaire').count()
        
        # Recently active (interaction in last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity = Prospect.query.filter(
            Prospect.last_interaction >= week_ago
        ).count()
        
        # Converted count
        converted = Prospect.query.filter_by(status='Client').count()
        
        # Pipeline conversion rate
        conversion_rate = (converted / total_prospects * 100) if total_prospects > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_prospects': total_prospects,
                'high_priority_count': high_priority,
                'recent_activity': recent_activity,
                'converted': converted,
                'average_score': round(avg_score, 1),
                'conversion_rate': round(conversion_rate, 1),
                'by_status': [
                    {'status': status, 'count': count} 
                    for status, count in by_status
                ],
                'by_priority': [
                    {'priority': priority, 'count': count} 
                    for priority, count in by_priority
                ],
                'by_country': [
                    {'country': country, 'count': count} 
                    for country, count in by_country
                ]
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/api/dashboard/recent-activity', methods=['GET'])
@login_required
def get_recent_activity():
    """Get recently updated prospects"""
    try:
        limit = int(request.args.get('limit', 10))
        
        recent = Prospect.query.order_by(
            Prospect.updated_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'recent_activity': [p.to_dict() for p in recent]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/api/dashboard/top-prospects', methods=['GET'])
@login_required
def get_top_prospects():
    """Get top prospects by score"""
    try:
        limit = int(request.args.get('limit', 10))
        
        top = Prospect.query.order_by(
            Prospect.score.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'top_prospects': [p.to_dict() for p in top]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'SchoolCRM API is running',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

