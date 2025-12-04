import requests
import json
import time

# --- Configuration ---
API_ENDPOINT = "http://localhost:3000/api/v1/classes"
DATA_FILE = "test/classes.jsonl"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDk1YmZjZC1hNTIyLTRjYmMtOTQ1MC1lZWQ0Mzg2ZGVkYjgiLCJlbWFpbCI6Im1lemhlcmc0M0BnbWFpbC5jb20iLCJpYXQiOjE3NjQ4MTUwOTQsImV4cCI6MTc2NTQxOTg5NH0.K-KNr40u3U8kkopPB4rn2ftrmwmmuLG-fdL-ioyGW7s"
}
REQUEST_DELAY_SECONDS = 0.5  # Add a delay to avoid overwhelming the server
# ---------------------

def check_server_connection():
    """
    Check if the server is running and accessible.
    """
    try:
        response = requests.get(API_ENDPOINT, headers=HEADERS, timeout=5)
        return response.status_code in [200, 401, 403]  # 401/403 means server is up but auth might be wrong
    except requests.exceptions.RequestException:
        return False

def create_classes():
    """
    Reads data from classes.jsonl file and creates classes via POST requests.
    """
    success_count = 0
    failure_count = 0

    print(f"Starting batch creation for endpoint: {API_ENDPOINT}")
    print(f"Reading data from: {DATA_FILE}\n")

    try:
        with open(DATA_FILE, 'r') as f:
            for line_number, line in enumerate(f, 1):
                # 1. Parse the JSON data from the line
                try:
                    payload = json.loads(line.strip())
                except json.JSONDecodeError:
                    print(f"FAILURE (Line {line_number}): Invalid JSON format. Skipping.")
                    failure_count += 1
                    continue

                item_title = payload.get("title", f"Item_{line_number}")
                
                # 2. Send the HTTP POST request
                try:
                    response = requests.post(API_ENDPOINT, headers=HEADERS, json=payload)
                    
                    # 3. Check for request status
                    if response.status_code in [200, 201, 202]:
                        print(f"SUCCESS (Line {line_number}): '{item_title}' created. Status: {response.status_code}")
                        success_count += 1
                    else:
                        # Log detailed error information
                        print(f"FAILURE (Line {line_number}): '{item_title}' failed. Status: {response.status_code}")
                        print(f"  Response Body: {response.text[:100]}...") # Print first 100 chars of response
                        failure_count += 1
                
                except requests.exceptions.RequestException as e:
                    print(f"NETWORK ERROR (Line {line_number}): '{item_title}' failed due to network issue: {e}")
                    failure_count += 1
                
                # 4. Wait to prevent rate-limiting/DDoS protection
                time.sleep(REQUEST_DELAY_SECONDS)

    except FileNotFoundError:
        print(f"\nERROR: Data file '{DATA_FILE}' not found.")
        return

    print("\n--- Batch Process Complete ---")
    print(f"Total Successful Creations: {success_count}")
    print(f"Total Failures/Errors: {failure_count}")

def main():
    """
    The main execution flow for creating classes.
    """
    print("=== CLASS CREATION SCRIPT ===")
    
    # 0. Check if server is running
    print("\n=== STEP 0: Checking Server Connection ===")
    if not check_server_connection():
        print("ERROR: Cannot connect to server. Make sure the backend is running on http://localhost:9100")
        return
    print("✓ Server is accessible")
    
    # 1. Create classes from the JSONL file
    print("\n=== STEP 1: Creating Classes ===")
    create_classes()
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
