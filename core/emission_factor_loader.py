import csv
import os

class EmissionFactorLoader:
    """
    Service สำหรับโหลดค่า Emission Factors จากไฟล์ CSV
    โครงสร้างไฟล์ CSV: activity_type, factor, unit, source
    """
    
    @staticmethod
    def load_from_csv(file_path):
        if not os.path.exists(file_path):
            return {"status": "ERROR", "message": "File not found"}
            
        new_factors = {}
        try:
            with open(file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    activity = row['activity_type'].upper()
                    factor = float(row['factor'])
                    new_factors[activity] = factor
            
            # อัปเดตไฟล์ emission_factors.py ด้วยค่าใหม่
            EmissionFactorLoader._save_to_registry(new_factors)
            return {"status": "SUCCESS", "count": len(new_factors)}
        except Exception as e:
            return {"status": "ERROR", "message": str(e)}

    @staticmethod
    def _save_to_registry(factors_dict):
        content = f"class EmissionFactorRegistry:\n    FACTORS = {factors_dict}\n\n    @staticmethod\n    def get_factor(activity_type):\n        return EmissionFactorRegistry.FACTORS.get(activity_type.upper(), 0.0)"
        with open("dMRV/core/emission_factors.py", "w") as f:
            f.write(content)
