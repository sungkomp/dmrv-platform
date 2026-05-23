from datetime import datetime

class VerificationState:
    def __init__(self):
        self.data = {}
        self.history = []
        self.audit_trail = []

    def update(self, key, value):
        self.data[key] = value
        self.history.append((key, value))

    def log(self, agent_name: str, action: str):
        msg = f"[{datetime.now().strftime('%H:%M:%S')}] {agent_name} -> {action}"
        self.audit_trail.append(msg)
        print(msg)
