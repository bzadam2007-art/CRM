import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import current_app

logger = logging.getLogger(__name__)

class EmailService:
    
    @staticmethod
    def send_email(to_email, subject, body, html_body=None):
        """
        Send an email via SMTP or mock if not configured.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text email body
            html_body: Optional HTML version of the email
        
        Returns:
            bool: True if sent successfully, False otherwise
        """
        # Log the attempt
        logger.info(f"--------------------------------------------------")
        logger.info(f"📧 SENDING EMAIL to {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {body}")
        logger.info(f"--------------------------------------------------")
        
        # Check if SMTP is configured
        mail_server = current_app.config.get('MAIL_SERVER')
        mail_username = current_app.config.get('MAIL_USERNAME')
        
        if not mail_server or not mail_username:
            logger.warning(f"SMTP not configured properly. Server: {mail_server}, Username: {mail_username}")
            return False
        
        # Get SMTP settings
        mail_port = current_app.config.get('MAIL_PORT', 587)
        mail_use_tls = current_app.config.get('MAIL_USE_TLS', True)
        if isinstance(mail_use_tls, str):
            mail_use_tls = mail_use_tls.lower() in ['true', '1', 'yes']
        
        mail_password = current_app.config.get('MAIL_PASSWORD', '')
        if mail_password:
            mail_password = mail_password.replace(" ", "")

        # Log settings (masking password)
        logger.info(f"Using SMTP Server: {mail_server}:{mail_port}, TLS: {mail_use_tls}, User: {mail_username}")
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = current_app.config.get('MAIL_DEFAULT_SENDER', mail_username)
            msg['To'] = to_email
            
            # Attach plain text
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach HTML if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Send via SMTP
            logger.info(f"Connecting to {mail_server}:{mail_port}...")
            with smtplib.SMTP(
                mail_server,
                mail_port,
                timeout=15
            ) as server:
                if mail_use_tls:
                    logger.info("Starting TLS...")
                    server.starttls()
                
                logger.info(f"Logging in as {mail_username}...")
                server.login(
                    mail_username,
                    mail_password
                )
                
                logger.info("Sending message...")
                server.send_message(msg)
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ SMTP Authentication failed for {mail_username}: {str(e)}")
            return False
        except smtplib.SMTPConnectError as e:
            logger.error(f"❌ SMTP Connection failed to {mail_server}:{mail_port}: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"❌ SMTP Error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error sending email: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    @staticmethod
    def get_templates_path():
        import os
        return os.path.join(os.path.dirname(__file__), 'email_templates.json')

    @staticmethod
    def load_templates():
        """Load email templates from Supabase (source of truth) with file fallback."""
        import json
        import requests
        
        # Try Supabase first
        url = current_app.config.get('SUPABASE_URL')
        key = current_app.config.get('SUPABASE_ANON_KEY')
        
        logger.info(f"DEBUG: Loading templates. Supabase URL: {url}")
        
        if url and key:
            try:
                # Same path as frontend: prospects table, school_name = __SYSTEM_EMAIL_TEMPLATES__
                rest_url = f"{url}/rest/v1/prospects?school_name=eq.__SYSTEM_EMAIL_TEMPLATES__&select=notes"
                headers = {
                    "apikey": key,
                    "Authorization": f"Bearer {key}"
                }
                logger.info(f"DEBUG: Fetching from Supabase: {rest_url}")
                response = requests.get(rest_url, headers=headers, timeout=5)
                logger.info(f"DEBUG: Supabase response status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    if data and data[0].get('notes'):
                        logger.info("DEBUG: Successfully loaded templates from Supabase")
                        return json.loads(data[0]['notes'])
                    else:
                        logger.warning("DEBUG: Supabase record found but 'notes' is empty")
                else:
                    logger.error(f"DEBUG: Supabase error: {response.text}")
            except Exception as e:
                logger.error(f"Error fetching templates from Supabase: {e}")

        # Fallback to local JSON file
        logger.info("DEBUG: Falling back to local templates file")
        import os
        path = EmailService.get_templates_path()
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading local templates: {e}")
        return {}

    @staticmethod
    def save_templates(templates):
        """Save email templates to JSON file."""
        import json
        path = EmailService.get_templates_path()
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(templates, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving templates: {e}")
            return False

    @staticmethod
    def ensure_templates_have_placeholders():
        """
        Verify and repair templates to ensure they have proper placeholders.
        This helps recover if templates were accidentally saved without placeholders.
        """
        templates = EmailService.load_templates()
        
        # Template defaults with proper placeholders
        defaults = {
            "Nouveau": {
                "subject": "Welcome to {school_name}, {contact_name}!",
                "body": "Dear {contact_name},\n\nWe are delighted to welcome you to our platform.\n\n{school_name} is an exceptional institution, and we look forward to connecting.\n\nBest regards,\nThe Education CRM Team"
            }
        }
        
        modified = False
        
        # Check if templates are missing or don't have placeholders
        for key, value in defaults.items():
            if key not in templates:
                logger.warning(f"Template '{key}' missing, adding default with placeholders")
                templates[key] = value
                modified = True
            elif '{' not in templates[key].get('subject', '') or '{' not in templates[key].get('body', ''):
                logger.warning(f"Template '{key}' missing placeholders, restoring defaults")
                templates[key] = value
                modified = True
        
        # Save if we made changes
        if modified:
            logger.info("Saving repaired templates with placeholders restored")
            EmailService.save_templates(templates)
            return True
        
        return False

    @staticmethod
    def get_template(status, school_name, contact_name):
        """
        Get email template based on status and format with prospect data.
        """
        templates = EmailService.load_templates()
        template = templates.get(status)
        
        logger.info(f"📧 Getting template for status: {status}")
        logger.info(f"   Available statuses: {list(templates.keys())}")
        
        # Fallback to default if status-specific template is missing
        if not template:
            logger.warning(f"Template not found for status '{status}', trying default_status_change")
            template = templates.get('default_status_change')
            
        if not template:
            logger.error(f"❌ No template found for status {status} and no default available")
            return None
        
        # Log the template before formatting
        logger.info(f"   Raw template subject: {template.get('subject', 'NO SUBJECT')}")
        logger.info(f"   Raw template body: {template.get('body', 'NO BODY')[:100]}...")
        
        # Use replace_placeholders for robust replacement
        try:
            prospect_data = {
                'school_name': school_name,
                'contact_name': contact_name,
                'status': status
            }
            
            subject = EmailService.replace_placeholders(template.get('subject', ''), prospect_data)
            body = EmailService.replace_placeholders(template.get('body', ''), prospect_data)
            
            logger.info(f"✅ Template formatted successfully")
            logger.info(f"   Formatted subject: {subject}")
            logger.info(f"   Formatted body: {body[:100]}...")
            
        except Exception as e:
            logger.error(f"❌ Error formatting template: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
        
        return {
            'subject': subject,
            'body': body
        }

    @staticmethod
    def send_auto_email(prospect, status):
        """
        Trigger an automated email if a template exists for the status.
        Works with both Model instances and Dictionaries.
        
        Returns:
            dict or None: The interaction details if sent, else None
        """
        # Handle both object and dict access
        def get_val(obj, key, default=None):
            if hasattr(obj, key):
                return getattr(obj, key)
            if isinstance(obj, dict):
                return obj.get(key, default)
            return default

        email = get_val(prospect, 'email')
        school_name = get_val(prospect, 'school_name', 'Your School')
        contact_name = get_val(prospect, 'contact_name', 'Admissions Team')

        if not email:
            logger.warning(f"No email address for prospect {get_val(prospect, 'id', 'unknown')}")
            return None
            
        template = EmailService.get_template(status, school_name, contact_name)
        if template:
            success = EmailService.send_email(
                email, 
                template['subject'], 
                template['body']
            )
            
            if success:
                return {
                    'type': 'email',
                    'status': status,
                    'description': f"Auto-sent email for status '{status}': {template['subject']}",
                    'result': 'Positive'
                }
        return None

    @staticmethod
    def replace_placeholders(text, prospect_data=None, fallback_values=None):
        """
        Replace placeholder variables in text with actual values.
        Supports both:
        - Single braces: {contact_name}, {school_name} (snake_case)
        - Double braces: {{ContactName}}, {{SchoolName}} (CamelCase)
        
        Args:
            text: Text containing placeholders
            prospect_data: Dictionary or object with prospect information
            fallback_values: Dictionary with default values for placeholders
        
        Returns:
            str: Text with placeholders replaced
        """
        if not text:
            return text
        
        import re
        
        # Build values dictionary
        values = fallback_values or {}
        
        if prospect_data:
            # Handle both dict and object access
            prospect_dict = prospect_data if isinstance(prospect_data, dict) else {
                'contact_name': getattr(prospect_data, 'contact_name', ''),
                'school_name': getattr(prospect_data, 'school_name', ''),
                'email': getattr(prospect_data, 'email', ''),
                'status': getattr(prospect_data, 'status', ''),
                'phone': getattr(prospect_data, 'phone', ''),
                'country': getattr(prospect_data, 'country', ''),
                'school_type': getattr(prospect_data, 'school_type', ''),
                'contact_role': getattr(prospect_data, 'contact_role', ''),
            }
            # Merge prospect data (prospect data takes priority)
            values.update({k: v for k, v in prospect_dict.items() if v})
        
        # Set defaults for common placeholders that weren't provided
        defaults = {
            'contact_name': 'Admissions Team',
            'school_name': 'Your School',
            'status': 'Prospect',
            'country': 'Unknown',
            'email': 'contact@school.edu',
            'phone': '',
            'school_type': '',
            'contact_role': '',
            'company_name': 'Expanzia',
            'your_name': 'Adam',
            'demo_date': 'TBD',
        }
        for key, default_val in defaults.items():
            if key not in values:
                values[key] = default_val
        
        # Create mapping for CamelCase to snake_case
        camel_to_snake_map = {
            'SchoolName': values.get('school_name', 'Your School'),
            'ContactName': values.get('contact_name', 'Admissions Team'),
            'Email': values.get('email', 'contact@school.edu'),
            'Status': values.get('status', 'Prospect'),
            'Phone': values.get('phone', ''),
            'Country': values.get('country', 'Unknown'),
            'SchoolType': values.get('school_type', ''),
            'ContactRole': values.get('contact_role', ''),
            'CompanyName': values.get('company_name', 'Our Company'),
            'YourName': values.get('your_name', 'Team'),
            'DemoDate': values.get('demo_date', 'TBD'),
        }
        
        result = text
        
        # Replace double curly braces {{CamelCase}} first
        for camel_case, value in camel_to_snake_map.items():
            double_brace_pattern = f'{{{{{camel_case}}}}}'
            result = result.replace(double_brace_pattern, str(value))
        
        # Replace single curly braces {snake_case}
        class DefaultDict(dict):
            def __missing__(self, key):
                return f'{{{key}}}'  # Return placeholder as-is if key not found
        
        values_with_defaults = DefaultDict(values)
        
        try:
            result = result.format_map(values_with_defaults)
        except (KeyError, ValueError) as e:
            logger.warning(f"Error replacing placeholders: {e}")
        
        return result
        
        return result

    @staticmethod
    def send_custom_email(to_email, subject, body, prospect_data=None):
        """
        Send a custom email to a prospect.
        
        Args:
            to_email: Recipient email
            subject: Email subject
            body: Email body text
            prospect_data: Optional prospect data dict/object for placeholder replacement
        
        Returns:
            dict: Status information
        """
        # Replace any placeholders in subject and body
        replaced_subject = EmailService.replace_placeholders(subject, prospect_data)
        replaced_body = EmailService.replace_placeholders(body, prospect_data)
        
        success = EmailService.send_email(to_email, replaced_subject, replaced_body)
        return {
            'success': success,
            'email': to_email,
            'subject': replaced_subject,
            'timestamp': datetime.utcnow().isoformat()
        }

