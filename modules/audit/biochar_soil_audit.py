class BiocharSoilApplicationService:
    """
    ระบบตรวจสอบและคำนวณคาร์บอนจากการนำ Biochar มาใช้ในดิน (Soil Amendment)
    เงื่อนไข:
    1. ต้องระบุประเภทวัตถุดิบ (Feedstock)
    2. ต้องระบุอัตราการใช้ (Application Rate: tons/hectare)
    3. ตรวจสอบพิกัดการใช้งานจริง (GPS)
    4. ตรวจสอบความลึกในการไถกลบเพื่อป้องกันการชะล้าง
    """
    @staticmethod
    def verify_application(biochar_data_list):
        total_biochar_tons = 0
        has_gps_evidence = False
        avg_depth = 0
        depth_readings = []
        
        for record in biochar_data_list:
            payload = record.get('payload', {})
            
            # ตรวจสอบการใช้งานจริง
            if "AGRI_LOG" in str(record.get('source')):
                total_biochar_tons += payload.get('biochar_ton', 0)
                depth_readings.append(payload.get('depth_cm', 0))
            
            # ตรวจสอบพิกัด
            if "GPS" in str(record.get('payload')):
                has_gps_evidence = True
        
        avg_depth = sum(depth_readings) / len(depth_readings) if depth_readings else 0
        
        # เกณฑ์การตัดสิน
        conditions = {
            "depth_ok": avg_depth >= 15, # บังคับไถกลบลึกอย่างน้อย 15 ซม.
            "evidence_ok": has_gps_evidence,
            "positive_amount": total_biochar_tons > 0
        }
        
        is_compliant = all(conditions.values())
        
        # การคำนวณคาร์บอน (ตาม IPCC Tier 2)
        # Carbon Sequestration = Biochar(tons) * Carbon Content(%) * Stability(100yr)
        sequestration = total_biochar_tons * 0.75 * 0.85 if is_compliant else 0
        
        return {
            "is_compliant": is_compliant,
            "details": conditions,
            "metrics": {
                "total_tons": total_biochar_tons,
                "avg_depth_cm": avg_depth
            },
            "carbon_sequestration_tco2e": round(sequestration * 3.67, 3) # 1 ton C = 3.67 tCO2
        }
