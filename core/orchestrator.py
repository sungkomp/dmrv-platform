from .state_manager import VerificationState
from dMRV.core.agents.security_agent import SecurityAgent
from dMRV.core.agents.encryption_agent import EncryptionAgent
from dMRV.core.agents.all_agents import (
    ClassificationAgent, SocialImpactAgent, ExistenceVerifier, 
    CarbonQuantifier, ContractGuard, LedgerAgent, ReportingAgent
)

class Orchestrator:
    def __init__(self):
        self.state = VerificationState()
        self.agents = {
            "security": SecurityAgent(),
            "classifier": ClassificationAgent(),
            "encryption": EncryptionAgent(),
            "social": SocialImpactAgent(),
            "verifier": ExistenceVerifier(),
            "quantifier": CarbonQuantifier(),
            "guard": ContractGuard(),
            "ledger": LedgerAgent(),
            "reporter": ReportingAgent()
        }
        self.modules = {}

    def register_module(self, name, module):
        self.modules[name] = module
        print(f"Module {name} registered.")

    def run_workflow(self, task):
        print(f"Orchestrating task: {task}")
        for name, agent in self.agents.items():
            success = agent.execute(self.state)
            if not success:
                print(f"Workflow interrupted at {name} agent.")
                return False
        return True
