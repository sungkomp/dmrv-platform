class BlueCarbonAuditService:
    @staticmethod
    def calculate_total_sequestration(area_ha, agb_carbon, sediment_carbon_stock):
        """
        คำนวณคาร์บอนรวมสำหรับป่าชายเลน
        - area_ha: พื้นที่เฮกตาร์
        - agb_carbon: คาร์บอนเหนือพื้นดิน (ton C/ha)
        - sediment_carbon_stock: คาร์บอนในตะกอน (ton C/ha)
        """
        # Carbon stock (ton C) = (AGB + Sediment) * Area
        total_carbon_ton = (agb_carbon + sediment_carbon_stock) * area_ha
        
        # แปลงเป็น tCO2e
        tco2e = total_carbon_ton * 3.667
        
        return {
            "status": "PASSED",
            "total_tco2e": round(tco2e, 3),
            "breakdown": {
                "biomass": round(agb_carbon * area_ha * 3.667, 3),
                "sediment": round(sediment_carbon_stock * area_ha * 3.667, 3)
            },
            "methodology": "Blue Carbon Stock Change"
        }

    @staticmethod
    def validate_mangrove_integrity(satellite_data):
        """
        ตรวจสอบความสมบูรณ์ของป่าด้วยดัชนีพืชพรรณ/น้ำ
        """
        # ในระดับ implementation จริงจะใช้ค่าจากดัชนี MNDWI หรือ NDVI
        if satellite_data.get("forest_cover_pct", 0) < 70:
            return {"status": "FAILED", "reason": "Low forest cover density"}
        return {"status": "PASSED"}
