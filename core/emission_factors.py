class EmissionFactorRegistry:
    # ฐานข้อมูล EF มาตรฐาน (IPCC / TGO - องค์การบริหารจัดการก๊าซเรือนกระจก)
    # หน่วย: tCO2e ต่อหน่วย
    FACTORS = {
        "GRID_ELECTRICITY": 0.495,  # tCO2e/MWh (ค่าอ้างอิงล่าสุดจาก TGO)
        "DIESEL": 2.7,              # tCO2e/L
        "LPG": 3.0,                 # tCO2e/Ton
        "UREA": 0.0025,             # tCO2e/kg
        "ORGANIC_FERTILIZER": 0.0001 # tCO2e/kg
    }

    @staticmethod
    def get_factor(activity_type):
        return EmissionFactorRegistry.FACTORS.get(activity_type.upper(), 0.0)
