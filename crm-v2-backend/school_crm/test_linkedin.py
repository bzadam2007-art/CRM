import requests
from bs4 import BeautifulSoup
import sys

def test_linkedin_parse(url, user_agent=None):
    if not user_agent:
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    print(f"Testing URL: {url} with UA: {user_agent[:50]}...")
    headers = {
        'User-Agent': user_agent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Final URL: {resp.url}")
        
        if "login" in resp.url.lower() or "auth" in resp.url.lower():
            print("FAILED: Redirected to Login page")
            return
            
        print(f"Content length: {len(resp.text)}")
        print("HTML Snippet (first 1000 chars):")
        print(resp.text[:1000])

        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # OG Title
        og_title = soup.find('meta', property='og:title')
        print(f"OG Title: {og_title['content'] if og_title else 'MISSING'}")
        
        # OG Description
        og_desc = soup.find('meta', property='og:description')
        print(f"OG Desc: {og_desc['content'] if og_desc else 'MISSING'}")
        
        # Page Title
        print(f"Page Title: {soup.title.string.strip() if soup.title else 'MISSING'}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_url = "https://www.linkedin.com/school/hec-paris/"
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    test_linkedin_parse(test_url)
