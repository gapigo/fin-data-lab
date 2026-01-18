import requests
import json

cnpj = "29.206.196/0001-57"
raw_cnpj = "29206196000157"

print(f"Testing CNPJ: {cnpj}")
try:
    # Test formatted
    print("Requesting formatted...")
    r = requests.get(f"http://127.0.0.1:8000/funds/{cnpj}")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print("Success!")
        # print(json.dumps(r.json(), indent=2))
    else:
        print(r.text)

    # Test raw
    print("\nRequesting raw...")
    r = requests.get(f"http://127.0.0.1:8000/funds/{raw_cnpj}")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print("Success!")
    else:
        print(r.text)

except Exception as e:
    print(f"Failed: {e}")
