import requests
import time

print("Waiting for server...")
time.sleep(3)

try:
    print("Testing /health...")
    r = requests.get("http://127.0.0.1:8000/")
    print(r.json())
    
    print("Testing /funds (search)...")
    r = requests.get("http://127.0.0.1:8000/funds?limit=5")
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} funds")
        if len(data) > 0:
            print(f"First fund: {data[0]}")
            cnpj = data[0]['cnpj_fundo']
            
            print(f"Testing /funds/{cnpj}...")
            r = requests.get(f"http://127.0.0.1:8000/funds/{cnpj}")
            print(r.json())
            
            print(f"Testing /funds/{cnpj}/history...")
            r = requests.get(f"http://127.0.0.1:8000/funds/{cnpj}/history")
            hist = r.json()
            print(f"History items: {len(hist)}")
    else:
        print(f"Error searching funds: {r.text}")

except Exception as e:
    print(f"Test failed: {e}")
