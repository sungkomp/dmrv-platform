import sys
import os
from datetime import datetime, timedelta
sys.path.append(os.getcwd())

from dMRV.core.orchestrator import Orchestrator

def test_high_assurance_quantification():
    print("=== Testing High-Assurance Carbon Quantification ===")
    
    # Scenario 1: Stale Evidence (ข้อมูลเก่าเกิน 30 วัน)
    print("\n[Scenario 1] Stale Evidence (Should Reject)")
    orch1 = Orchestrator()
    stale_date = (datetime.now() - timedelta(days=40)).isoformat()
    orch1.state.data['sanitized_data'] = [
        {"type": "SATELLITE", "area": 100, "timestamp": stale_date, "signature": "VALID"}
    ]
    orch1.state.data['consent_granted'] = True
    orch1.run_workflow("Test Stale Data")
    
    # Scenario 2: Data Inconsistency (ข้อมูลขัดแย้งกัน)
    print("\n[Scenario 2] Data Inconsistency (Conflict Agri-Log vs IoT)")
    orch2 = Orchestrator()
    current_date = datetime.now().isoformat()
    orch2.state.data['sanitized_data'] = [
        {
            "type": "AGRI_ACTIVITY", 
            "timestamp": current_date, 
            "payload": {"action": "DRAINED"}, 
            "signature": "VALID"
        },
        {
            "type": "IOT", 
            "timestamp": current_date, 
            "biomass": 150, # High moisture/value despite being "drained"
            "signature": "VALID"
        }
    ]
    orch2.state.data['consent_granted'] = True
    orch2.run_workflow("Test Conflict Data")

    # Scenario 3: Valid & Fresh Data (LiDAR + Agri-Log)
    print("\n[Scenario 3] Valid & Fresh Evidence (Should Succeed)")
    orch3 = Orchestrator()
    orch3.state.data['sanitized_data'] = [
        {
            "type": "LIDAR", 
            "timestamp": current_date, 
            "payload": {"biomass_est": 250.5}, 
            "signature": "VALID"
        },
        {
            "type": "AGRI_ACTIVITY", 
            "timestamp": current_date, 
            "payload": {"action": "DRAINED"}, 
            "signature": "VALID"
        }
    ]
    orch3.state.data['consent_granted'] = True
    orch3.run_workflow("Test Valid Data")
    
    metric = orch3.state.data.get('carbon_metric')
    if metric:
        print(f"Result: SUCCESS - Quantified {metric} tCO2e using latest evidence.")
    else:
        print("Result: FAILED - Calculation did not complete.")

if __name__ == "__main__":
    test_high_assurance_quantification()
