import requests

url = "http://127.0.0.1:5000/api/prospects/find-email"
# Test with a real university website
target_url = "https://www.hec.edu"

response = requests.post(url, json={"url": target_url})
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
