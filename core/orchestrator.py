from core.state_manager import VerificationState
from core.agents.all_agents import (
    SecurityAgent, ClassificationAgent, EncryptionAgent, ExistenceVerifier, 
    CarbonQuantifier, ContractGuard, LedgerAgent, ReportingAgent
)
from core.agents.heartbeat_agent import HeartbeatMonitorAgent

class Orchestrator:
    def __init__(self):
        self.agents = {
            "heartbeat": HeartbeatMonitorAgent(),
            "security": SecurityAgent("SecurityAgent"),
            "classifier": ClassificationAgent(),
            "encryption": EncryptionAgent("EncryptionAgent"),
            "verifier": ExistenceVerifier("ExistenceVerifier"),
            "quantifier": CarbonQuantifier("CarbonQuantifier"),
            "guard": ContractGuard("ContractGuard"),
            "ledger": LedgerAgent("LedgerAgent"),
            "reporter": ReportingAgent("ReportingAgent")
        }

    def run_workflow(self, state: VerificationState):
        print(f"\n>>> Orchestrating dMRV Workflow for: {state.project_id}")
        pipeline = ["heartbeat", "security", "classifier", "encryption", "verifier", "quantifier", "guard", "ledger", "reporter"]

        for name in pipeline:
            agent = self.agents[name]
            success = agent.execute(state)
            if not success:
                state.update('status', "FAILED")
                print(f"❌ Workflow interrupted at {name} agent.")
                return False

        print(f"✅ Workflow Completed: {state.status}")
        return True

