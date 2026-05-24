import random
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum

class ProjectStatus(Enum):
    PENDING = "Pending"
    SECURITY_CLEARED = "Security Cleared"
    EXISTENCE_VERIFIED = "Existence Verified"
    QUANTIFIED = "Quantified"
    CONTRACT_CHECKED = "Contract Checked"
    HUMAN_REVIEW = "Human Review"
    COMPLETED = "Completed"
    FAILED = "Failed"

@dataclass
class VerificationState:
    project_id: str
    data_sources: List[Dict[str, Any]]
    status: ProjectStatus = ProjectStatus.PENDING
    confidence_score: float = 0.0
    carbon_amount: float = 0.0
    security_level: str = "Public"
    is_double_claimed: bool = False
    audit_trail: List[str] = field(default_factory=list)
    human_approved: bool = False

    def log(self, message: str):
        self.audit_trail.append(message)
        print(f"[LOG] {message}")

# --- Agents ---

class SecurityAgent:
    def process(self, state: VerificationState):
        state.log("SecurityAgent: Checking digital signatures and integrity...")
        if any(src.get("corrupted") for src in state.data_sources):
            state.status = ProjectStatus.FAILED
            state.log("SecurityAgent: FAILED - Data corruption detected!")
            return False
        
        # --- NEW HITL CASE: Suspicious Activity ---
        if any(src.get("suspicious") for src in state.data_sources):
            state.log("SecurityAgent: ALERT - Suspicious metadata patterns detected (Possible spoofing).")
            state.status = ProjectStatus.HUMAN_REVIEW
            return None # Signal for HITL
        
        state.security_level = "Confidential"
        state.status = ProjectStatus.SECURITY_CLEARED
        state.log(f"SecurityAgent: Integrity verified. Security level set to {state.security_level}.")
        return True

class ExistenceVerifier:
    def process(self, state: VerificationState):
        state.log("ExistenceVerifier: Performing Cross-Modal Validation (Satellite + IoT)...")
        
        # --- NEW HITL CASE: Data Conflict (Anomaly) ---
        # Simulate conflict: Satellite says "Deforestation" but IoT says "Growth"
        if any(src.get("conflict") for src in state.data_sources):
            state.log("ExistenceVerifier: ALERT - Severe data conflict between Satellite and IoT sensors!")
            state.status = ProjectStatus.HUMAN_REVIEW
            return None # Signal for HITL

        source_types = set(src.get("type") for src in state.data_sources)
        if len(source_types) < 2:
            state.confidence_score = 0.4
            state.log("ExistenceVerifier: Low confidence - Only one data source type available.")
        else:
            state.confidence_score = 0.9
            state.log("ExistenceVerifier: High confidence - Multi-source consensus achieved.")
        
        state.status = ProjectStatus.EXISTENCE_VERIFIED
        return True

class CarbonQuantifier:
    def process(self, state: VerificationState):
        state.log("CarbonQuantifier: Calculating carbon credits based on IPCC methodology...")
        # Simulate calculation
        state.carbon_amount = random.uniform(100.0, 1000.0)
        state.log(f"CarbonQuantifier: Estimated amount: {state.carbon_amount:.2f} tonnes CO2e.")
        state.status = ProjectStatus.QUANTIFIED
        return True

class ContractGuard:
    def process(self, state: VerificationState):
        state.log("ContractGuard: Checking ownership and Double-Claiming prevention...")
        
        # Simulate double-claiming check
        if state.project_id == "PROJ-BAD-001": 
            state.is_double_claimed = True
            state.status = ProjectStatus.FAILED
            state.log("ContractGuard: FAILED - Double claiming detected! This credit was already retired.")
            return False
        
        state.status = ProjectStatus.CONTRACT_CHECKED
        state.log("ContractGuard: Ownership verified. No double-claiming detected.")
        return True

class LedgerAgent:
    def process(self, state: VerificationState):
        state.log("LedgerAgent: Anchoring Merkle Root to Immutable Ledger...")
        state.status = ProjectStatus.COMPLETED
        state.log(f"LedgerAgent: SUCCESS - Project {state.project_id} permanently recorded on Blockchain.")
        return True

class HumanSpecialist:
    def process(self, state: VerificationState):
        state.log("HumanSpecialist: Reviewing Low Confidence / High Value case...")
        # In a real system, this would wait for an API call or UI button
        decision = "APPROVE" if random.random() > 0.2 else "REJECT"
        
        if decision == "APPROVE":
            state.human_approved = True
            state.log("HumanSpecialist: Decision -> APPROVED.")
            return True
        else:
            state.status = ProjectStatus.FAILED
            state.log("HumanSpecialist: Decision -> REJECTED.")
            return False

# --- Orchestrator ---

class Orchestrator:
    def __init__(self):
        self.security = SecurityAgent()
        self.verifier = ExistenceVerifier()
        self.quantifier = CarbonQuantifier()
        self.guard = ContractGuard()
        self.ledger = LedgerAgent()
        self.human = HumanSpecialist()

    def run(self, project_id: str, sources: List[Dict]):
        print(f"\n--- Starting Workflow for Project: {project_id} ---")
        state = VerificationState(project_id=project_id, data_sources=sources)

        # 1. Security
        res = self.security.process(state)
        if res is None: # HITL Triggered
            state.log("Orchestrator: Security anomaly detected. Routing to Security Auditor...")
            if not self.human.process(state): return state
            state.log("Orchestrator: Security clearance granted by human.")
        elif not res: return state
        
        # 2. Existence
        res = self.verifier.process(state)
        if res is None: # HITL Triggered (Conflict)
            state.log("Orchestrator: Data conflict detected. Routing to Geospatial Specialist...")
            if not self.human.process(state): return state
            state.log("Orchestrator: Conflict resolved by human.")
        elif not res: return state
        
        # HITL CASE 1: Low Confidence Score
        if state.confidence_score < 0.7:
            state.log(f"Orchestrator: ALERT - Low Confidence ({state.confidence_score}). Routing to Human Specialist...")
            state.status = ProjectStatus.HUMAN_REVIEW
            if not self.human.process(state): 
                state.log("Orchestrator: Project rejected by human due to low confidence.")
                return state
            state.log("Orchestrator: Human override successful. Proceeding...")

        # 3. Quantification
        if not self.quantifier.process(state): return state
        
        # 4. Contract Guard
        if not self.guard.process(state): return state
        
        # HITL CASE 2: High Value Transaction
        HIGH_VALUE_THRESHOLD = 800.0
        if state.carbon_amount > HIGH_VALUE_THRESHOLD:
            state.log(f"Orchestrator: ALERT - High Value Detected ({state.carbon_amount:.2f} > {HIGH_VALUE_THRESHOLD}). Requiring Final Sign-off...")
            state.status = ProjectStatus.HUMAN_REVIEW
            if not self.human.process(state): 
                state.log("Orchestrator: High-value project rejected by Final Approver.")
                return state
            state.log("Orchestrator: Final sign-off received. Proceeding to Ledger...")

        # 5. Ledger
        if not self.ledger.process(state): return state
        
        return state

# --- Execution Demo ---

if __name__ == "__main__":
    orchestrator = Orchestrator()

    # Scenario 1: Happy Path (Multi-modal data, normal value)
    print("\n>>> SCENARIO 1: Happy Path")
    sources_1 = [
        {"type": "Satellite", "id": "SAT-01", "corrupted": False},
        {"type": "IoT", "id": "IOT-01", "corrupted": False}
    ]
    orchestrator.run("PROJ-GOOD-001", sources_1)

    # Scenario 2: Low Confidence (Only one source type) -> Human Review
    print("\n>>> SCENARIO 2: Low Confidence Path")
    sources_2 = [
        {"type": "IoT", "id": "IOT-02", "corrupted": False},
        {"type": "IoT", "id": "IOT-03", "corrupted": False}
    ]
    orchestrator.run("PROJ-UNCERTAIN-002", sources_2)

    # Scenario 3: Double Claiming Failure
    print("\n>>> SCENARIO 3: Double Claiming Detection")
    sources_3 = [
        {"type": "Satellite", "id": "SAT-02", "corrupted": False},
        {"type": "IoT", "id": "IOT-04", "corrupted": False}
    ]
    orchestrator.run("PROJ-BAD-001", sources_3)

    # Scenario 4: Security Breach (Corrupted data)
    print("\n>>> SCENARIO 4: Security Breach")
    sources_4 = [
        {"type": "Satellite", "id": "SAT-03", "corrupted": True},
    ]
    orchestrator.run("PROJ-BROKEN-004", sources_4)
