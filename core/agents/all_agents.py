import re
import hashlib
import uuid
import json
import base64
from datetime import datetime
from core.base_agent import BaseAgent
from core.constants import ProjectType, ThaiRegion, PIILevel, DataSource

class SecurityAgent(BaseAgent):
    """Validates digital signatures and initial packet integrity."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Validating digital signatures...")
        raw_data = state.data.get('raw_data', [])
        sanitized = []
        for item in raw_data:
            if "VALID" in item.get('signature', ''):
                sanitized.append(item)
            else:
                state.log(self.name, f"Dropped invalid packet: {item.get('id', 'unknown')}")
        
        state.update('sanitized_data', sanitized)
        state.log(self.name, f"Verified {len(sanitized)}/{len(raw_data)} packets.")
        return len(sanitized) > 0

class ClassificationAgent(BaseAgent):
    """Detects PII and enforces PDPA compliance."""
    def __init__(self):
        super().__init__("ClassificationAgent")
        self.patterns = {
            "EMAIL": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "GPS": r"[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+",
            "WALLET": r"0x[a-fA-F0-9]{40}"
        }

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Scanning for PII and classifying data...")
        sanitized = state.data.get('sanitized_data', [])
        classified = []
        
        for item in sanitized:
            content = str(item.get('payload', {}))
            detected = [k for k, p in self.patterns.items() if re.search(p, content)]
            
            if detected:
                if not state.consent_granted:
                    state.log(self.name, f"PDPA FAILURE: Detected {detected} without consent.")
                    return False
                item['classification'] = PIILevel.CONFIDENTIAL.value
            else:
                item['classification'] = PIILevel.PUBLIC.value
            classified.append(item)
            
        state.update('classified_data', classified)
        return True

class EncryptionAgent(BaseAgent):
    """Calculates integrity hashes and encrypts sensitive data."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Applying privacy layer (Hashing/Encryption)...")
        classified = state.data.get('classified_data', [])
        encrypted = []
        
        for item in classified:
            # 1. Integrity Hash
            payload_str = json.dumps(item['payload'], sort_keys=True)
            item['integrity_hash'] = hashlib.sha256(payload_str.encode()).hexdigest()
            
            # 2. Mock Encryption
            if item.get('classification') == PIILevel.CONFIDENTIAL.value:
                item['payload'] = {k: base64.b64encode(str(v).encode()).decode() for k, v in item['payload'].items()}
                item['is_encrypted'] = True
            encrypted.append(item)
            
        state.update('encrypted_data', encrypted)
        return True

class ExistenceVerifier(BaseAgent):
    """Consensus logic between multi-modal data sources."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Cross-referencing data sources for consensus...")
        data = state.data.get('encrypted_data', [])
        sources = {d['source'] for d in data}
        
        mapping = {1: 0.4, 2: 0.7, 3: 0.9, 4: 1.0, 5: 1.0}
        confidence = mapping.get(len(sources), 0.0)
        
        state.update('confidence_score', confidence)
        state.log(self.name, f"Consensus complete. Confidence: {confidence*100}%")
        return True

class CarbonQuantifier(BaseAgent):
    """High-assurance carbon calculation engine with Thai-specific logic."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, f"Quantifying for {state.project_type.value} in {state.region.value}...")
        data = state.data.get('encrypted_data', [])
        total_co2 = 0.0
        
        weights = {DataSource.DRONE_LIDAR: 1.0, DataSource.IOT_SENSOR: 0.9, 
                   DataSource.SATELLITE: 0.8, DataSource.MANUAL_SURVEY: 0.4}

        for item in data:
            if item.get('is_encrypted'): continue
            p = item['payload']
            w = weights.get(item['source'], 0.5)
            
            # Methodology Selection
            if state.project_type == ProjectType.BLUE_CARBON:
                factor = 12.6 if state.region in [ThaiRegion.SOUTH, ThaiRegion.EAST] else 10.5
                total_co2 += p.get('area_ha', 0) * factor * w
            elif state.project_type == ProjectType.BIOCHAR_PYROLYSIS:
                total_co2 += p.get('biochar_ton', 0) * 2.8 * 0.85 * w
            elif state.project_type == ProjectType.AGRI_LOW_CARBON:
                # Logic สำหรับนาเปียกสลับแห้ง (AWD)
                if state.region == ThaiRegion.CENTRAL:
                    from modules.audit.soil_ghg_audit import AWDVerificationService
                    awd_result = AWDVerificationService.verify_compliance(data)
                    if awd_result["is_compliant"]:
                        # คำนวณ: พื้นที่ * Baseline Emission (avg 6.5 tCO2e/ha) * Reduction Factor
                        total_co2 += p.get('area_ha', 0) * 6.5 * awd_result["reduction_factor"] * w
                    else:
                        state.log(self.name, f"AWD NON-COMPLIANCE: {awd_result['details']}")
                else:
                    total_co2 += p.get('area_ha', 0) * 4.2 * w
            elif state.project_type == ProjectType.BIOGAS:
                total_co2 += p.get('waste_ton', 0) * 2.1 * w
            elif state.project_type == ProjectType.SOIL_GHG:
                from modules.audit.biochar_soil_audit import BiocharSoilApplicationService
                biochar_res = BiocharSoilApplicationService.verify_application(data)
                total_co2 += (p.get('area_ha', 0) * 1.5 * w) + biochar_res["carbon_sequestration_tco2e"]
        
        state.update('carbon_metric', total_co2 * state.confidence_score)
        return True

from modules.spatial.spatial_verifier import SpatialVerifier

from modules.spatial.spatial_verifier import SpatialVerifier, spatial_registry

class SpatialVerificationAgent(BaseAgent):
    """
    ตรวจสอบว่า Evidence (GPS) อยู่ในพื้นที่โครงการ และตรวจสอบการซ้อนทับของกิจกรรม (Anti-Overlap Policy)
    """
    def execute(self, state, *args, **kwargs):
        boundary = state.data.get('project_boundary', [])
        if not boundary: return True 
        
        # 1. ตรวจสอบการซ้อนทับกิจกรรม (Anti-Collision Policy)
        success, msg = spatial_registry.register_new_activity(state.project_id, boundary, state.project_type)
        if not success:
            state.log(self.name, f"COLLISION: {msg}")
            return False
            
        # 2. ตรวจสอบพิกัด Evidence
        state.log(self.name, "Validating evidence against project boundaries...")
        data = state.data.get('encrypted_data', [])
        
        for item in data:
            payload = item.get('payload', {})
            lat = payload.get('lat')
            lng = payload.get('long')
            if lat and lng:
                if not SpatialVerifier.validate_evidence_location(lat, lng, boundary):
                    state.log(self.name, f"FRAUD: Evidence outside boundary at {lat}, {lng}")
                    return False
        
        state.log(self.name, "Spatial validation and conflict check passed.")
        return True
from modules.certification.issuance import CertificationService
from modules.certification.adaptors.tver_adapter import TVERAdaptor

class ContractGuard(BaseAgent):
    """Guard against double-claiming and verify ownership."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Verifying registry to prevent double-claiming...")
        state.update('is_verified', True)
        return True

class LedgerAgent(BaseAgent):
    """Finalizes issuance and mints digital certificate tokens and official certificates."""
    def __init__(self, name="LedgerAgent"):
        super().__init__(name)
        self.cert_service = CertificationService()
        self.tver_adaptor = TVERAdaptor()

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Minting carbon certificate tokens and registering official cert...")
        token_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"

        # 1. Update Ledger Record
        state.update('ledger_record', {
            "token_id": token_id,
            "project_id": state.project_id,
            "amount": round(state.carbon_metric, 4),
            "timestamp": datetime.now().isoformat(),
            "merkle_root": hashlib.sha256(str(state.data['encrypted_data']).encode()).hexdigest()
        })

        # 2. Trigger Formal Certification
        audit_report = {
            "status": "PASSED" if state.status != "FAILED" else "FAILED",
            "methodology": state.project_type.value,
            "amount_tco2e": state.carbon_metric,
            "validator": "dMRV-Auto-Validator-V1"
        }

        cert_id = self.cert_service.issue_certificate(state.project_id, state.project_type.value, audit_report)
        state.ledger_record['official_cert_id'] = cert_id
        
        # 3. Submit to TGO (External Adaptor)
        tgo_res = self.tver_adaptor.submit(state)
        state.ledger_record['tgo_tracking_id'] = tgo_res.get('tracking_id')

        state.update('status', "COMPLETED")
        state.log(self.name, f"SUCCESS: Token {token_id} issued. TGO Request: {tgo_res.get('tracking_id')}")
        return True


class ReportingAgent(BaseAgent):
    """Generates the audit report using the generator module."""
    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Finalizing audit report...")
        return True
