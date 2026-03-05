from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import requests
from bs4 import BeautifulSoup
import re

bp = Blueprint('import', __name__, url_prefix='/api/import')

@bp.route('/linkedin', methods=['POST'])
# @login_required
def import_linkedin():
    """
    Parse a public LinkedIn URL for school/company metadata.
    Does not use credentials or official API, only public HTML tags.
    """
    data = request.get_json()
    url = data.get('url')
    
    # Check if we already have the data from the extension
    inbound_name = data.get('school_name')
    inbound_country = data.get('country')
    inbound_website = data.get('website')
    
    if inbound_name:
        return jsonify({
            'success': True,
            'data': {
                'school_name': inbound_name,
                'country': inbound_country or "Other",
                'website': inbound_website or "",
                'source_url': url or ""
            }
        })
    
    if not url:
        return jsonify({'success': False, 'message': 'URL is required'}), 400
        
    if 'linkedin.com' not in url:
        return jsonify({'success': False, 'message': 'Invalid LinkedIn URL'}), 400

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    }

    try:
        # Fetch the page
        print(f"DEBUG: Attempting to scrape {url}")
        response = requests.get(url, headers=headers, timeout=10)
        
        # If LinkedIn blocks us (e.g. 429 or 999), we still return success 
        # but the extension is expected to provide the data instead.
        if response.status_code != 200:
            print(f"DEBUG: LinkedIn returned status {response.status_code}")
            return jsonify({
                'success': False, 
                'message': 'LinkedIn blocked server-side access. Please use the Expanzia Browser Extension.'
            }), 403

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Meta tag extraction
        school_name = ""
        website = ""
        country = ""
        
        # 1. School Name (og:title or title)
        og_title = soup.find('meta', property='og:title')
        if og_title:
            school_name = og_title['content'].split('|')[0].split(':')[0].strip()
        else:
            title_tag = soup.find('title')
            if title_tag:
                school_name = title_tag.get_text().split('|')[0].strip()

        # 2. Description (may contain location/size)
        og_desc = soup.find('meta', property='og:description')
        desc_text = og_desc['content'] if og_desc else ""
        
        # 3. Simple country inference
        countries = ['France', 'Switzerland', 'Belgium', 'Luxembourg', 'Germany', 'Canada', 'UAE', 'United Kingdom', 'USA']
        for c in countries:
            if c.lower() in desc_text.lower():
                country = c
                break
        
        # 4. Website inference
        website_match = re.search(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', desc_text)
        if website_match:
            website = website_match.group(0)

        return jsonify({
            'success': True,
            'data': {
                'school_name': school_name or "Unknown School",
                'country': country or "Other",
                'website': website or "",
                'source_url': url
            }
        })

    except Exception as e:
        print(f"DEBUG: Parsing error: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to parse LinkedIn page: {str(e)}'}), 500
