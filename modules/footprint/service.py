from typing import Dict

class CarbonFootprintService:
    """
    ระบบติดตามและคำนวณรอยเท้าคาร์บอน (Carbon Footprint) ขององค์กรหรือโครงการ
    รองรับ Scope 1, 2 และ 3
    """
    def __init__(self):
        # Emission Factors (tCO2e per unit) - ข้อมูลจำลองตามมาตรฐาน อบก.
        self.factors = {
            "diesel_liter": 0.00268,
            "electricity_kwh": 0.0005,
            "waste_kg": 0.001
        }

    def calculate_emissions(self, emission_data: Dict[str, float]):
        """
        คำนวณการปล่อยก๊าซเรือนกระจกจากกิจกรรมต่างๆ
        """
        total_emissions = 0.0
        for key, value in emission_data.items():
            factor = self.factors.get(key, 0)
            total_emissions += value * factor
        
        return round(total_emissions, 4)

    def calculate_net_balance(self, footprint, credits_generated):
        """
        Net Carbon Balance = Credits - Footprint
        """
        return credits_generated - footprint
