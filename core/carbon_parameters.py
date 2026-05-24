class CarbonParameters:
    """
    Registry สำหรับเก็บค่า Parameter การคำนวณคาร์บอนเครดิตทุกประเภท
    อ้างอิงมาตรฐาน T-VER / IPCC / อบก.
    """
    # โครงสร้าง: {Project_Type: {Parameter: Value, ...}}
    registry = {
        "BLUE_CARBON": {
            "baseline_sequestration_rate": 10.5, # tCO2e/ha/year
            "regional_multiplier_south": 1.2,
            "permanence_factor": 0.95,
            "uncertainty_deduction": 0.10
        },
        "BIOCHAR_PYROLYSIS": {
            "sequestration_factor": 2.8,       # tCO2e/ton biochar
            "stability_factor": 0.85,         # 100-year permanence
            "feedstock_bonus": 1.05,
            "uncertainty_deduction": 0.05
        },
        "AWD_RICE": {
            "baseline_emission": 6.5,         # tCO2e/ha/crop
            "mitigation_factor": 0.48,        # T-VER mitigation rate
            "min_dry_days": 20,
            "uncertainty_deduction": 0.15
        },
        "FORESTRY_TVER": {
            "sequestration_per_tree": 0.05,   # tCO2e/tree/year
            "density_threshold": 200,         # trees/ha
            "uncertainty_deduction": 0.20
        },
        "BIOGAS": {
            "methane_avoidance_factor": 2.1,  # tCO2e/ton waste
            "efficiency_multiplier": 0.9,     # system leak factor
            "uncertainty_deduction": 0.10
        },
        "WASTE_MGMT": {
            "avoidance_factor": 1.8,          # tCO2e/ton diverted
            "methane_capture_rate": 0.75,
            "uncertainty_deduction": 0.10
        }
    }

    @classmethod
    def get_params(cls, project_type):
        return cls.registry.get(project_type, {})

    @classmethod
    def calculate_net_reduction(cls, project_type, raw_value, params_override=None):
        """คำนวณการลดก๊าซสุทธิโดยหักลบ Uncertainty Deduction"""
        p = cls.get_params(project_type)
        if not p: return 0
        
        # คำนวณแบบจำลอง (ยกตัวอย่าง)
        reduction = raw_value * p.get("uncertainty_deduction", 0) 
        # ใส่ Logic การคำนวณตามสูตรจริงของแต่ละประเภทที่นี่
        return reduction
