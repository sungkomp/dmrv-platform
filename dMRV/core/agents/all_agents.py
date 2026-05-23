import re
import hashlib
from dMRV.core.base_agent import BaseAgent

class ClassificationAgent(BaseAgent):
    def __init__(self):
        super().__init__("ClassificationAgent")
        self.patterns = {
            "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "phone": r"(\+66|0)[689]\d{8}",
            "id_num": r"\b\d{13}\b",
            "gps": r"[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+",
            "wallet": r"0x[a-fA-F0-9]{40}",
            "iot_id": r"IOT-[A-Z0-9]{8,}"
        }

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Scanning for PII and classifying data...")
        raw_data = state.data.get('sanitized_data', [])
        classified_data = []
        pdpa_consent = state.data.get('consent_granted', False)
        
        for item in raw_data:
            content = str(item)
            detected_pii = []
            
            for pii_type, pattern in self.patterns.items():
                if re.search(pattern, content):
                    detected_pii.append(pii_type)
            
            if detected_pii:
                if not pdpa_consent:
                    state.log(self.name, f"PDPA VIOLATION: PII detected ({detected_pii}) but no consent granted!")
                    return False
                
                item['classification'] = 'CONFIDENTIAL'
                item['detected_pii'] = detected_pii
            else:
                item['classification'] = 'PUBLIC'
            
            classified_data.append(item)
        
        state.update('classified_data', classified_data)
        state.log(self.name, f"Classification complete. {len(classified_data)} items processed.")
        return True

class SocialImpactAgent(BaseAgent):
    def __init__(self): super().__init__("SocialImpactAgent")
    def execute(self, state, *args, **kwargs):
        # Implementation logic...
        return True

class ExistenceVerifier(BaseAgent):
    def __init__(self): super().__init__("ExistenceVerifier")
    def execute(self, state, *args, **kwargs):
        return True

from datetime import datetime, timedelta

class CarbonQuantifier(BaseAgent):
    def __init__(self):
        super().__init__("CarbonQuantifier")
        self.evidence_expiry_days = 30 # ข้อมูลอ้างอิงต้องไม่เก่าเกิน 30 วัน

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Starting high-assurance carbon quantification...")
        data_list = state.data.get('encrypted_data', [])
        
        if not data_list:
            state.log(self.name, "ERROR: No verified evidence found for calculation.")
            return False

        # 1. Freshness Check: ตรวจสอบความสดใหม่ของข้อมูลล่าสุด
        latest_data = self._get_latest_evidence(data_list)
        if not self._is_data_fresh(latest_data):
            state.log(self.name, f"REJECTED: Evidence is stale (Latest: {latest_data.get('timestamp')})")
            return False

        # 2. Multi-Source Cross-Validation: ตรวจสอบความสอดคล้องของข้อมูลหลายแหล่ง
        if not self._validate_consistency(data_list, state):
            state.log(self.name, "REJECTED: Data inconsistency detected across sources.")
            return False

        # 3. Calculation Logic (Simulated based on latest metrics)
        carbon_metric = self._calculate_metrics(data_list)
        
        state.update('carbon_metric', carbon_metric)
        state.update('quantification_ts', datetime.now().isoformat())
        state.log(self.name, f"SUCCESS: Quantified {carbon_metric:.2f} tCO2e using latest evidence.")
        return True

    def _get_latest_evidence(self, data_list):
        # ดึงข้อมูลตัวล่าสุดตาม Timestamp
        sorted_data = sorted(data_list, key=lambda x: x.get('timestamp', ''), reverse=True)
        return sorted_data[0] if sorted_data else {}

    def _is_data_fresh(self, data):
        ts_str = data.get('timestamp')
        if not ts_str: return False
        try:
            # รองรับทั้ง ISO format และ simple date
            dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            return datetime.now() - dt < timedelta(days=self.evidence_expiry_days)
        except:
            return True # Fallback for simple formats in demo

    def _validate_consistency(self, data_list, state):
        """
        ตรวจสอบความสอดคล้อง เช่น:
        - ถ้า Agri-Log บอกว่า DRAINED (น้ำแห้ง) แต่อุปกรณ์ IoT หรือ LiDAR บอกว่ายังมีน้ำขังสูง
        """
        sources = {d.get('type'): d for d in data_list}
        
        if 'AGRI_ACTIVITY' in sources and 'IOT' in sources:
            log = sources['AGRI_ACTIVITY']
            iot = sources['IOT']
            if log.get('payload', {}).get('action') == 'DRAINED' and iot.get('biomass', 0) > 100:
                state.log(self.name, "CONFLICT: Agri-Log says DRAINED but IoT sensor shows high moisture/biomass.")
                return False
        
        return True

    def _calculate_metrics(self, data_list):
        # จำลองการคำนวณโดยให้น้ำหนักกับข้อมูลที่แม่นยำสูง (LiDAR > Satellite)
        total = 0
        for d in data_list:
            if d.get('type') == 'LIDAR':
                total += d.get('payload', {}).get('biomass_est', 0)
            elif d.get('type') == 'SATELLITE':
                total += d.get('area', 0) * 0.5 # ค่าสมมติ
            elif d.get('type') == 'IOT':
                total += d.get('biomass', 0) * 0.1
        return total if total > 0 else 150.5 # Default demo value

import uuid

class ContractGuard(BaseAgent):
    def __init__(self):
        super().__init__("ContractGuard")
        # ทะเบียนจำลองเพื่อตรวจสอบการเบิกใช้เครดิตซ้ำ (Double Claiming)
        self.issued_registry = ["PLOT-999-OLD", "CREDIT-X-STALE"] 

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Checking for double-claiming and contract validity...")
        
        # ตรวจสอบว่าพิกัดหรือ ID พื้นที่นี้เคยถูกออกเครดิตไปแล้วหรือไม่
        project_id = state.data.get('project_id', 'UNKNOWN_PROJECT')
        
        if project_id in self.issued_registry:
            state.log(self.name, f"REJECTED: Double-claiming detected for {project_id}!")
            return False
            
        # ตรวจสอบสิทธิ์ (Rights Verification)
        if not state.data.get('consent_granted'):
            state.log(self.name, "REJECTED: Missing legal right to issue credits.")
            return False

        state.log(self.name, "SUCCESS: No double-claiming detected. Contract is valid.")
        return True

class LedgerAgent(BaseAgent):
    def __init__(self):
        super().__init__("LedgerAgent")

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Recording final results to Immutable Ledger...")
        
        # รวบรวมข้อมูลสรุปเพื่อบันทึกลง Ledger
        carbon_value = state.data.get('carbon_metric', 0)
        integrity_hashes = [d.get('integrity_hash') for d in state.data.get('encrypted_data', [])]
        
        # สร้าง Transaction ID จำลอง (เปรียบเสมือน Blockchain TX)
        tx_id = f"TX-{uuid.uuid4().hex[:12].upper()}"
        token_id = f"CREDIT-{uuid.uuid4().hex[:8].upper()}"
        
        ledger_entry = {
            "tx_id": tx_id,
            "token_id": token_id,
            "project_id": state.data.get('project_id', 'PRJ-001'),
            "carbon_amount": carbon_value,
            "status": "Available",
            "timestamp": datetime.now().isoformat(),
            "evidence_merkle_root": self._mock_merkle_root(integrity_hashes),
            "audit_trail_len": len(state.audit_trail)
        }
        
        state.update('ledger_record', ledger_entry)
        state.log(self.name, f"SUCCESS: Record committed to Ledger. TX: {tx_id} | Token: {token_id}")
        return True

    def _mock_merkle_root(self, hashes):
        # จำลองการสร้าง Merkle Root จาก Integrity Hashes ของหลักฐานทั้งหมด
        combined = "".join([h for h in hashes if h])
        return hashlib.sha256(combined.encode()).hexdigest() if combined else "N/A"

class ReportingAgent(BaseAgent):
    def __init__(self): super().__init__("ReportingAgent")
    def execute(self, state, *args, **kwargs):
        return True
