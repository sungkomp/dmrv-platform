from datetime import datetime
from typing import List, Dict
from .constants import ProjectType, ThaiRegion

class VerificationState:
    """
    Centralized state manager for the dMRV workflow.
    Ensures data consistency as it passes through multiple agents.
    """
    def __init__(self, project_id: str, project_type: ProjectType, region: ThaiRegion, consent_granted: bool = False):
        self.project_id = project_id
        self.project_type = project_type
        self.region = region
        self.consent_granted = consent_granted
        
        # Pipeline Storage
        self.data = {
            "raw_data": [],
            "sanitized_data": [],
            "classified_data": [],
            "encrypted_data": []
        }
        
        # Performance & Results
        self.confidence_score = 0.0
        self.carbon_metric = 0.0
        self.social_impact_score = 0
        self.is_verified = False
        self.ledger_record = {}
        
        # Audit & Status
        self.status = "INITIATED"
        self.audit_trail = []
        self.metadata = {"start_time": datetime.now().isoformat()}

    def log(self, agent_name: str, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.audit_trail.append(f"[{timestamp}] {agent_name}: {message}")

    def update(self, key: str, value: any):
        """Helper to update results or state data"""
        if hasattr(self, key):
            setattr(self, key, value)
        else:
            self.data[key] = value
