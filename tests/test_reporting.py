from dMRV.modules.reporting.reporting_module import ReportingModule

rep = ReportingModule()

# ทดสอบสร้างรายงาน
summary = {"project": "Mangrove A", "carbon_tCO2e": 150.5, "status": "VERIFIED"}
report = rep.process_request(None, 'generate', data=summary)
print(f"Generated Report: {report}")
