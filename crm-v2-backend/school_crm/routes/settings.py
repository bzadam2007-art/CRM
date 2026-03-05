"""
Settings management routes.
Handles email configuration, user preferences, and system settings.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from utils.email_service import EmailService
import os
from dotenv import load_dotenv, set_key

bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# Load environment file path
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

@bp.route('/email/config', methods=['GET'])
@login_required
def get_email_config():
    """
    Get current email configuration.
    Returns SMTP settings (password is masked for security).
    """
    # Only admins should access this
    if current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Unauthorized. Admin access required.'
        }), 403
    
    return jsonify({
        'success': True,
        'config': {
            'mail_server': os.environ.get('MAIL_SERVER', ''),
            'mail_port': int(os.environ.get('MAIL_PORT', 587)),
            'mail_use_tls': os.environ.get('MAIL_USE_TLS', 'True') == 'True',
            'mail_username': os.environ.get('MAIL_USERNAME', ''),
            'mail_default_sender': os.environ.get('MAIL_DEFAULT_SENDER', ''),
            'is_configured': bool(os.environ.get('MAIL_USERNAME'))
        }
    }), 200


@bp.route('/email/config', methods=['POST'])
@login_required
def update_email_config():
    """
    Update email configuration.
    Requires admin access.
    """
    if current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Unauthorized. Admin access required.'
        }), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields (password is optional for updates)
        required_fields = ['mail_server', 'mail_port', 'mail_username', 'mail_default_sender']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Update environment variables
        load_dotenv(ENV_FILE)
        
        updates = {
            'MAIL_SERVER': data['mail_server'],
            'MAIL_PORT': str(data['mail_port']),
            'MAIL_USE_TLS': 'True' if data.get('mail_use_tls', True) else 'False',
            'MAIL_USERNAME': data['mail_username'],
            'MAIL_DEFAULT_SENDER': data['mail_default_sender']
        }

        # Only update password if provided
        if data.get('mail_password'):
            updates['MAIL_PASSWORD'] = data['mail_password']
        
        # Update .env file
        for key, value in updates.items():
            if os.path.exists(ENV_FILE):
                set_key(ENV_FILE, key, value)
            else:
                # Create .env if it doesn't exist
                with open(ENV_FILE, 'w') as f:
                    for k, v in updates.items():
                        f.write(f"{k}={v}\n")
        
        # Reload environment
        load_dotenv(ENV_FILE, override=True)
        
        return jsonify({
            'success': True,
            'message': 'Email configuration updated successfully',
            'config': {
                'mail_server': data['mail_server'],
                'mail_port': data['mail_port'],
                'mail_use_tls': data.get('mail_use_tls', True),
                'mail_username': data['mail_username'],
                'mail_default_sender': data['mail_default_sender']
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating email configuration: {str(e)}'
        }), 500


@bp.route('/email/test', methods=['POST'])
@login_required
def test_email_config():
    """
    Test email configuration by sending a test email.
    """
    if current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Unauthorized. Admin access required.'
        }), 403
    
    try:
        data = request.get_json()
        test_email = data.get('test_email', current_user.email)
        
        if not test_email:
            return jsonify({
                'success': False,
                'message': 'No test email address provided'
            }), 400
        
        # Send test email
        success = EmailService.send_email(
            test_email,
            "EduCRM Email Configuration Test",
            "Hello,\n\nThis is a test email from EduCRM to verify your SMTP configuration.\n\nIf you received this, your email settings are working correctly!\n\nBest regards,\nEduCRM Team"
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Test email sent successfully to {test_email}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send test email. Check your SMTP configuration.'
            }), 500
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error testing email configuration: {str(e)}'
        }), 500


@bp.route('/email/send', methods=['POST'])
@login_required
def send_email_to_prospect():
    """
    Send a custom email to a prospect.
    """
    try:
        data = request.get_json()
        
        required_fields = ['to_email', 'subject', 'body']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: to_email, subject, body'
            }), 400
        
        result = EmailService.send_custom_email(
            data['to_email'],
            data['subject'],
            data['body']
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Email sent successfully',
                'data': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send email'
            }), 500
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error sending email: {str(e)}'
        }), 500
