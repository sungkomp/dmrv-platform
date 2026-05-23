class RuleService:
    def __init__(self):
        # เก็บ Methodology ไว้ที่นี่ (สามารถโหลดจาก JSON/Database ได้ในอนาคต)
        self.methodologies = {
            "IPCC-2023": {"biomass_factor": 2.5, "uncertainty_threshold": 0.15},
            "T-VER-FOREST": {"biomass_factor": 2.2, "uncertainty_threshold": 0.10}
        }

    def get_rules(self, method_name):
        return self.methodologies.get(method_name, {"error": "Methodology not found"})

class GovernanceModule:
    def __init__(self):
        self.rules = RuleService()
    
    def process_request(self, service, action, **kwargs):
        """API สำหรับเรียกดู Methodology หรืออัปเดต Rule"""
        if action == "get_rules":
            return {"status": "success", "data": self.rules.get_rules(kwargs.get("method_name"))}
        return {"error": "Action not supported"}
