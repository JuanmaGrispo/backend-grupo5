import requests
import json
import time
import random

# --- Configuration ---
SESSIONS_ENDPOINT = "http://localhost:3000/api/v1/classes/sessions"
RESERVATIONS_ENDPOINT = "http://localhost:3000/api/v1/reservations"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YjY1M2JmYi00YmU4LTQ3YjUtODIyNC0yNzNhNzAyNmE1YWEiLCJlbWFpbCI6Im1hdGljYWxsZXNAZ21haWwuY29tIiwiaWF0IjoxNzYzMDY0NDUzLCJleHAiOjE3NjM2NjkyNTN9.1Nja-Y18XBTA5y7arYZqozzFXAABlSs-dDjyKSuZZgU"
    # "Authorization": "Bearer YOUR_AUTH_TOKEN"
}
REQUEST_DELAY_SECONDS = 0.3  # Add a delay to avoid overwhelming the server
# ---------------------

def check_server_connection():
    """
    Check if the server is running and accessible.
    """
    try:
        response = requests.get(SESSIONS_ENDPOINT, headers=HEADERS, timeout=5)
        return response.status_code in [200, 401, 403]  # 401/403 means server is up but auth might be wrong
    except requests.exceptions.RequestException:
        return False

def get_all_sessions():
    """
    Retrieves all sessions from the API and returns a list of session IDs.
    """
    print(f"\n---> 1. Retrieving all sessions from: {SESSIONS_ENDPOINT}")
    try:
        # Get all sessions (using a large pageSize to get all at once)
        response = requests.get(SESSIONS_ENDPOINT, headers=HEADERS, params={'pageSize': 1000})
        response.raise_for_status()
        
        data = response.json()
        sessions = data.get('items', [])
        session_ids = [session['id'] for session in sessions]
        
        print(f"    - Success! Retrieved {len(session_ids)} sessions.")
        print(f"    - Total sessions available: {data.get('total', len(session_ids))}")
        
        # Display session details
        print(f"\n    Session Details:")
        for i, session in enumerate(sessions[:5]):  # Show first 5 sessions
            class_title = session.get('classRef', {}).get('title', 'Unknown Class')
            start_at = session.get('startAt', 'Unknown Time')
            status = session.get('status', 'Unknown Status')
            capacity = session.get('capacity', 0)
            reserved = session.get('reservedCount', 0)
            print(f"      {i+1}. {session['id'][:8]}... - {class_title} at {start_at} ({status}) - {reserved}/{capacity}")
        
        if len(sessions) > 5:
            print(f"      ... and {len(sessions) - 5} more sessions")
            
        return session_ids
        
    except requests.exceptions.RequestException as e:
        print(f"    - ERROR: Failed to retrieve sessions. {e}")
        return []

def select_random_sessions(session_ids, percentage=50):
    """
    Selects a random percentage of session IDs from the list.
    """
    if not session_ids:
        return []
    
    # Calculate how many sessions to select
    total_sessions = len(session_ids)
    sessions_to_select = max(1, int(total_sessions * percentage / 100))
    
    # Randomly select sessions
    selected_sessions = random.sample(session_ids, min(sessions_to_select, total_sessions))
    
    print(f"\n---> 2. Selected {len(selected_sessions)} sessions ({percentage}% of {total_sessions} total)")
    return selected_sessions

def create_reservations(session_ids):
    """
    Creates reservations for the provided session IDs.
    """
    if not session_ids:
        print("\nNo sessions to create reservations for.")
        return
    
    print(f"\n---> 3. Creating reservations for {len(session_ids)} sessions...")
    
    success_count = 0
    failure_count = 0
    
    for i, session_id in enumerate(session_ids, 1):
        # Prepare the reservation payload
        payload = {
            "sessionId": session_id
        }
        
        try:
            response = requests.post(RESERVATIONS_ENDPOINT, headers=HEADERS, json=payload)
            
            if response.status_code in [200, 201]:
                print(f"    {i:2d}. Session {session_id[:8]}...: SUCCESS - Reservation created")
                success_count += 1
            else:
                error_detail = response.text if response.status_code >= 400 else "Unknown error"
                print(f"    {i:2d}. Session {session_id[:8]}...: FAILED ({response.status_code}) - {error_detail}")
                failure_count += 1
                
        except requests.exceptions.RequestException as e:
            print(f"    {i:2d}. Session {session_id[:8]}...: NETWORK ERROR - {e}")
            failure_count += 1
        
        # Add delay to avoid overwhelming the server
        time.sleep(REQUEST_DELAY_SECONDS)
    
    print(f"\n---> Reservation creation complete!")
    print(f"    - Successful reservations: {success_count}")
    print(f"    - Failed reservations: {failure_count}")
    print(f"    - Success rate: {(success_count/(success_count+failure_count)*100):.1f}%" if (success_count+failure_count) > 0 else "    - Success rate: 0%")

def main():
    """
    The main execution flow.
    """
    print("=== RESERVATION CREATOR SCRIPT ===")
    
    # 0. Check if server is running
    print("\n=== STEP 0: Checking Server Connection ===")
    if not check_server_connection():
        print("ERROR: Cannot connect to server. Make sure the backend is running on http://localhost:3000")
        return
    print("✓ Server is accessible")
    
    # 1. Get all sessions
    print("\n=== STEP 1: Getting All Sessions ===")
    all_session_ids = get_all_sessions()
    
    if not all_session_ids:
        print("\nProcess halted. No sessions found to create reservations for.")
        return
    
    # 2. Select 50% of sessions randomly
    print("\n=== STEP 2: Selecting Random Sessions ===")
    selected_session_ids = select_random_sessions(all_session_ids, percentage=50)
    
    if not selected_session_ids:
        print("\nProcess halted. No sessions selected for reservations.")
        return
    
    # 3. Create reservations
    print("\n=== STEP 3: Creating Reservations ===")
    create_reservations(selected_session_ids)
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
