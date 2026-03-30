import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

ERP_URL = os.getenv("ERPNEXT_URL", "http://localhost:8080").rstrip("/")
API_KEY = os.getenv("API_KEY")
API_SECRET = os.getenv("API_SECRET")

if not API_KEY or not API_SECRET:
    print("Warning: API_KEY or API_SECRET is missing. The seed script might fail.")

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def check_exists(doctype, filters):
    fields = '["name"]'
    filter_str = json.dumps(filters)
    url = f"{ERP_URL}/api/resource/{doctype}?filters={filter_str}&fields={fields}"
    try:
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            data = res.json().get("data", [])
            return len(data) > 0
    except Exception as e:
        print(f"Error checking {doctype}: {str(e)}")
    return False

def create_doc(doctype, data, filters):
    print(f"[*] Checking {doctype}: {filters}")
    if check_exists(doctype, filters):
        print(f"    -> Already exists. Skipping.")
        return
        
    url = f"{ERP_URL}/api/resource/{doctype}"
    try:
        res = requests.post(url, headers=HEADERS, json=data)
        if res.status_code == 200:
            print(f"    -> Successfully created {doctype}.")
        else:
            print(f"    -> Error creating {doctype}: {res.text}")
    except Exception as e:
        print(f"    -> Request failed: {str(e)}")

def main():
    print("=== Start Seeding ERPNext (Group 2) ===")
    
    # 1. Company
    create_doc("Company", {
        "company_name": "Group 2 Corporation",
        "abbr": "G2",
        "default_currency": "THB"
    }, [["company_name", "=", "Group 2 Corporation"]])
    
    # 2. Item Group
    create_doc("Item Group", {
        "item_group_name": "Hardware G2",
        "parent_item_group": "All Item Groups"
    }, [["item_group_name", "=", "Hardware G2"]])
    
    # 3. Asset Category
    create_doc("Asset Category", {
        "asset_category_name": "IT_TOOLS_G2",
    }, [["asset_category_name", "=", "IT_TOOLS_G2"]])
    
    # 4. Locations
    create_doc("Location", {
        "location_name": "Engineering Building G2"
    }, [["location_name", "=", "Engineering Building G2"]])
    
    create_doc("Location", {
        "location_name": "IT Room G2"
    }, [["location_name", "=", "IT Room G2"]])
    
    # 5. Warehouse
    create_doc("Warehouse", {
        "warehouse_name": "Stores - G2",
        "company": "Group 2 Corporation",
        "is_group": 0
    }, [["warehouse_name", "=", "Stores - G2"]])
    
    # 6. Item 1 (Asset Tests)
    create_doc("Item", {
        "item_code": "APT_001_G2",
        "item_name": "Notebook G2",
        "item_group": "Hardware G2",
        "is_stock_item": 0,
        "is_fixed_asset": 1,
        "asset_category": "IT_TOOLS_G2"
    }, [["item_code", "=", "APT_001_G2"]])
    
    # 7. Item 2 (Stock Tests)
    create_doc("Item", {
        "item_code": "STK_001_G2",
        "item_name": "Mouse G2",
        "item_group": "Hardware G2",
        "is_stock_item": 1
    }, [["item_code", "=", "STK_001_G2"]])
    
    print("=== Seeding Finished ===")

if __name__ == "__main__":
    main()
