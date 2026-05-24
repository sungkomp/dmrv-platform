class QuantifierService:
    def calculate(self, raw_data):
        # จำลองการคำนวณคาร์บอน
        return {"tCO2e": 150.5, "methodology": "IPCC-2023"}

class CarbonModule:
    def __init__(self):
        self.quantifier = QuantifierService()
    
    def process_request(self, service, action, **kwargs):
        if hasattr(self.quantifier, action):
            return {"status": "success", "data": getattr(self.quantifier, action)(**kwargs)}
        return {"error": "Action not found"}
