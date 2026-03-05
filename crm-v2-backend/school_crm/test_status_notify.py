import requests
import json

def test_status_notify():
    url = "http://127.0.0.1:5000/api/prospects/1/status-notify"
    payload = {
        "prospect_data": {
            "id": 1,
            "school_name": "Test University",
            "contact_name": "Test Contact",
            "email": "b.zadam2007@gmail.com"
        },
        "new_status": "Nouveau"
    }
    headers = {
        "Content-Type": "application/json",
        "X-Internal-API-Key": "dev-secret-key-change-in-production"
    }
    
    print(f"Testing status-notify endpoint at {url}...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200 and response.json().get('success'):
            print("✅ Status-notify test PASSED")
        else:
            print("❌ Status-notify test FAILED")
            
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")

if __name__ == "__main__":
    test_status_notify()
