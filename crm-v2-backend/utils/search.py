import json
import os

# Base path: .../school_crm/utils/search.py -> .../school_crm/utils -> .../school_crm -> .../CRM V2
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_FILE_PATH = os.path.join(BASE_DIR, 'world_universities_and_domains.json')

_universities_cache = None

def load_universities():
    global _universities_cache
    if _universities_cache is None:
        if os.path.exists(DATA_FILE_PATH):
            with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                _universities_cache = json.load(f)
        else:
            print(f"Error: JSON file not found at {DATA_FILE_PATH}")
            _universities_cache = []
    return _universities_cache

def search_universities(query, country=None, limit=20):
    """
    Search universities by name and optionally filter by country.
    Returns mapped objects matching the frontend's expected IProspect structure.
    """
    universities = load_universities()
    
    # Pre-filter by country if provided
    if country and country != 'All':
        universities = [u for u in universities if u.get('country') == country]

    if not query and not country:
        return []

    query = query.lower() if query else ''
    results = []
    
    for uni in universities:
        name = uni.get('name', '').lower()
        uni_country = uni.get('country', '').lower()
        
        # If we have a query, it must match name or country
        # (Though if country param is set, we mainly care about name matching query)
        if not query or (query in name or query in uni_country):
            # Map JSON structure to CRM structure
            mapped_uni = {
                'school_name': uni.get('name'),
                'country': uni.get('country'),
                'website': uni.get('web_pages', [''])[0] if uni.get('web_pages') else '',
                'school_type': 'University',
                'contact_role': '',
                'student_count': None,
                'email': '',
                'notes': uni.get('state-province')
            }
            results.append(mapped_uni)
            if len(results) >= limit:
                break
                
    return results
