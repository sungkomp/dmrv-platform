class DynamicAssessmentEngine:
    """
    เครื่องมือประเมินรอยเท้าคาร์บอนแบบไดนามิก (Universal Activity Tracker)
    รองรับการเพิ่มประเภทกิจกรรมได้ไม่จำกัดตามมาตรฐาน อบก.
    """
    def __init__(self):
        # Register for Emission Factors (Registry Pattern)
        self.registry = {
            "scope1": {},
            "scope2": {},
            "scope3": {}
        }

    def register_activity(self, scope, activity_name, emission_factor):
        """เพิ่มประเภทกิจกรรมใหม่ลงในระบบ"""
        self.registry[scope][activity_name] = emission_factor

    def calculate_footprint(self, activity_data):
        """
        คำนวณ Footprint จากรายการกิจกรรมที่ระบุ
        activity_data ตัวอย่าง: {"scope1": {"diesel": 500}, "scope2": {"electricity": 2000}}
        """
        total = 0.0
        breakdown = {}
        
        for scope, activities in activity_data.items():
            breakdown[scope] = {}
            for activity, quantity in activities.items():
                factor = self.registry.get(scope, {}).get(activity, 0)
                emission = quantity * factor
                total += emission
                breakdown[scope][activity] = round(emission, 4)
        
        return {"total": round(total, 4), "breakdown": breakdown}

# --- การใช้งาน ---
engine = DynamicAssessmentEngine()

# 1. Register Activities (เหมือนการตั้งค่าระบบ)
engine.register_activity("scope1", "diesel", 0.00268)
engine.register_activity("scope1", "gasoline", 0.00219)
engine.register_activity("scope2", "electricity", 0.00049)
engine.register_activity("scope3", "logistics_air", 0.0008)
engine.register_activity("scope3", "office_paper", 0.0045)

# 2. รายงานผลจากข้อมูลกิจกรรมที่รับเข้ามา (Input)
activities_today = {
    "scope1": {"diesel": 5000, "gasoline": 1000},
    "scope2": {"electricity": 15000},
    "scope3": {"logistics_air": 200, "office_paper": 50}
}

result = engine.calculate_footprint(activities_today)
print(f"Total Carbon Footprint: {result['total']} tCO2e")
print(f"Breakdown: {result['breakdown']}")
