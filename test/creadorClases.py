import requests
import json
import time

# --- Configuration ---
API_ENDPOINT = "http://localhost:3000/api/v1/classes" # << REPLACE WITH YOUR ACTUAL URL
DATA_FILE = "test/classes.jsonl"
SESSIONS_DATA_FILE = "test/sessions_to_schedule.jsonl"
GET_CLASSES_ENDPOINT = "http://localhost:3000/api/v1/classes"
# POST_SESSIONS_ENDPOINT will be constructed dynamically for each class
BASE_URL = "http://localhost:3000/api/v1/classes"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4OWE5ZjBlNC0yZWFhLTQ0YzktODJkNC01OTVjMmNkNGNhZmIiLCJlbWFpbCI6Im1hdGljYWxsZXNAZ21haWwuY29tIiwiaWF0IjoxNzU4OTQ5MTUwLCJleHAiOjE3NTk1NTM5NTB9.in0PoRAOPgw0vFrDPKRK9t0GEqQuFU9IfJcGrcTDo-0"
    # "Authorization": "Bearer YOUR_AUTH_TOKEN"
}
REQUEST_DELAY_SECONDS = 0.5  # Add a delay to avoid overwhelming the server (throttle control)
# ---------------------

def get_existing_class_ids():
    """
    Performs a GET request to retrieve all existing classes and returns a list of their IDs.
    """
    print(f"\n---> 1. Retrieving existing classes from: {GET_CLASSES_ENDPOINT}")
    try:
        response = requests.get(GET_CLASSES_ENDPOINT, headers=HEADERS)
        response.raise_for_status() # Raises an exception for 4xx or 5xx status codes
        
        classes = response.json()
        class_ids = [cls['id'] for cls in classes]
        
        print(f"    - Success! Retrieved {len(class_ids)} class IDs.")
        return class_ids
        
    except requests.exceptions.RequestException as e:
        print(f"    - ERROR: Failed to retrieve classes. {e}")
        return []

def schedule_sessions(class_ids):
    """
    Schedules multiple sessions for each provided class ID.
    """
    
    try:
        with open(SESSIONS_DATA_FILE, 'r') as f:
            session_payloads = [json.loads(line) for line in f]
    except FileNotFoundError:
        print(f"\nERROR: Sessions data file '{SESSIONS_DATA_FILE}' not found. Cannot schedule sessions.")
        return
    except json.JSONDecodeError as e:
        print(f"\nERROR: Failed to parse JSON in '{SESSIONS_DATA_FILE}'. Check format. Error: {e}")
        return
    
    total_classes = len(class_ids)
    total_sessions_to_create = total_classes * len(session_payloads)
    sessions_created = 0
    
    print(f"\n---> 2. Scheduling {len(session_payloads)} sessions for {total_classes} classes (Total: {total_sessions_to_create})...")
    
    for class_id in class_ids:
        
        for session_data in session_payloads:
            
            # 1. Construct the final payload for the session
            # The classId comes from the URL parameter, but we still need it in the payload
            final_payload = {
                "classId": class_id,
                "startAt": session_data["startAt"],
                "durationMin": session_data.get("durationMin"),
                "capacity": session_data.get("capacity")
            }
            
            # 2. Make the POST request to the correct endpoint
            session_endpoint = f"{BASE_URL}/{class_id}/sessions"
            try:
                response = requests.post(session_endpoint, headers=HEADERS, json=final_payload)
                response.raise_for_status() 
                
                sessions_created += 1
                
                print(f"    - Class ID {class_id[:8]}...: SUCCESS - Scheduled session at {session_data['startAt']}")

            except requests.exceptions.RequestException as e:
                # Print the error message from the API if available
                try:
                    error_detail = response.text if 'response' in locals() and response.status_code >= 400 else str(e)
                    status_code = response.status_code if 'response' in locals() else "N/A"
                except:
                    error_detail = str(e)
                    status_code = "N/A"
                print(f"    - Class ID {class_id[:8]}...: FAILED ({status_code}) - {error_detail}")
            
            time.sleep(REQUEST_DELAY_SECONDS) # Wait to avoid hitting rate limits

    print(f"\n---> Scheduling complete. Total sessions created: {sessions_created} / {total_sessions_to_create}")



def run_batch_creation():
    """Reads data from a JSONL file and sends POST requests for each line."""
    
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

def check_server_connection():
    """
    Check if the server is running and accessible.
    """
    try:
        response = requests.get(f"{BASE_URL}", headers=HEADERS, timeout=5)
        return response.status_code in [200, 401, 403]  # 401/403 means server is up but auth might be wrong
    except requests.exceptions.RequestException:
        return False

def main():
    """
    The main execution flow.
    """
    
    # 0. Check if server is running
    print("=== STEP 0: Checking Server Connection ===")
    if not check_server_connection():
        print("ERROR: Cannot connect to server. Make sure the backend is running on http://localhost:3000")
        return
    print("✓ Server is accessible")
    
    # 1. First, create classes from the JSONL file
    print("\n=== STEP 1: Creating Classes ===")
    run_batch_creation()
    
    # 2. Get all the IDs of the classes we want to schedule sessions for
    print("\n=== STEP 2: Getting Class IDs ===")
    class_ids = get_existing_class_ids()
    
    if not class_ids:
        print("\nProcess halted. No class IDs retrieved to schedule sessions.")
        return
        
    # 3. Next, use those IDs to schedule the sessions
    print("\n=== STEP 3: Scheduling Sessions ===")
    schedule_sessions(class_ids)

if __name__ == "__main__":
    main()