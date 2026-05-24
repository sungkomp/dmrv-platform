import uuid
import hashlib
import json
import base64
import re
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Any, Optional

# =============================================================================
# 1. CORE ENUMS & SCHEMAS (Expanded for Thailand)
# =============================================================================

class DataSource(Enum):
    SATELLITE = "SATELLITE"
    IOT_SENSOR = "IOT_SENSOR"
    DRONE_LIDAR = "DRONE_LIDAR"
    MANUAL_SURVEY = "MANUAL_SURVEY"
    AGRI_LOG = "AGRI_LOG"

class DataTier(Enum):
    TIER_1 = "HIGH_PRECISION"  # Direct Measurement (IoT, LiDAR)
    TIER_2 = "REMOTE_SENSING"  # Satellite, Proxy
    TIER_3 = "ESTIMATED"       # Manual, Books

class PIILevel(Enum):
    PUBLIC = "PUBLIC"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"

class ProjectType(Enum):
    BLUE_CARBON = "BLUE_CARBON"        # Mangroves (South/East)
    SOIL_GHG = "SOIL_GHG"            # Sustainable Rice AWD (Central)
    BIOGAS = "BIOGAS"                # Livestock waste (Northeast/West)
    RENEWABLE = "RENEWABLE"          # Solar, Wind
    FORESTRY_TVER = "FORESTRY_TVER"    # Reforestation (North/West)
    WASTE_MANAGEMENT = "WASTE_MGMT"   # Municipal Waste (BKK)
    AGRI_LOW_CARBON = "AGRI_LOW_C"    # No-burn Sugar Cane / Rice
    BIOCHAR_PYROLYSIS = "BIOCHAR_PYRO" # Biochar production (North/Northeast)

class ThaiRegion(Enum):
    NORTH = "NORTH"
    NORTHEAST = "NORTHEAST"
    CENTRAL = "CENTRAL"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"

# =============================================================================
# 2. SYSTEM STATE MANAGEMENT
# =============================================================================

class VerificationState:
    """Centralized state for the Multi-Agent workflow pipeline."""
    def __init__(self, project_id: str, project_type: ProjectType, region: ThaiRegion, consent_granted: bool = False):
        self.project_id = project_id
        self.project_type = project_type
        self.region = region
        self.consent_granted = consent_granted
        
        # Data Pipeline
        self.raw_data: List[Dict] = []
        self.sanitized_data: List[Dict] = []
        self.classified_data: List[Dict] = []
        self.encrypted_data: List[Dict] = []
        
        # Results
        self.confidence_score = 0.0
        self.carbon_metric = 0.0
        self.social_impact_score = 0
        self.is_verified = False
        self.ledger_record = {}
        
        # Status & Logs
        self.status = "INITIATED"
        self.audit_trail = []
        self.start_time = datetime.now()

    def log(self, agent: str, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.audit_trail.append(f"[{timestamp}] {agent}: {message}")

    def add_raw_data(self, source: DataSource, payload: Dict, signature: str):
        self.raw_data.append({
            "id": str(uuid.uuid4())[:8],
            "source": source,
            "payload": payload,
            "signature": signature,
            "timestamp": datetime.now().isoformat()
        })

# =============================================================================
# 3. SPECIALIZED AGENTS
# =============================================================================

class SecurityAgent:
    """Agent 1: Validates Integrity and Digital Signatures."""
    def process(self, state: VerificationState) -> bool:
        state.log("Security", "Starting cryptographic validation...")
        for item in state.raw_data:
            if item['signature'].startswith("SIG_VALID"):
                state.sanitized_data.append(item)
            else:
                state.log("Security", f"WARNING: Dropping packet {item['id']} due to invalid signature.")
        
        if not state.sanitized_data:
            state.log("Security", "CRITICAL: No valid data packets remaining.")
            return False
        
        state.log("Security", f"Validation complete. {len(state.sanitized_data)} packets passed.")
        return True

class ClassificationAgent:
    """Agent 2: Detects PII and enforces PDPA compliance."""
    def __init__(self):
        self.pii_patterns = {
            "EMAIL": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "GPS": r"[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+",
            "WALLET": r"0x[a-fA-F0-9]{40}"
        }

    def process(self, state: VerificationState) -> bool:
        state.log("Classifier", "Scanning for sensitive PII data...")
        for item in state.sanitized_data:
            content = json.dumps(item['payload'])
            detected = [k for k, p in self.pii_patterns.items() if re.search(p, content)]
            
            if detected:
                if not state.consent_granted:
                    state.log("Classifier", f"PDPA FAILURE: PII {detected} found but no consent granted.")
                    return False
                item['classification'] = PIILevel.CONFIDENTIAL.value
                item['pii_types'] = detected
            else:
                item['classification'] = PIILevel.PUBLIC.value
            
            state.classified_data.append(item)
        
        state.log("Classifier", "Classification and PDPA check successful.")
        return True

class EncryptionAgent:
    """Agent 3: Implements Data Immutability (Hashing) and Privacy (Encryption)."""
    def process(self, state: VerificationState) -> bool:
        state.log("Encryption", "Ensuring data immutability and applying encryption...")
        for item in state.classified_data:
            raw_bytes = json.dumps(item['payload'], sort_keys=True).encode()
            item['integrity_hash'] = hashlib.sha256(raw_bytes).hexdigest()
            if item.get('classification') == PIILevel.CONFIDENTIAL.value:
                item['payload'] = {k: base64.b64encode(str(v).encode()).decode() for k, v in item['payload'].items()}
                item['is_encrypted'] = True
            state.encrypted_data.append(item)
        return True

class ExistenceVerifier:
    """Agent 4: Cross-modal Consensus logic."""
    def process(self, state: VerificationState) -> bool:
        state.log("Verifier", f"Performing consensus check for {state.project_type.value} in {state.region.value}...")
        sources = {d['source'] for d in state.encrypted_data}
        mapping = {1: 0.4, 2: 0.7, 3: 0.9, 4: 1.0, 5: 1.0}
        state.confidence_score = mapping.get(len(sources), 0.0)
        state.log("Verifier", f"Consensus reached. Score: {state.confidence_score}")
        return True

class CarbonQuantifier:
    """Agent 5: Methodology-specific Carbon Calculation (Thai Regional Optimized)."""
    def process(self, state: VerificationState) -> bool:
        state.log("Quantifier", f"Applying {state.project_type.value} methodology for {state.region.value} Thailand...")
        
        total_co2 = 0.0
        # Weights based on trust
        tier_weights = {DataSource.DRONE_LIDAR: 1.0, DataSource.IOT_SENSOR: 0.9, 
                        DataSource.SATELLITE: 0.8, DataSource.MANUAL_SURVEY: 0.4}

        for data in state.encrypted_data:
            p = data['payload']
            if data.get('is_encrypted'): continue 
            
            weight = tier_weights.get(data['source'], 0.5)
            
            # Thai-Specific Calculation Logic
            if state.project_type == ProjectType.BLUE_CARBON:
                # South/East Mangroves: Higher sequestration due to tropical climate
                regional_factor = 1.2 if state.region in [ThaiRegion.SOUTH, ThaiRegion.EAST] else 1.0
                total_co2 += p.get('area_ha', 0) * 10.5 * regional_factor * weight
                
            elif state.project_type == ProjectType.FORESTRY_TVER:
                # North/West Reforestation (T-VER Standard approximation)
                total_co2 += p.get('tree_count', 0) * 0.05 * weight 
                
            elif state.project_type == ProjectType.AGRI_LOW_CARBON:
                # Northeast (Isan) Sugar Cane (No-burn)
                if state.region == ThaiRegion.NORTHEAST:
                    total_co2 += p.get('production_ton', 0) * 0.15 * weight
                # Central/North Rice (AWD)
                else:
                    total_co2 += p.get('area_ha', 0) * 4.2 * weight

            elif state.project_type == ProjectType.BIOGAS:
                total_co2 += p.get('waste_ton', 0) * 2.1 * weight
            
            elif state.project_type == ProjectType.WASTE_MANAGEMENT:
                total_co2 += p.get('diverted_ton', 0) * 1.8 * weight
            
            elif state.project_type == ProjectType.BIOCHAR_PYROLYSIS:
                # Biochar: Carbon content * Stability (Permanence)
                stability_factor = 0.85 # Stability over 100 years
                total_co2 += p.get('biochar_ton', 0) * 2.8 * stability_factor * weight

        state.carbon_metric = total_co2 * state.confidence_score
        state.log("Quantifier", f"Quantification complete: {state.carbon_metric:.2f} tCO2e (Region: {state.region.value})")
        return True

class ContractGuard:
    """Agent 6: Prevents Double-Claiming."""
    def __init__(self):
        self.ledger_registry = ["PRJ-BLACK-LISTED", "PLOT-CONFLICT-001"]

    def process(self, state: VerificationState) -> bool:
        state.log("Guard", "Scanning global ledger for conflicting claims...")
        if state.project_id in self.ledger_registry:
            state.log("Guard", "CRITICAL: Double-claiming detected! Project ID already has issued credits.")
            return False
        state.is_verified = True
        state.log("Guard", "No conflicts found. Project is eligible for issuance.")
        return True

class LedgerAgent:
    """Agent 7: Mints tokens and records finality."""
    def process(self, state: VerificationState) -> bool:
        state.log("Ledger", "Minting dMRV Carbon Tokens...")
        token_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        state.ledger_record = {
            "token_id": token_id,
            "project_id": state.project_id,
            "region": state.region.value,
            "amount": round(state.carbon_metric, 4),
            "unit": "tCO2e",
            "issuer": "dMRV-Thailand-Hub",
            "timestamp": datetime.now().isoformat(),
            "merkle_root": hashlib.sha256(str(state.encrypted_data).encode()).hexdigest()
        }
        state.status = "COMPLETED"
        state.log("Ledger", f"SUCCESS: Token {token_id} issued.")
        return True

# =============================================================================
# 4. ORCHESTRATOR
# =============================================================================

class dMRVOrchestrator:
    def __init__(self):
        self.agents = [SecurityAgent(), ClassificationAgent(), EncryptionAgent(),
                       ExistenceVerifier(), CarbonQuantifier(), ContractGuard(), LedgerAgent()]

    def run(self, state: VerificationState, auto_approve_hitl: bool = False):
        print(f"\n>>> Project: {state.project_id} | Type: {state.project_type.value} | Region: {state.region.value}")
        for agent in self.agents:
            if not agent.process(state):
                state.status = "FAILED"
                return state
            if isinstance(agent, ExistenceVerifier) and state.confidence_score < 0.6:
                if not auto_approve_hitl: return state
                state.log("HITL", "Auto-approved low confidence data.")
        return state

# =============================================================================
# 5. COMPREHENSIVE THAILAND TEST SUITE
# =============================================================================

def run_thai_tests():
    orchestrator = dMRVOrchestrator()
    results = []

    # 1. South (Phang Nga) - Blue Carbon Mangrove
    s1 = VerificationState("TH-SOUTH-MNG-01", ProjectType.BLUE_CARBON, ThaiRegion.SOUTH, True)
    s1.add_raw_data(DataSource.SATELLITE, {"area_ha": 500}, "SIG_VALID_01")
    s1.add_raw_data(DataSource.DRONE_LIDAR, {"area_ha": 495}, "SIG_VALID_02")
    results.append(orchestrator.run(s1))

    # 2. North (Nan) - Reforestation (T-VER)
    s2 = VerificationState("TH-NORTH-FOR-02", ProjectType.FORESTRY_TVER, ThaiRegion.NORTH, True)
    s2.add_raw_data(DataSource.DRONE_LIDAR, {"tree_count": 150000}, "SIG_VALID_03")
    results.append(orchestrator.run(s2, auto_approve_hitl=True))

    # 3. Northeast (Isan - Khon Kaen) - No-Burn Sugar Cane
    s3 = VerificationState("TH-ISAN-SUG-03", ProjectType.AGRI_LOW_CARBON, ThaiRegion.NORTHEAST, True)
    s3.add_raw_data(DataSource.IOT_SENSOR, {"production_ton": 12000}, "SIG_VALID_04")
    s3.add_raw_data(DataSource.MANUAL_SURVEY, {"no_burn_status": "Verified"}, "SIG_VALID_05")
    results.append(orchestrator.run(s3))

    # 4. Central (Ayutthaya) - Sustainable Rice AWD
    s4 = VerificationState("TH-CENTRAL-RIC-04", ProjectType.AGRI_LOW_CARBON, ThaiRegion.CENTRAL, True)
    s4.add_raw_data(DataSource.IOT_SENSOR, {"area_ha": 300, "water_ok": True}, "SIG_VALID_06")
    s4.add_raw_data(DataSource.SATELLITE, {"area_ha": 300}, "SIG_VALID_07")
    results.append(orchestrator.run(s4))

    # 5. Bangkok (Nong Khaem) - Waste to Energy
    s5 = VerificationState("TH-BKK-WST-05", ProjectType.WASTE_MANAGEMENT, ThaiRegion.CENTRAL, True)
    s5.add_raw_data(DataSource.IOT_SENSOR, {"diverted_ton": 2500}, "SIG_VALID_08")
    results.append(orchestrator.run(s5, auto_approve_hitl=True))

    # 6. North (Chiang Mai) - Biochar Pyrolysis (Corn Cob Waste)
    s6 = VerificationState("TH-NORTH-BIO-06", ProjectType.BIOCHAR_PYROLYSIS, ThaiRegion.NORTH, True)
    s6.add_raw_data(DataSource.IOT_SENSOR, {"biochar_ton": 800, "temp_celsius": 550}, "SIG_VALID_09")
    s6.add_raw_data(DataSource.AGRI_LOG, {"feedstock": "Corn Cobs", "moisture": 15}, "SIG_VALID_10")
    results.append(orchestrator.run(s6))

    print("\n" + "="*80)
    print(f"{'PROJECT ID':<20} | {'REGION':<10} | {'STATUS':<10} | {'CARBON (tCO2e)':<15} | {'TOKEN'}")
    print("-" * 80)
    for r in results:
        token = r.ledger_record.get('token_id', 'N/A')
        print(f"{r.project_id:<20} | {r.region.value:<10} | {r.status:<10} | {r.carbon_metric:>15.2f} | {token}")

    # Generate professional report for the most successful one
    from modules.reporting.generator import AuditReportGenerator
    print("\n" + "="*80)
    print("DETAIL AUDIT REPORT (SAMPLE: SOUTH THAILAND BLUE CARBON)")
    report = AuditReportGenerator.generate_detailed_audit(results[0])
    print(report['text'])

if __name__ == "__main__":
    run_thai_tests()
