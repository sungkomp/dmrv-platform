from dMRV.core.fertilizer_db import FertilizerDatabase

class SoilGHGAuditService:
    # ... (methods) ...

    @staticmethod
    def verify_fertilizer_reduction(fertilizer_log):
        """
        ตรวจสอบการลดการใช้ปุ๋ยเคมีตามมาตรฐาน T-VER/IPCC
        """
        payload = fertilizer_log.get("payload", {})
        saved_kg = payload.get("previous_usage_kg", 0) - payload.get("amount_kg", 0)
        
        if saved_kg <= 0:
            return {"status": "FAILED", "reason": "No fertilizer reduction observed"}

        # ดึง Emission Factor จาก Database
        factor = FertilizerDatabase.get_factor(payload.get("fertilizer_type", ""))
        reduction = saved_kg * factor
        
        return {
            "status": "PASSED",
            "amount_tco2e": round(reduction, 3),
            "methodology": "Fertilizer Emission Avoidance (Tier 1)"
        }

    @staticmethod
    def verify_awd_reduction(awd_log, baseline_emission, area_ha):
        """
        ตรวจสอบการลด CH4 ตามระเบียบ T-VER
        - baseline_emission: ค่าการปล่อยก๊าซพื้นฐาน (tCO2e/ha/crop)
        - area_ha: พื้นที่ดำเนินโครงการ (ha)
        """
        # T-VER Criteria สำหรับ AWD
        TVER_CRITERIA = {
            "min_total_dry_days": 20,
            "min_cycles": 3,
            "tver_mitigation_factor": 0.48 # ตัวคูณการลดก๊าซตามมาตรฐาน T-VER
        }
        
        payload = awd_log.get("payload", {})
        dry_days = payload.get("dry_days", 0)
        cycles = payload.get("cycles", 0)
        evidence = payload.get("evidence_ref")

        if not evidence:
            return {"status": "FAILED", "reason": "Missing evidence (photo/log)"}

        if dry_days < TVER_CRITERIA["min_total_dry_days"]:
            return {"status": "FAILED", "reason": f"Insufficient cumulative dry days: {dry_days}"}
        
        if cycles < TVER_CRITERIA["min_cycles"]:
            return {"status": "FAILED", "reason": f"Insufficient AWD cycles: {cycles}"}
        
        # คำนวณตามมาตรฐาน T-VER
        # Reduction = Baseline * Mitigation_Factor * Area
        reduction = baseline_emission * TVER_CRITERIA["tver_mitigation_factor"] * area_ha
        
        return {
            "status": "PASSED",
            "amount_tco2e": round(reduction, 3),
            "methodology": "T-VER-AWD-CH4-01"
        }
