from dMRV.core.orchestrator import Orchestrator
from dMRV.modules.logistics import LogisticsModule

# Initialize Core
orchestrator = Orchestrator()

# Register Modules
logistics = LogisticsModule()
orchestrator.register_module("logistics", logistics)

# Run Workflow
orchestrator.run_workflow("Simulated Carbon Verification Task")

# Verify Modular Access
print(f"Logistics status: {logistics.get_status()}")
