from dMRV.core.orchestrator import Orchestrator
from dMRV.modules.logistics import LogisticsModule
from dMRV.modules.carbon.carbon_module import CarbonModule
from dMRV.modules.audit.audit_module import AuditModule

# Initialize Core
orchestrator = Orchestrator()

# Register Modules
orchestrator.register_module("logistics", LogisticsModule())
orchestrator.register_module("carbon", CarbonModule())
orchestrator.register_module("audit", AuditModule())

# Verify New Modules
carbon_mod = orchestrator.modules["carbon"]
audit_mod = orchestrator.modules["audit"]

print(f"Carbon calculation: {carbon_mod.process_request('quantifier', 'calculate', raw_data={})}")
print(f"Audit verification: {audit_mod.process_request('ledger', 'verify', tx_id='TX-999')}")
