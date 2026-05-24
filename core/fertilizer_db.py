class FertilizerDatabase:
    # Emission Factors (tCO2e per kg of fertilizer)
    # ค่าสมมติฐาน: ปุ๋ยแต่ละประเภทมีค่าการปล่อยก๊าซ (ผลิต + ขนส่ง + ใช้งาน) ต่างกัน
    FACTORS = {
        "UREA": 0.0025,
        "NPK_16_16_16": 0.0018,
        "AMMONIUM_SULFATE": 0.0015
    }

    @staticmethod
    def get_factor(fertilizer_type):
        return FertilizerDatabase.FACTORS.get(fertilizer_type.upper(), 0.0020) # ค่า default
