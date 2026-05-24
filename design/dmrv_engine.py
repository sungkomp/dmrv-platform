import uuid
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional

# =============================================================================
# 1. DATA SCHEMAS (ฟอร์มเตรียมข้อมูล)
# =============================================================================

class DataSource(Enum):
    SATELLITE = "SATELLITE"
    IOT_SENSOR = "IOT_SENSOR"
    DRONE_LIDAR = "DRONE_LIDAR"
    MANUAL_SURVEY = "MANUAL_SURVEY"

class DataTier(Enum):
    TIER_1 = "HIGH_TRUST"    # Direct Measurement / High Precision
    TIER_2 = "MEDIUM_TRUST"  # Remote Sensing / Proxy Data
    TIER_3 = "LOW_TRUST"     # Self-Reported / Estimated


class ProjectInput:
    """ฟอร์มสำหรับเตรียมข้อมูลก่อนนำเข้าสู่ระบบ dMRV"""
    def __init__(self, project_id: str, project_name: str, location: str):
        self.project_id = project_id
        self.project_name = project_name
        self.location = location
        self.datasets = []

    def add_dataset(self, source: DataSource, payload: Dict[str, Any], signature: str):
        self.datasets.append({
            "source": source,
            "payload": payload,
            "signature": signature,
            "timestamp": datetime.now().isoformat()
        })

# =============================================================================
# 2. SYSTEM STATE (การไหลของข้อมูล)
# =============================================================================

class VerificationState:
    """Object ที่ใช้ส่งต่อข้อมูลระหว่าง Agent (Data Pipeline State)"""
    def __init__(self, input_form: ProjectInput):
        # จาก Input Form
        self.project_id = input_form.project_id
        self.project_name = input_form.project_name
        self.raw_data = input_form.datasets
        
        # พื้นที่สำหรับ Agent ต่างๆ เขียนข้อมูลลงไป (Output of Agents)
        self.sanitized_data = []      # ผลลัพธ์จาก SecurityAgent
        self.confidence_score = 0.0   # ผลลัพธ์จาก ExistenceVerifier
        self.carbon_metric = 0.0      # ผลลัพธ์จาก CarbonQuantifier
        self.is_verified = False       # ผลลัพธ์จาก ContractGuard
        self.token_id = None          # ผลลัพธ์จาก LedgerAgent
        
        self.status = "PENDING"
        self.audit_trail = []

    def log(self, agent_name: str, action: str):
        self.audit_trail.append(f"[{datetime.now().strftime('%H:%M:%S')}] {agent_name} -> {action}")

# =============================================================================
# 3. AGENTS (Logic การประมวลผลข้อมูล)
# =============================================================================

class SecurityAgent:
    """Agent 1: ตรวจสอบความถูกต้องของ Signature และความสะอาดของข้อมูล"""
    def process(self, state: VerificationState):
        state.log("SecurityAgent", "Validating digital signatures...")
        for item in state.raw_data:
            if "VALID" in item['signature']: # จำลองการเช็ค Signature
                state.sanitized_data.append(item)
        
        success = len(state.sanitized_data) > 0
        state.log("SecurityAgent", f"Verified {len(state.sanitized_data)}/{len(state.raw_data)} packets")
        return success

class ClassificationAgent:
    """Agent New: จัดประเภทข้อมูลตามความน่าเชื่อถือ (Data Classification)"""
    def process(self, state: VerificationState):
        state.log("ClassificationAgent", "Classifying incoming data tiers...")
        
        # Mapping แหล่งข้อมูลไปยังระดับความเชื่อถือ (Tiers)
        tier_mapping = {
            DataSource.DRONE_LIDAR: DataTier.TIER_1,
            DataSource.IOT_SENSOR: DataTier.TIER_1,
            DataSource.SATELLITE: DataTier.TIER_2,
            DataSource.MANUAL_SURVEY: DataTier.TIER_3
        }
        
        classified_data = []
        for item in state.sanitized_data:
            source = item['source']
            tier = tier_mapping.get(source, DataTier.TIER_3)
            
            # เพิ่ม Tag classification ลงในข้อมูล
            classified_item = item.copy()
            classified_item['tier'] = tier
            classified_data.append(classified_item)
            
        state.sanitized_data = classified_data
        state.log("ClassificationAgent", f"Classified {len(classified_data)} data points into Tiers")
        return True


class SocialImpactAgent:
    """Agent: ตรวจสอบผลกระทบทางสังคม (อัปเกรด: เพิ่มปัจจัยการศึกษาและโครงสร้างพื้นฐาน)"""
    def process(self, state: VerificationState):
        state.log("SocialImpactAgent", "Calculating community benefits...")
        
        impact_score = 0
        for item in state.raw_data:
            payload = item.get('payload', {})
            # จ้างงานท้องถิ่น (คะแนนต่อหัว)
            impact_score += payload.get('local_hiring', 0) * 10
            # อบรมทักษะ/การศึกษา (คะแนนต่อชั่วโมง)
            impact_score += payload.get('education_hours', 0) * 5
            # พัฒนาโครงสร้างพื้นฐาน (คะแนนต่อโปรเจกต์)
            impact_score += payload.get('infra_projects', 0) * 50
        
        state.audit_trail.append(f"[Social] Comprehensive Impact Score: {impact_score}")
        return True

class ReportingAgent:
    """Agent: สรุปผลลัพธ์ทั้งหมดเป็นรายงานสำหรับ Auditor"""
    def process(self, state: VerificationState):
        state.log("ReportingAgent", "Generating audit report...")
        report = {
            "project_id": state.project_id,
            "project_name": state.project_name,
            "carbon_tCO2e": round(state.carbon_metric, 2),
            "status": state.status,
            "audit_trail": state.audit_trail[-5:] # สรุป 5 กิจกรรมล่าสุด
        }
        import json
        state.log("ReportingAgent", f"Report generated: {json.dumps(report)}")
        return True

class ExistenceVerifier:
    """Agent 2: วิเคราะห์ความสอดคล้องของข้อมูลจากหลายแหล่ง (Cross-modal)"""
    def process(self, state: VerificationState):
        state.log("ExistenceVerifier", "Cross-referencing data sources...")
        sources = {d['source'] for d in state.sanitized_data}
        
        # Logic การคำนวณ Confidence ตามจำนวนแหล่งข้อมูล
        mapping = {1: 0.4, 2: 0.7, 3: 0.9, 4: 1.0}
        state.confidence_score = mapping.get(len(sources), 0.0)
        
        state.log("ExistenceVerifier", f"Consensus reached. Confidence: {state.confidence_score}")
        return state.confidence_score >= 0.5

class CarbonQuantifier:
    """Agent 3: แปลงข้อมูลดิบเป็นตัวเลขคาร์บอนเครดิต (ปรับปรุงด้วย Tier Weights)"""
    def process(self, state: VerificationState):
        state.log("CarbonQuantifier", "Calculating biomass with Tier weights...")
        
        # Weighting Factor ตามความน่าเชื่อถือของข้อมูล
        tier_weights = {
            DataTier.TIER_1: 1.0,  # High Trust: ใช้ค่าจริงได้เลย
            DataTier.TIER_2: 0.7,  # Medium Trust: ลดทอนค่าเผื่อความคลาดเคลื่อน
            DataTier.TIER_3: 0.3,  # Low Trust: ให้น้ำหนักน้อยมาก
        }
        
        total_weighted_carbon = 0
        for d in state.sanitized_data:
            p = d['payload']
            tier = d.get('tier', DataTier.TIER_3)
            weight = tier_weights.get(tier, 0.1)
            
            value = 0
            if d['source'] == DataSource.SATELLITE: value = p.get('area', 0) * 2.5
            if d['source'] == DataSource.IOT_SENSOR: value = p.get('biomass', 0)
            if d['source'] == DataSource.DRONE_LIDAR: value = p.get('tree_count', 0) * 0.8
            
            total_weighted_carbon += (value * weight)
        
        state.carbon_metric = total_weighted_carbon * state.confidence_score
        state.log("CarbonQuantifier", f"Calculated Weighted Amount: {state.carbon_metric:.2f} tCO2e")
        return True


class ContractGuard:
    """Agent 4: ตรวจสอบเงื่อนไขสัญญาและป้องกัน Double Spending"""
    def process(self, state: VerificationState):
        state.log("ContractGuard", "Checking Registry for double-claiming...")
        # จำลองว่าตรวจสอบแล้วไม่พบการเคลมซ้ำ
        state.is_verified = True
        state.log("ContractGuard", "Ownership verified. No conflicts found.")
        return True

class LedgerAgent:
    """Agent 5: บันทึกข้อมูลลง Ledger และออก Token"""
    def process(self, state: VerificationState):
        state.log("LedgerAgent", "Minting Carbon Token on Blockchain...")
        state.token_id = f"dMRV-TOKEN-{uuid.uuid4().hex[:6].upper()}"
        state.status = "COMPLETED"
        state.log("LedgerAgent", f"Token Issued: {state.token_id}")
        return True

# =============================================================================
# 4. ORCHESTRATOR (ตัวควบคุมการไหลของข้อมูล)
# =============================================================================

class dMRVEngine:
    def __init__(self):
        self.agents = {
            "security": SecurityAgent(),
            "classifier": ClassificationAgent(),
            "social": SocialImpactAgent(),
            "verifier": ExistenceVerifier(),
            "quantifier": CarbonQuantifier(),
            "guard": ContractGuard(),
            "ledger": LedgerAgent(),
            "reporter": ReportingAgent()
        }

    def execute(self, input_form: ProjectInput):
        state = VerificationState(input_form)
        print(f"\n>>> Processing Project: {state.project_name} ({state.project_id})")
        
        # Pipeline Sequence: Security -> Classifier -> Social -> Verifier -> Quantifier -> Guard -> Ledger -> Reporter
        pipeline = ["security", "classifier", "social", "verifier", "quantifier", "guard", "ledger", "reporter"]
        
        for step in pipeline:
            agent = self.agents[step]
            if not agent.process(state):
                state.status = "FAILED"
                print(f"❌ Pipeline stopped at {step}")
                return state
            
            # Human-in-the-loop Intervention Point
            if step == "verifier" and state.confidence_score < 0.6:
                print(f"⚠️  Low Confidence ({state.confidence_score}). Need Human Approval?")
                choice = input("Approve manually? (y/n): ").lower()
                if choice != 'y':
                    state.status = "REJECTED_BY_HUMAN"
                    return state
                state.log("Human", "Manually approved low confidence data")

        return state

# =============================================================================
# 5. SIMULATION (จำลองการทำงาน)
# =============================================================================

if __name__ == "__main__":
    engine = dMRVEngine()

    # --- จำลองฟอร์มนำเข้าข้อมูล Case 1: ข้อมูลครบถ้วน ---
    form1 = ProjectInput("PRJ-001", "Mangrove Forest A", "Bangkok, Thailand")
    form1.add_dataset(DataSource.SATELLITE, {"area": 100}, "SIG_VALID_01")
    form1.add_dataset(DataSource.IOT_SENSOR, {"biomass": 250, "local_hiring": 5}, "SIG_VALID_02")
    form1.add_dataset(DataSource.DRONE_LIDAR, {"tree_count": 1000}, "SIG_VALID_03")

    # --- จำลองฟอร์มนำเข้าข้อมูล Case 2: ข้อมูลน้อย (ต้องใช้คนช่วย) ---
    form2 = ProjectInput("PRJ-002", "Small Urban Park", "Chiang Mai, Thailand")
    form2.add_dataset(DataSource.SATELLITE, {"area": 10}, "SIG_VALID_04")

    # รัน Simulation
    for f in [form1, form2]:
        result = engine.execute(f)
        print(f"Final Status: {result.status} | Token: {result.token_id} | Carbon: {result.carbon_metric:.2f}")
        print("Audit Trail:")
        for entry in result.audit_trail:
            print(f"  {entry}")
        print("-" * 50)
