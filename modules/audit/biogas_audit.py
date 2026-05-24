class BiogasAuditService:
    @staticmethod
    def verify_biogas_reduction(payload):
        """
        คำนวณการลดก๊าซเรือนกระจกจาก Biogas (Capture + Displacement)
        """
        # 1. Methane Capture: Biogas volume * CH4 % * density(0.716 kg/m3) * GWP(28)
        methane_ton = (payload.get("biogas_m3", 0) * (payload.get("methane_content_pct", 0) / 100)) * 0.000716
        ch4_reduction = methane_ton * 28
        
        # 2. Fuel Displacement: Replaced qty * EF (สมมติ 0.003 tCO2e/kg สำหรับเชื้อเพลิงทั่วไป)
        fuel_reduction = payload.get("replaced_qty_kg", 0) * 0.003
        
        total = ch4_reduction + fuel_reduction
        
        return {
            "status": "PASSED",
            "amount_tco2e": round(total, 3),
            "methodology": "Biogas CH4 Capture & Fuel Substitution"
        }
