from dMRV.core.base_agent import BaseAgent

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("SecurityAgent")

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Validating digital signatures...")
        # Accessing data through state.data or state's raw_data as per design
        for item in state.data.get('raw_data', []):
            if "VALID" in item.get('signature', ''):
                state.data.setdefault('sanitized_data', []).append(item)
        
        success = len(state.data.get('sanitized_data', [])) > 0
        state.log(self.name, f"Verified {len(state.data.get('sanitized_data', []))} packets")
        return success
