class RenewableEnergyAuditService:
    # Grid Emission Factor (EF): tCO2e ต่อ MWh (ค่าอ้างอิง)
    GRID_EF = 0.52 # ค่าเฉลี่ยโดยประมาณของไฟฟ้าในไทย (อาจปรับได้ตามประกาศของ อบก.)

    @staticmethod
    def verify_solar_reduction(payload):
        """
        คำนวณการลดก๊าซจากพลังงานแสงอาทิตย์
        """
        kwh = payload.get("energy_kwh", 0)
        mwh = kwh / 1000
        
        # ลดก๊าซจากการแทนที่ไฟฟ้าสายส่ง
        reduction = mwh * RenewableEnergyAuditService.GRID_EF
        
        return {
            "status": "PASSED",
            "amount_tco2e": round(reduction, 3),
            "methodology": "Solar Energy Displacement (Grid EF)"
        }
