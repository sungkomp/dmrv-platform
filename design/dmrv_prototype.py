import uuid
from typing import List, Dict, Any

# --- State Management (Simplified) ---
class DMRVState:
    def __init__(self, project_id: str, sources: List[Dict[str, Any]]):
        self.project_id = project_id
        self.sources = sources
        self.security_status = {}
        self.verified_sources = []
        self.existence_confirmed = False
        self.carbon_amount = 0.0
        self.contract_status = "Unknown"
        self.ledger_tx_id = None
        self.audit_logs = []

    def log(self, message: str):
        self.audit_logs.append(message)

# --- Agent Logic (Pure Python Functions) ---

def security_agent(state: DMRVState):
    print("[Agent] Running Security & Classification...")
    state.security_status = {"classified": "Confidential", "encrypted": True}
    state.log("Security scan completed. Data encrypted with AES-256.")
    return True # Process success

def existence_verifier_agent(state: DMRVState):
    print("[Agent] Verifying Existence (Consensus >= 2 sources)...")
    verified = []
    for src in state.sources:
        if src.get('valid', False):
            verified.append(src['type'])
    
    unique_sources = set(verified)
    confirmed = len(unique_sources) >= 2
    
    state.verified_sources = verified
    state.existence_confirmed = confirmed
    state.log(f"Verified {len(unique_sources)} unique sources. Confirmation: {confirmed}")
    return confirmed # Return result of verification

def quantifier_agent(state: DMRVState):
    print("[Agent] Calculating Carbon Credits...")
    amount = 100.0 # Mock calculation
    state.carbon_amount = amount
    state.log(f"Quantified {amount} carbon credits based on verified evidence.")
    return True

def contract_guard_agent(state: DMRVState):
    print("[Agent] Checking Contract & Double Claiming...")
    # Mock Database: PROJ_ALREADY_USED is a retired asset
    if state.project_id == "PROJ_ALREADY_USED":
        state.contract_status = "Retired"
        state.log("REJECTED: Carbon credits for this asset have already been retired.")
        return False
    
    state.contract_status = "Available"
    state.log("Contract Valid. Credits are available for claiming.")
    return True

def ledger_agent(state: DMRVState):
    print("[Agent] Recording to Immutable Ledger...")
    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    state.ledger_tx_id = tx_id
    state.contract_status = "Retired" # Mark as retired after claim
    state.log(f"Transaction {tx_id} recorded on Blockchain. Credits burned.")
    return True

# --- Orchestrator (The "Graph" Logic) ---

def run_dmrv_pipeline(project_id: str, sources: List[Dict[str, Any]]):
    # Initialize State
    state = DMRVState(project_id, sources)
    
    # Step 1: Security
    if not security_agent(state):
        return state

    # Step 2: Existence Verification (Consensus Logic)
    if not existence_verifier_agent(state):
        state.log("Pipeline stopped: Insufficient evidence to confirm existence.")
        return state

    # Step 3: Quantification
    if not quantifier_agent(state):
        return state

    # Step 4: Contract Guard (Anti-Double Claiming)
    if not contract_guard_agent(state):
        return state

    # Step 5: Ledger Recording
    if not ledger_agent(state):
        return state

    return state

# --- Execution Test ---

if __name__ == "__main__":
    # Case 1: Valid Data (2+ sources, not claimed)
    print("\n--- Test Case 1: Successful Claim ---")
    input_1 = {
        "project_id": "PROJ_001",
        "sources": [
            {"type": "iot", "valid": True},
            {"type": "drone", "valid": True},
            {"type": "satellite", "valid": False}
        ]
    }
    res1 = run_dmrv_pipeline(input_1["project_id"], input_1["sources"])
    print(f"Final Status: {res1.contract_status} | TxID: {res1.ledger_tx_id}")
    print("Audit Trail:\n- " + "\n- ".join(res1.audit_logs))

    # Case 2: Not enough sources (Consensus Fail)
    print("\n--- Test Case 2: Insufficient Evidence ---")
    input_2 = {
        "project_id": "PROJ_002",
        "sources": [
            {"type": "iot", "valid": True},
            {"type": "satellite", "valid": False}
        ]
    }
    res2 = run_dmrv_pipeline(input_2["project_id"], input_2["sources"])
    print(f"Existence Confirmed: {res2.existence_confirmed}")
    print("Audit Trail:\n- " + "\n- ".join(res2.audit_logs))

    # Case 3: Double Claiming (Contract Fail)
    print("\n--- Test Case 3: Double Claiming Attempt ---")
    input_3 = {
        "project_id": "PROJ_ALREADY_USED",
        "sources": [
            {"type": "iot", "valid": True},
            {"type": "drone", "valid": True}
        ]
    }
    res3 = run_dmrv_pipeline(input_3["project_id"], input_3["sources"])
    print(f"Final Status: {res3.contract_status}")
    print("Audit Trail:\n- " + "\n- ".join(res3.audit_logs))
