class AssessmentHub:
    """
    เครื่องมือจำลองเพื่อตรวจสอบความคุ้มค่าและความเป็นไปได้ของโครงการ (Feasibility & Financial Hub)
    """
    def __init__(self):
        # ฐานข้อมูล Factor จำลองสำหรับคำนวณต้นทุนและรายได้
        self.methodologies = {
            "BLUE_CARBON": {"factor": 10.5, "setup_cost": 5000, "maintenance_cost": 200},
            "BIOCHAR": {"factor": 2.8, "setup_cost": 3000, "maintenance_cost": 500},
            "AWD_RICE": {"factor": 6.5, "setup_cost": 2000, "maintenance_cost": 100}
        }
        self.carbon_price = 15.0 # USD/tCO2e

    def run_feasibility_check(self, project_type, quantity, duration_years=5):
        """ประเมินความคุ้มค่าทางการเงินและความเป็นไปได้"""
        if project_type not in self.methodologies:
            return {"error": "Methodology not supported"}
        
        m = self.methodologies[project_type]
        
        # 1. คำนวณรายได้คาร์บอน (Revenue)
        estimated_credits = quantity * m["factor"]
        total_revenue = estimated_credits * self.carbon_price * duration_years
        
        # 2. คำนวณต้นทุน (Cost)
        total_cost = m["setup_cost"] + (m["maintenance_cost"] * duration_years)
        
        # 3. ประเมินผลตอบแทน (Financial Viability)
        net_profit = total_revenue - total_cost
        roi = (net_profit / total_cost) * 100 if total_cost > 0 else 0
        
        # 4. ตรวจสอบความเป็นไปได้ (Operational Feasibility)
        # ตรวจสอบเบื้องต้น: ต้นทุนโครงการไม่ควรสูงเกิน 70% ของรายได้ที่คาดหวัง
        is_feasible = total_revenue > (total_cost * 1.3)
        
        return {
            "project_type": project_type,
            "financial_summary": {
                "estimated_credits_per_year": round(estimated_credits, 2),
                "total_revenue_5yr": round(total_revenue, 2),
                "total_cost_5yr": round(total_cost, 2),
                "net_profit": round(net_profit, 2),
                "roi_percent": round(roi, 2)
            },
            "operational_status": "FEASIBLE" if is_feasible else "NOT_FEASIBLE",
            "recommendation": "โครงการผ่านเกณฑ์คุ้มทุน" if is_feasible else "โปรดพิจารณาปรับต้นทุนโครงการ"
        }

    def recommend_methodology(self, lat, lng):
        """
        ประเมินความเหมาะสมของพื้นที่ (Spatial Feasibility)
        จำลองโซนพื้นที่ของไทยเพื่อแนะนำ Methodology ที่เหมาะสม
        """
        # สมมติพิกัด (Lat, Lng) - ตัวอย่างการจำลองพื้นที่
        if 5.0 <= lat <= 9.0: # พื้นที่ภาคใต้
            return "BLUE_CARBON", "พื้นที่ป่าชายเลน/ชายฝั่ง เหมาะสำหรับ Blue Carbon"
        elif 14.0 <= lat <= 16.0 and 100.0 <= lng <= 102.0: # พื้นที่ภาคกลาง
            return "AWD_RICE", "พื้นที่ราบลุ่มแม่น้ำ เหมาะสำหรับเกษตรยั่งยืน (AWD Rice)"
        elif 16.0 <= lat <= 20.0: # พื้นที่ภาคเหนือ
            return "FORESTRY_TVER", "พื้นที่สูง/ลาดชัน เหมาะสำหรับปลูกป่า (T-VER Forestry)"
        else:
            return "BIOCHAR", "พื้นที่เกษตรกรรมทั่วไป เหมาะสำหรับ Biochar"

# --- ตัวอย่างการรันการประเมิน ---
if __name__ == "__main__":
    hub = AssessmentHub()
    print("--- วิเคราะห์ความเป็นไปได้ของโครงการ ---")
    
    # 1. แนะนำโครงการตามพื้นที่
    lat, lng = 14.5, 100.2
    meth, rec = hub.recommend_methodology(lat, lng)
    print(f"\nพื้นที่พิกัด ({lat}, {lng}):")
    print(f"แนะนำ Methodology: {meth}")
    print(f"เหตุผล: {rec}")

    # 2. ทดสอบโปรเจกต์ที่แนะนำ
    report = hub.run_feasibility_check(meth, quantity=100)
    print(f"\nStatus: {report['operational_status']}")
    print(f"ROI: {report['financial_summary']['roi_percent']}%")
