import sys
import os
sys.path.append(os.getcwd())

from dMRV.core.orchestrator import Orchestrator

def test_pdpa_and_security():
    print("=== Testing PDPA & Security Automation ===")
    
    # Scenario 1: PII detected WITHOUT consent (Should Fail)
    print("\n[Scenario 1] PII detected WITHOUT consent")
    orch1 = Orchestrator()
    orch1.state.data['sanitized_data'] = [
        {"id": 1, "data": "Carbon capture at 13.7563, 100.5018", "owner": "test@example.com", "signature": "VALID"}
    ]
    orch1.state.data['consent_granted'] = False
    
    success = orch1.run_workflow("Test Scenario 1")
    if not success:
        print("Result: SUCCESS - Workflow correctly blocked due to PDPA violation.")
    else:
        print("Result: FAILED - Workflow proceeded despite PDPA violation!")
    
    # Scenario 2: PII detected WITH consent (Should Succeed & Encrypt)
    print("\n[Scenario 2] PII detected WITH consent")
    orch2 = Orchestrator()
    orch2.state.data['sanitized_data'] = [
        {"id": 2, "data": "Forestry data for plot 101", "location": "13.7563, 100.5018", "signature": "VALID"}
    ]
    orch2.state.data['consent_granted'] = True
    
    orch2.run_workflow("Test Scenario 2")
    
    encrypted_items = orch2.state.data.get('encrypted_data', [])
    if encrypted_items:
        item = encrypted_items[0]
        print(f"Classification: {item.get('classification')}")
        print(f"Detected PII: {item.get('detected_pii')}")
        print(f"Encrypted Location: {item.get('location')}")
        print(f"Integrity Hash: {item.get('integrity_hash')}")
        
        if item.get('is_encrypted') and 'integrity_hash' in item:
            print("Result: SUCCESS - Data encrypted and integrity hash created.")
        else:
            print("Result: FAILED - Missing encryption or hash.")
    
    # Scenario 3: Public data (Should remain Public and Unencrypted)
    print("\n[Scenario 3] Public data")
    orch3 = Orchestrator()
    orch3.state.data['sanitized_data'] = [
        {"id": 3, "data": "Temperature: 28C", "signature": "VALID"}
    ]
    orch3.state.data['consent_granted'] = False # Consent not needed for public data
    
    orch3.run_workflow("Test Scenario 3")
    
    public_items = orch3.state.data.get('encrypted_data', [])
    if public_items:
        item = public_items[0]
        print(f"Classification: {item.get('classification')}")
        print(f"Data: {item.get('data')}")
        print(f"Integrity Hash: {item.get('integrity_hash')}")
        
        if item.get('classification') == 'PUBLIC' and not item.get('is_encrypted'):
             print("Result: SUCCESS - Public data remains unencrypted.")
        else:
             print("Result: FAILED - Public data was incorrectly processed.")

if __name__ == "__main__":
    test_pdpa_and_security()
