class RealisticAssessmentSimulator:
    """
    เครื่องมือจำลองการประเมินรอยเท้าคาร์บอน (CFO/CFP) 
    โดยใช้ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจก (Emission Factors) ตามมาตรฐาน อบก. (TGO)
    """
    def __init__(self):
        # Emission Factors (tCO2e / Unit) - TGO/IPCC Reference
        self.factors = {
            # Scope 1
            "diesel": 0.00268,      # Per Liter
            "gasoline": 0.00219,    # Per Liter
            "lpg": 0.00298,         # Per KG
            # Scope 2
            "grid_electricity": 0.00049, # Per kWh (Thailand Grid Mix)
            # Scope 3
            "office_paper": 0.0045,  # Per KG
            "water_supply": 0.0003   # Per Cubic Meter
        }

    def assess_cfo(self, scope1_data, scope2_data, scope3_data):
        """ประเมินรอยเท้าคาร์บอนองค์กร (CFO)"""
        s1 = sum(qty * self.factors.get(fuel, 0) for fuel, qty in scope1_data.items())
        s2 = scope2_data.get("kwh", 0) * self.factors["grid_electricity"]
        s3 = sum(qty * self.factors.get(item, 0) for item, qty in scope3_data.items())
        
        return {
            "scope_1": round(s1, 3),
            "scope_2": round(s2, 3),
            "scope_3": round(s3, 3),
            "total_cfo": round(s1 + s2 + s3, 3)
        }

    def assess_cfp(self, production_data):
        """ประเมินรอยเท้าคาร์บอนผลิตภัณฑ์ (CFP)"""
        # คำนวณจาก Cradle-to-Gate (วัสดุ + พลังงานผลิต + โลจิสติกส์)
        material_emissions = production_data.get("material_kg", 0) * 0.005 # ตย. วัตถุดิบ
        energy_emissions = production_data.get("kwh_per_unit", 0) * self.factors["grid_electricity"]
        logistics_emissions = production_data.get("dist_km", 0) * 0.0001 # ตย. ขนส่ง
        
        return {
            "material": round(material_emissions, 4),
            "energy": round(energy_emissions, 4),
            "logistics": round(logistics_emissions, 4),
            "total_cfp_per_unit": round(material_emissions + energy_emissions + logistics_emissions, 4)
        }

def run_simulation():
    sim = RealisticAssessmentSimulator()
    
    # 1. จำลอง CFO (องค์กร)
    org_s1 = {"diesel": 5000, "gasoline": 2000}
    org_s2 = {"kwh": 50000}
    org_s3 = {"office_paper": 500}
    cfo_result = sim.assess_cfo(org_s1, org_s2, org_s3)
    
    # 2. จำลองการประเมินคาร์บอนเครดิต (เช่น จากโปรเจกต์ Biochar)
    # สมมติเครดิตที่คำนวณได้จาก dMRV Pipeline
    generated_credits = 1200.50 
    
    # 3. คำนวณ Net Balance
    net_balance = generated_credits - cfo_result['total_cfo']
    status = "CARBON NEUTRAL (Pass)" if net_balance >= 0 else "OFFSET REQUIRED (Fail)"
    
    # Report
    print("=== รายงานการประเมินรอยเท้าคาร์บอนและคาร์บอนเครดิต (Sandbox) ===")
    print(f"--- [CFO] องค์กรปล่อย: {cfo_result['total_cfo']} tCO2e")
    print(f"--- [Credits] เครดิตที่ได้รับ: {generated_credits:.2f} tCO2e")
    print("-" * 50)
    print(f"Net Carbon Balance : {net_balance:.2f} tCO2e")
    print(f"Sustainability Status : {status}")

if __name__ == "__main__":
    run_simulation()
