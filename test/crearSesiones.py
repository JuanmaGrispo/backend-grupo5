import requests
import json
import time

# --- Configuration ---
GET_CLASSES_ENDPOINT = "http://localhost:3000/api/v1/classes"
BASE_URL = "http://localhost:3000/api/v1/classes"
SESSIONS_DATA_FILE = "test/sessions_to_schedule.jsonl"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YjY1M2JmYi00YmU4LTQ3YjUtODIyNC0yNzNhNzAyNmE1YWEiLCJlbWFpbCI6Im1hdGljYWxsZXNAZ21haWwuY29tIiwiaWF0IjoxNzYzMDY0NDUzLCJleHAiOjE3NjM2NjkyNTN9.1Nja-Y18XBTA5y7arYZqozzFXAABlSs-dDjyKSuZZgU"
    # "Authorization": "Bearer YOUR_AUTH_TOKEN"
}
REQUEST_DELAY_SECONDS = 0.5  # Add a delay to avoid overwhelming the server
# ---------------------

def check_server_connection():
    """
    Check if the server is running and accessible.
    """
    try:
        response = requests.get(GET_CLASSES_ENDPOINT, headers=HEADERS, timeout=5)
        return response.status_code in [200, 401, 403]  # 401/403 means server is up but auth might be wrong
    except requests.exceptions.RequestException:
        return False

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
    Reads session data from sessions_to_schedule.jsonl file.
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
    sessions_failed = 0
    
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
                sessions_failed += 1
            
            time.sleep(REQUEST_DELAY_SECONDS) # Wait to avoid hitting rate limits

    print(f"\n---> Scheduling complete. Total sessions created: {sessions_created} / {total_sessions_to_create}")
    print(f"    - Successful: {sessions_created}")
    print(f"    - Failed: {sessions_failed}")

def main():
    """
    The main execution flow for creating sessions.
    """
    print("=== SESSION CREATION SCRIPT ===")
    
    # 0. Check if server is running
    print("\n=== STEP 0: Checking Server Connection ===")
    if not check_server_connection():
        print("ERROR: Cannot connect to server. Make sure the backend is running on http://localhost:3000")
        return
    print("✓ Server is accessible")
    
    # 1. Get all the IDs of the classes we want to schedule sessions for
    print("\n=== STEP 1: Getting Class IDs ===")
    class_ids = get_existing_class_ids()
    
    if not class_ids:
        print("\nProcess halted. No class IDs retrieved to schedule sessions.")
        print("Make sure you have created classes first using crearClases.py")
        return
        
    # 2. Schedule sessions for each class
    print("\n=== STEP 2: Scheduling Sessions ===")
    schedule_sessions(class_ids)
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
