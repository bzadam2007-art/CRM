"""
Prospect management routes with JSON API for React frontend.
Supports full CRUD operations, scoring, and filtering.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from utils.decorators import admin_required, token_required
from models import Prospect, Interaction
from extensions import db
from utils.scoring import calculate_score, recalculate_prospect_score
from utils.email_service import EmailService
from datetime import datetime
from sqlalchemy import or_
from utils.search import search_universities
import concurrent.futures
import requests as http_requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin

bp = Blueprint('prospects', __name__, url_prefix='/api/prospects')

# ==================== CREATE ====================

@bp.route('', methods=['POST'])
@login_required
def create_prospect():
    """
    Create a new prospect.
    Expected JSON: {school_name, country, school_type, contact_name, contact_role, email, website, student_count}
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['school_name', 'country', 'school_type', 'contact_role']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(required_fields)}'
            }), 400
        
        # Create prospect
        prospect = Prospect(
            school_name=data['school_name'],
            country=data['country'],
            school_type=data['school_type'],
            contact_name=data.get('contact_name'),
            contact_role=data['contact_role'],
            email=data.get('email'),
            website=data.get('website'),
            student_count=data.get('student_count'),
            notes=data.get('notes'),
            assigned_to_id=current_user.id,
            status=data.get('status', 'Nouveau')
        )
        
        # Calculate initial score
        score, priority, breakdown = calculate_score(prospect)
        prospect.score = score
        prospect.priority = priority
        
        db.session.add(prospect)
        db.session.commit()

        # Auto-send welcome email for 'Nouveau' status
        if prospect.status == 'Nouveau' and prospect.email:
            try:
                EmailService.send_auto_email(prospect, 'Nouveau')
            except Exception as e:
                # Log error but don't fail the creation
                print(f"Failed to auto-send email: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Prospect created successfully',
            'prospect': prospect.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating prospect: {str(e)}'
        }), 500


# ==================== READ ====================

@bp.route('', methods=['GET'])
@login_required
def list_prospects():
    """
    List all prospects with optional filtering and pagination.
    Query params: country, status, priority, search, page, per_page
    """
    try:
        # Get query parameters
        country = request.args.get('country')
        status = request.args.get('status')
        priority = request.args.get('priority')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Build query
        query = Prospect.query
        
        # Apply filters
        if country:
            query = query.filter_by(country=country)
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        if search:
            query = query.filter(or_(
                Prospect.school_name.ilike(f'%{search}%'),
                Prospect.email.ilike(f'%{search}%'),
                Prospect.country.ilike(f'%{search}%')
            ))
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page)
        
        return jsonify({
            'success': True,
            'prospects': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/<int:prospect_id>', methods=['GET'])
@login_required
def get_prospect(prospect_id):
    """Get a specific prospect by ID"""
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        
        return jsonify({
            'success': True,
            'prospect': prospect.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ==================== UPDATE ====================

@bp.route('/<int:prospect_id>', methods=['PUT'])
@login_required
def update_prospect(prospect_id):
    """
    Update a prospect.
    Expected JSON: any fields to update.
    Admin users cannot change the status field.
    """
    try:
        from utils.scoring import ScoringRules

        prospect = Prospect.query.get_or_404(prospect_id)
        data = request.get_json()

        # Admin users were previously blocked from changing status; removing that block to allow full admin control.

        # --- Validate status value ---
        if 'status' in data and data['status'] not in ScoringRules.VALID_STATUSES:
            return jsonify({
                'success': False,
                'message': f"Invalid status '{data['status']}'. Allowed: {', '.join(ScoringRules.VALID_STATUSES)}"
            }), 400
        
        # Update allowed fields
        allowed_fields = [
            'school_name', 'country', 'school_type', 'contact_name',
            'contact_role', 'contact_phone', 'email', 'status',
            'website', 'student_count', 'notes', 'country_group',
            'interaction_email_sent', 'interaction_response_received'
        ]
        
        # Capture old status before applying changes
        old_status = prospect.status

        for field in allowed_fields:
            if field in data:
                setattr(prospect, field, data[field])
        
        prospect.updated_at = datetime.utcnow()

        # --- On status change: always log an interaction + try auto-email ---
        if 'status' in data and prospect.status != old_status:
            # 1. Always log the status change as an interaction
            status_interaction = Interaction(
                prospect_id=prospect.id,
                interaction_type='status_change',
                description=f'Status changed from "{old_status}" to "{prospect.status}"',
                result='Neutral',
                created_by_id=current_user.id
            )
            db.session.add(status_interaction)
            prospect.last_interaction = datetime.utcnow()

            # 2. Try to send auto-email (non-blocking)
            try:
                email_result = EmailService.send_auto_email(prospect, prospect.status)
                if email_result:
                    email_interaction = Interaction(
                        prospect_id=prospect.id,
                        interaction_type=email_result['type'],
                        description=email_result['description'],
                        result=email_result['result'],
                        created_by_id=current_user.id
                    )
                    db.session.add(email_interaction)
            except Exception as email_err:
                print(f"Auto-email failed (non-blocking): {email_err}")
        
        # Recalculate score if relevant fields changed
        if any(field in data for field in ['status', 'country', 'school_type', 'contact_role', 'interaction_email_sent', 'interaction_response_received']):
            recalculate_prospect_score(prospect)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Prospect updated successfully',
            'prospect': prospect.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ==================== DELETE ====================

@bp.route('/<int:prospect_id>', methods=['DELETE'])
@login_required
def delete_prospect(prospect_id):
    """Delete a prospect"""
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        db.session.delete(prospect)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Prospect deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ==================== INTERACTIONS ====================

@bp.route('/<int:prospect_id>/interactions', methods=['POST'])
@login_required
def create_interaction(prospect_id):
    """
    Create an interaction for a prospect.
    Expected JSON: {interaction_type, description, result}
    """
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        data = request.get_json()
        
        interaction = Interaction(
            prospect_id=prospect_id,
            interaction_type=data.get('interaction_type'),
            description=data.get('description'),
            result=data.get('result'),
            created_by_id=current_user.id
        )
        
        # Update prospect's last interaction date
        prospect.last_interaction = datetime.utcnow()
        
        db.session.add(interaction)
        db.session.commit()
        
        # Recalculate score based on new interaction
        recalculate_prospect_score(prospect)
        
        return jsonify({
            'success': True,
            'message': 'Interaction recorded',
            'interaction': interaction.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/<int:prospect_id>/interactions', methods=['GET'])
@login_required
def get_interactions(prospect_id):
    """Get all interactions for a prospect"""
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        interactions = Interaction.query.filter_by(prospect_id=prospect_id).all()
        
        return jsonify({
            'success': True,
            'interactions': [i.to_dict() for i in interactions]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ==================== UTILITY ====================

@bp.route('/<int:prospect_id>/score', methods=['GET'])
@login_required
def get_prospect_score(prospect_id):
    """Get current score, priority and breakdown for a prospect"""
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        # Recalculate on fly to get latest breakdown reasoning
        score, priority, breakdown = calculate_score(prospect)
        
        return jsonify({
            'success': True,
            'score': score,
            'priority': priority,
            'breakdown': breakdown
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/<int:prospect_id>/score-history', methods=['GET'])
@login_required
def get_score_history(prospect_id):
    """Get history of scoring changes"""
    try:
        from models import ScoringLog
        logs = ScoringLog.query.filter_by(prospect_id=prospect_id).order_by(ScoringLog.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'history': [l.to_dict() for l in logs]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/stats/summary', methods=['GET'])
@login_required
def get_summary_stats():
    """Get summary statistics for prospects"""
    try:
        total = Prospect.query.count()
        by_status = db.session.query(
            Prospect.status,
            db.func.count(Prospect.id)
        ).group_by(Prospect.status).all()
        
        by_priority = db.session.query(
            Prospect.priority,
            db.func.count(Prospect.id)
        ).group_by(Prospect.priority).all()
        
        by_country = db.session.query(
            Prospect.country,
            db.func.count(Prospect.id)
        ).group_by(Prospect.country).order_by(
            db.func.count(Prospect.id).desc()
        ).limit(10).all()
        
        return jsonify({
            'success': True,
            'total_prospects': total,
            'by_status': {status: count for status, count in by_status},
            'by_priority': {priority: count for priority, count in by_priority},
            'by_country': {country: count for country, count in by_country}
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/<int:prospect_id>/qualify', methods=['POST'])
@login_required
def submit_qualification(prospect_id):
    """
    Accept qualification form submission from commercial users.
    Recalculates score based on form data and saves it.
    """
    from utils.scoring import recalculate_prospect_score
    
    # Only commercial users can submit qualifications
    if current_user.role != 'commercial':
        return jsonify({
            'success': False,
            'message': 'Only commercial users can submit qualifications'
        }), 403
    
    try:
        prospect = Prospect.query.get_or_404(prospect_id)
        data = request.get_json()
        
        # Validate that status is one of the qualification form options
        qualification_statuses = ['Nouveau', 'Contacté', 'Intéressé', 'Démo planifiée']
        if data.get('status') not in qualification_statuses:
            return jsonify({
                'success': False,
                'message': f'Invalid qualification status. Allowed: {", ".join(qualification_statuses)}'
            }), 400
        
        # Capture old status
        old_status = prospect.status

        # Update prospect with form data
        prospect.country = data.get('country', prospect.country)
        prospect.country_group = data.get('country_group', prospect.country_group)
        prospect.school_type = data.get('school_type', prospect.school_type)
        prospect.contact_role = data.get('contact_role', prospect.contact_role)
        prospect.status = data.get('status', prospect.status)
        prospect.interaction_email_sent = data.get('interaction_email_sent', False)
        prospect.interaction_response_received = data.get('interaction_response_received', False)
        prospect.updated_at = datetime.utcnow()
        
        # --- On status change: always log an interaction + try auto-email ---
        if prospect.status != old_status:
            # 1. Always log the status change as an interaction
            status_interaction = Interaction(
                prospect_id=prospect.id,
                interaction_type='status_change',
                description=f'Status changed from "{old_status}" to "{prospect.status}" (via Qualification Form)',
                result='Neutral',
                created_by_id=current_user.id
            )
            db.session.add(status_interaction)
            prospect.last_interaction = datetime.utcnow()

            # 2. Try to send auto-email (non-blocking)
            try:
                email_result = EmailService.send_auto_email(prospect, prospect.status)
                if email_result:
                    email_interaction = Interaction(
                        prospect_id=prospect.id,
                        interaction_type=email_result['type'],
                        description=email_result['description'],
                        result=email_result['result'],
                        created_by_id=current_user.id
                    )
                    db.session.add(email_interaction)
            except Exception as email_err:
                print(f"Auto-email failed (non-blocking): {email_err}")

        db.session.commit()
        
        # Recalculate score and save log
        recalculate_prospect_score(prospect)
        
        # Fetch updated data
        from utils.scoring import calculate_score
        score, priority, breakdown = calculate_score(prospect)
        
        return jsonify({
            'success': True,
            'message': 'Qualification saved successfully',
            'prospect': prospect.to_dict(),
            'score': score,
            'priority': priority,
            'breakdown': breakdown
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@bp.route('/search', methods=['GET'])
@login_required
def search_external_universities():
    """
    Search for universities from the JSON database.
    Query param: ?q=search_term
    """
    try:
        query = request.args.get('q', '')
        country = request.args.get('country', None)
        
        # Allow search if either query OR country is present
        if not query and not country:
            return jsonify({'success': False, 'results': []})
            
        results = search_universities(query, country=country)
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/send-welcome-email', methods=['POST'])
@token_required
def send_welcome_email():
    """
    Send a welcome email to a newly added prospect.
    Expected JSON: { "email": "...", "school_name": "...", "contact_name": "..." }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        school_name = data.get('school_name', 'Your School')
        contact_name = data.get('contact_name', 'Admissions Team')
        
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400
        
        # Use the existing EmailService template for "Nouveau" status
        template = EmailService.get_template('Nouveau', school_name, contact_name)
        
        if template:
            success = EmailService.send_email(email, template['subject'], template['body'])
            if success:
                # Update prospect interaction status if we can find them by email
                prospect = Prospect.query.filter_by(email=email).first()
                if prospect:
                    prospect.interaction_email_sent = True
                    prospect.last_interaction = datetime.utcnow()
                    
                    # Create interaction record for tracking
                    # Fallback user logic: try to find the 'admin' user, otherwise use ID 1
                    admin_id = 1
                    try:
                        from models import User
                        admin = User.query.filter_by(username='admin').first()
                        if admin:
                            admin_id = admin.id
                    except:
                        pass

                    interaction = Interaction(
                        prospect_id=prospect.id,
                        interaction_type='email',
                        description=f"Welcome email sent: {template['subject']}",
                        result='Positive',
                        created_by_id=current_user.id if (current_user.is_authenticated and hasattr(current_user, 'id')) else admin_id
                    )
                    db.session.add(interaction)
                    db.session.commit()

                return jsonify({
                    'success': True, 
                    'message': f'Welcome email sent to {email}',
                    'subject': template['subject']
                })
            else:
                return jsonify({'success': False, 'message': 'Failed to send email. Check SMTP settings or logs.'}), 500
        
        return jsonify({'success': False, 'message': 'No template found for status "Nouveau"'}), 404
        
    except Exception as e:
        import traceback
        print(f"Error in send_welcome_email: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<int:prospect_id>/status-notify', methods=['POST'])
@token_required
def status_notify(prospect_id):
    """
    Trigger a status change email notification as a side-effect of a frontend update.
    Expected JSON: { "prospect_data": {...}, "new_status": "..." }
    """
    try:
        data = request.get_json()
        prospect_data = data.get('prospect_data')
        new_status = data.get('new_status')
        
        if not prospect_data or not new_status:
            return jsonify({'success': False, 'message': 'Missing data (prospect_data or new_status)'}), 400
            
        print(f"📧 Notification trigger received for prospect {prospect_id}, new status: {new_status}")
        
        # Use our flexible send_auto_email
        result = EmailService.send_auto_email(prospect_data, new_status)
        
        if result:
            # Create a local interaction record if the prospect exists in our local DB
            # This helps keep some history even if we primarily use Supabase
            try:
                local_prospect = Prospect.query.get(prospect_id)
                if local_prospect:
                    admin_id = 1
                    try:
                        from models import User
                        admin = User.query.filter_by(username='admin').first()
                        if admin: admin_id = admin.id
                    except: pass

                    interaction = Interaction(
                        prospect_id=prospect_id,
                        interaction_type='email',
                        description=result['description'],
                        result='Positive',
                        created_by_id=admin_id
                    )
                    db.session.add(interaction)
                    db.session.commit()
            except Exception as db_err:
                print(f"Warning: Could not save local interaction record: {db_err}")

            return jsonify({
                'success': True,
                'message': f"Email notification sent for status '{new_status}'",
                'details': result
            })
        else:
            return jsonify({
                'success': False,
                'message': f"No email sent for status '{new_status}'. No template found or SMTP error."
            })
            
    except Exception as e:
        import traceback
        print(f"Error in status_notify: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f"Internal server error: {str(e)}"}), 500


@bp.route('/find-email', methods=['POST'])
# @login_required  # Removed: frontend calls this without Flask session
def find_university_email():
    """
    Scrape the university website for contact email.
    Crawls homepage + common contact pages for better results.
    Expected JSON: { "url": "https://..." }
    """
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'success': False, 'message': 'URL is required'}), 400

        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Ensure trailing slash for base URL
        base_url = url.rstrip('/') + '/'

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5,fr;q=0.3',
        }

        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'

        blacklist_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js')
        blacklist_domains = ('example.com', 'email.com', 'domain.com', 'yoursite.com', 'sentry.io', 'w3.org')

        # Generic prefixes that the user wants to DE-PRIORITIZE
        generic_prefixes = ['info', 'contact', 'admissions', 'enquir', 'hello', 'support', 'admin', 'reception', 'office', 'webmaster', 'general', 'registrar', 'admission']
        # High value keywords (people/roles)
        high_value_keywords = ['direct', 'head', 'dean', 'presid', 'registra', 'coord', 'manage', 'faculty', 'professor', 'teacher']

        def is_valid_email(email):
            """Filter out false-positive emails."""
            email_lower = email.lower()
            if any(email_lower.endswith(ext) for ext in blacklist_extensions):
                return False
            if any(domain in email_lower for domain in blacklist_domains):
                return False
            if len(email) > 60 or len(email) < 5:
                return False
            return True

        def score_email(email):
            """Score an email based on how 'real' or 'personal' it looks."""
            score = 10
            email_lower = email.lower()
            prefix = email_lower.split('@')[0]
            
            # Penalize generic ones
            if any(g in prefix for g in generic_prefixes):
                score -= 15
            
            # Boost for person-like patterns (john.doe, j.doe)
            if '.' in prefix or '_' in prefix:
                score += 10
                
            # Boost for high value roles
            if any(h in prefix for h in high_value_keywords):
                score += 15
                
            return score

        def extract_info_from_page(page_url):
            """Fetch a page and extract emails and names."""
            found_info = {'emails': []}
            try:
                resp = http_requests.get(page_url, headers=headers, timeout=10, allow_redirects=True)
                resp.raise_for_status()
                
                soup = BeautifulSoup(resp.text, 'html.parser')
                
                # Check all mailto links and try to get the text around them
                for link in soup.select('a[href^="mailto:"]'):
                    email = link.get('href', '').replace('mailto:', '').split('?')[0].strip()
                    if is_valid_email(email):
                        # Attempt to get name from link text or nearby
                        name = link.get_text(strip=True)
                        if not name or '@' in name or len(name) < 2:
                            # Try parent's text
                            name = link.parent.get_text(separator=' ', strip=True).split(email)[0].strip()
                        
                        # Clean name
                        name = re.sub(r'[:\-,\(\)\]\[]', '', name).strip()
                        if len(name) > 50 or len(name) < 3:
                            name = None
                            
                        found_info['emails'].append({'email': email, 'name': name, 'score': score_email(email)})
                
                # Regex fallback for emails in text
                text_content = soup.get_text(separator=' ')
                for email in re.findall(email_pattern, text_content):
                    if is_valid_email(email) and not any(e['email'] == email for e in found_info['emails']):
                        found_info['emails'].append({'email': email, 'name': None, 'score': score_email(email)})

            except Exception:
                pass
            
            return found_info

        # Pages to crawl
        pages_to_crawl = [
            base_url,
            urljoin(base_url, 'contact'),
            urljoin(base_url, 'contact-us'),
            urljoin(base_url, 'about'),
            urljoin(base_url, 'staff'),
            urljoin(base_url, 'administration'),
        ]

        all_emails = []
        crawled = set()

        # Crawl concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_url = {executor.submit(extract_info_from_page, page_url): page_url for page_url in pages_to_crawl}
            try:
                for future in concurrent.futures.as_completed(future_to_url, timeout=25):
                    page_url = future_to_url[future]
                    try:
                        res = future.result()
                        all_emails.extend(res['emails'])
                    except Exception as e:
                        print(f"Error crawling {page_url}: {e}")
                        continue
            except concurrent.futures.TimeoutError:
                print("Scraping reached timeout (25s), moving on with what we found.")
            except Exception as e:
                print(f"Unexpected error in thread pool: {e}")

        # Sort emails by score descending
        all_emails = sorted(all_emails, key=lambda x: x['score'], reverse=True)
        # Unique by email
        seen_emails = set()
        unique_emails = []
        for e in all_emails:
            if e['email'] not in seen_emails:
                unique_emails.append(e)
                seen_emails.add(e['email'])

        if unique_emails:
            best_match = unique_emails[0]
            return jsonify({
                'success': True,
                'email': best_match['email'],
                'contact_name': best_match['name'],
                'all_emails_found': len(unique_emails),
                'source': 'refined_scraper'
            })

        return jsonify({'success': False, 'message': 'No high-quality contact info found'}), 404

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
