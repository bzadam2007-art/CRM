import csv
import io
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import Prospect
from extensions import db
from utils.scoring import calculate_score

bp = Blueprint('import_export', __name__, url_prefix='/api/data')

@bp.route('/import/csv', methods=['POST'])
@login_required
def import_csv():
    """
    Import prospects from CSV.
    Expected columns: School Name, Country, Contact Name, Email, Website, etc.
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'File must be a CSV'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        count = 0
        errors = []
        
        for i, row in enumerate(csv_input):
            try:
                # Map CSV columns to model fields (flexible mapping)
                # We expect headers roughly matching our schema or common variations
                school_name = row.get('School Name') or row.get('Company') or row.get('Name')
                if not school_name: continue # Skip empty rows
                
                prospect = Prospect(
                    school_name=school_name,
                    country=row.get('Country') or 'Unknown',
                    school_type=row.get('Type') or 'International School',
                    contact_name=row.get('Contact Name') or row.get('Contact'),
                    contact_role=row.get('Role') or row.get('Position') or 'Principal',
                    email=row.get('Email'),
                    website=row.get('Website'),
                    student_count=int(row.get('Student Count')) if row.get('Student Count') and row.get('Student Count').isdigit() else 0,
                    notes=row.get('Notes'),
                    status='Nouveau',
                    assigned_to_id=current_user.id
                )
                
                # Calculate initial score
                score, priority, breakdown = calculate_score(prospect)
                prospect.score = score
                prospect.priority = priority
                
                db.session.add(prospect)
                count += 1
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Imported {count} prospects successfully.',
            'errors': errors
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing file: {str(e)}'}), 500

@bp.route('/clear', methods=['DELETE'])
@login_required
def clear_database():
    """Wipe all prospects and related data."""
    try:
        # We need to delete dependent records first if we didn't set up cascades perfectly
        # But SQLAlchemy usually handles cascades if configured, or we delete usage.
        # For now, simplistic approach:
        num_deleted = Prospect.query.delete()
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Deleted {num_deleted} prospects.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error clearing database: {str(e)}'}), 500
