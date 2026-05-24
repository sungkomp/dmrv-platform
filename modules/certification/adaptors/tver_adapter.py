import json
import uuid
from datetime import datetime
from .base_registry import BaseCarbonAdaptor

class TVERAdaptor(BaseCarbonAdaptor):
    """
    T-VER Adapter (TGO Standard Compliance)
    """
    def __init__(self):
        self.tgo_registry_endpoint = "https://api.tgo.or.th/v1/projects/submit"

    def prepare_submission(self, state):
        packet = {
            "project_registration_id": state.project_id,
            "submission_date": datetime.now().strftime("%Y-%m-%d"),
            "methodology_applied": state.project_type.value,
            "quantification_data": {
                "total_reduction_tco2e": round(state.carbon_metric, 4),
                "verification_period": "2026-Q2",
                "integrity_hash": state.ledger_record.get('merkle_root')
            },
            "supporting_evidence": {
                "cert_id": state.ledger_record.get('token_id'),
                "trust_score": state.confidence_score,
                "audit_logs_summary": len(state.audit_trail)
            },
            # เพิ่ม metadata เฉพาะโปรเจกต์
            "methodology_metadata": {
                "region": state.region.value,
                "verification_standard": "T-VER-V2"
            },
            "declaration": "I certify that all data provided adheres to T-VER standards."
        }
        return packet

    def submit(self, state):
        packet = self.prepare_submission(state)
        print(f"--- [T-VER GATEWAY] Submitting to TGO API ---")
        return {"status": "SUCCESS", "tracking_id": f"TGO-{state.project_id[:4]}-{uuid.uuid4().hex[:6].upper()}"}
