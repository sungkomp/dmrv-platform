import sys
import os
from datetime import datetime
sys.path.append(os.getcwd())

from dMRV.core.orchestrator import Orchestrator

def test_end_to_end_settlement():
    print("=== Testing End-to-End dMRV Settlement ===")
    
    # Scenario 1: Double Claiming Detection
    print("\n[Scenario 1] Double Claiming Attempt")
    orch1 = Orchestrator()
    orch1.state.data['project_id'] = "PLOT-999-OLD" # ID ที่มีในบัญชีดำ (Issued)
    orch1.state.data['sanitized_data'] = [
        {"type": "SATELLITE", "area": 100, "timestamp": datetime.now().isoformat(), "signature": "VALID"}
    ]
    orch1.state.data['consent_granted'] = True
    orch1.run_workflow("Test Double Claiming")

    # Scenario 2: Successful Settlement (End-to-End)
    print("\n[Scenario 2] Successful End-to-End Workflow")
    orch2 = Orchestrator()
    orch2.state.data['project_id'] = "PRJ-NEW-2026"
    orch2.state.data['consent_granted'] = True
    orch2.state.data['sanitized_data'] = [
        {
            "type": "LIDAR", 
            "timestamp": datetime.now().isoformat(), 
            "payload": {"biomass_est": 500.0}, 
            "signature": "VALID"
        },
        {
            "type": "AGRI_ACTIVITY", 
            "timestamp": datetime.now().isoformat(), 
            "payload": {"action": "DRAINED"}, 
            "signature": "VALID"
        }
    ]
    
    success = orch2.run_workflow("Full Settlement Task")
    
    if success:
        record = orch2.state.data.get('ledger_record', {})
        print("\n--- Final Ledger Record ---")
        for k, v in record.items():
            print(f"{k}: {v}")
        print("---------------------------")
        if record.get('status') == "Available" and record.get('tx_id'):
            print("Result: SUCCESS - Credit settled on Ledger.")
        else:
            print("Result: FAILED - Ledger entry incomplete.")
    else:
        print("Result: FAILED - Workflow interrupted before settlement.")

if __name__ == "__main__":
    test_end_to_end_settlement()
