from dMRV.modules.governance.governance_module import GovernanceModule

gov = GovernanceModule()

# ทดสอบดึง Methodology
rules = gov.process_request(None, "get_rules", method_name="IPCC-2023")
print(f"Governance Rules (IPCC-2023): {rules}")

# ทดสอบ Methodology ที่ไม่มีอยู่
invalid = gov.process_request(None, "get_rules", method_name="UNKNOWN-STD")
print(f"Governance Rules (Unknown): {invalid}")
