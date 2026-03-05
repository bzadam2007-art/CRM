from flask import Blueprint, jsonify, request
from utils.decorators import admin_required, token_required
import os

bp = Blueprint('email', __name__, url_prefix='/api/email')


@bp.route('/config', methods=['GET'])
@token_required
def get_email_config():
    """Get current email configuration (without exposing password)."""
    from flask import current_app
    
    mail_server = current_app.config.get('MAIL_SERVER', '')
    mail_username = current_app.config.get('MAIL_USERNAME', '')
    
    return jsonify({
        'success': True,
        'config': {
            'mail_server': mail_server or '',
            'mail_port': current_app.config.get('MAIL_PORT', 587),
            'mail_use_tls': current_app.config.get('MAIL_USE_TLS', True),
            'mail_username': mail_username or '',
            'mail_default_sender': current_app.config.get('MAIL_DEFAULT_SENDER', ''),
            'is_configured': bool(mail_server and mail_username),
        }
    })


@bp.route('/config', methods=['POST'])
@token_required
def update_email_config():
    """Update email configuration at runtime and persist to .env file."""
    from flask import current_app
    
    data = request.get_json()
    
    # Update Flask app config at runtime
    if 'mail_server' in data:
        current_app.config['MAIL_SERVER'] = data['mail_server']
    if 'mail_port' in data:
        current_app.config['MAIL_PORT'] = int(data['mail_port'])
    if 'mail_use_tls' in data:
        current_app.config['MAIL_USE_TLS'] = data['mail_use_tls']
    if 'mail_username' in data:
        current_app.config['MAIL_USERNAME'] = data['mail_username']
    if 'mail_password' in data and data['mail_password']:
        current_app.config['MAIL_PASSWORD'] = data['mail_password']
    if 'mail_default_sender' in data:
        current_app.config['MAIL_DEFAULT_SENDER'] = data['mail_default_sender']
    
    # Persist to .env file so settings survive server restarts
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
        
        # Read existing .env content
        env_lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_lines = f.readlines()
        
        # Keys to persist
        env_updates = {
            'MAIL_SERVER': current_app.config.get('MAIL_SERVER', ''),
            'MAIL_PORT': str(current_app.config.get('MAIL_PORT', 587)),
            'MAIL_USE_TLS': str(current_app.config.get('MAIL_USE_TLS', True)),
            'MAIL_USERNAME': current_app.config.get('MAIL_USERNAME', ''),
            'MAIL_PASSWORD': current_app.config.get('MAIL_PASSWORD', ''),
            'MAIL_DEFAULT_SENDER': current_app.config.get('MAIL_DEFAULT_SENDER', ''),
        }
        
        # Update existing lines or track which keys were found
        found_keys = set()
        new_lines = []
        for line in env_lines:
            stripped = line.strip()
            key = stripped.split('=', 1)[0] if '=' in stripped else None
            if key and key in env_updates:
                new_lines.append(f"{key}={env_updates[key]}\n")
                found_keys.add(key)
            else:
                new_lines.append(line)
        
        # Add any keys that weren't already in the file
        for key, value in env_updates.items():
            if key not in found_keys:
                new_lines.append(f"{key}={value}\n")
        
        # Write back
        with open(env_path, 'w') as f:
            f.writelines(new_lines)
            
    except Exception as e:
        # Log but don't fail - runtime config is already updated
        import logging
        logging.getLogger(__name__).warning(f"Could not persist email config to .env: {e}")
    
    return jsonify({
        'success': True,
        'message': 'Email configuration updated and saved successfully'
    })


@bp.route('/test', methods=['POST'])
@token_required
def test_email():
    """Send a test email to verify SMTP configuration."""
    from flask import current_app
    
    data = request.get_json() or {}
    test_email = data.get('test_email')
    
    # Use the configured username as the default test email
    if not test_email:
        test_email = current_app.config.get('MAIL_USERNAME')
    
    if not test_email:
        return jsonify({
            'success': False,
            'message': 'No test email address provided and no MAIL_USERNAME configured.'
        }), 400
    
    # Check if SMTP is configured
    mail_server = current_app.config.get('MAIL_SERVER')
    mail_username = current_app.config.get('MAIL_USERNAME')
    
    template_status = data.get('template_status')
    
    if template_status:
        # Load specific template for testing with sample values
        print(f"[TEST EMAIL] Loading template for status: {template_status}")
        template = EmailService.get_template(template_status, "Test University", "Test Contact")
        if not template:
            print(f"[TEST EMAIL] ❌ Template not found for status: {template_status}")
            return jsonify({'success': False, 'message': f'Template not found for status: {template_status}'}), 404
        
        subject = f"[TEST] {template['subject']}"
        body = template['body']
        msg_type = f"template '{template_status}'"
        print(f"[TEST EMAIL] ✅ Template loaded successfully")
        print(f"[TEST EMAIL] Subject: {subject}")
        print(f"[TEST EMAIL] Body preview: {body[:100]}...")
    else:
        # Default SMTP test message
        subject = 'EduCRM - SMTP Test Email'
        body = 'This is a test email from EduCRM.\n\nIf you received this, your SMTP configuration is working correctly!\n\nBest regards,\nEduCRM System'
        msg_type = "SMTP test message"

    success = EmailService.send_email(
        test_email,
        subject,
        body
    )
    
    if success:
        return jsonify({'success': True, 'message': f'Test {msg_type} sent to {test_email}'})
    else:
        return jsonify({'success': False, 'message': f'Failed to send {msg_type}. Check your SMTP credentials.'}), 500


@bp.route('/send', methods=['POST'])
@token_required
def send_email():
    """Send a custom email with optional placeholder replacement."""
    data = request.get_json()
    
    to_email = data.get('to_email')
    subject = data.get('subject')
    body = data.get('body')
    prospect_id = data.get('prospect_id')  # Optional: for placeholder replacement
    
    if not to_email or not subject or not body:
        return jsonify({'success': False, 'message': 'to_email, subject, and body are required'}), 400
    
    # If prospect_id is provided, fetch prospect data for placeholder replacement
    prospect_data = None
    if prospect_id:
        try:
            from models import Prospect
            prospect = Prospect.query.get(prospect_id)
            if prospect:
                prospect_data = {
                    'contact_name': prospect.contact_name,
                    'school_name': prospect.school_name,
                    'email': prospect.email,
                    'status': prospect.status,
                    'phone': prospect.phone,
                    'country': prospect.country,
                    'school_type': prospect.school_type,
                    'contact_role': prospect.contact_role,
                }
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Could not fetch prospect {prospect_id}: {e}")
    
    result = EmailService.send_custom_email(to_email, subject, body, prospect_data)
    
    if result.get('success'):
        return jsonify({'success': True, 'message': f'Email sent to {to_email}'})
    else:
        return jsonify({'success': False, 'message': 'Failed to send email'}), 500


@bp.route('/templates', methods=['GET'])
@token_required
def get_templates():
    """Retrieve all configurable email templates."""
    templates = EmailService.load_templates()
    return jsonify({
        'success': True,
        'templates': templates
    })


@bp.route('/templates', methods=['POST'])
@token_required
@admin_required
def update_templates():
    """Update email templates."""
    data = request.get_json()
    if not data or 'templates' not in data:
        return jsonify({'success': False, 'message': 'Templates data is required'}), 400
    
    success = EmailService.save_templates(data['templates'])
    if success:
        return jsonify({'success': True, 'message': 'Templates updated successfully'})
    else:
        return jsonify({'success': False, 'message': 'Failed to save templates'}), 500
