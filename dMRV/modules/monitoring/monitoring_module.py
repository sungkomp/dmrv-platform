class HealthService:
    def __init__(self):
        self.metrics = {"uptime": "99.9%", "active_agents": 8}

    def get_metrics(self):
        return self.metrics

class AlertService:
    def __init__(self):
        self.alerts = []

    def trigger(self, severity, message):
        alert = {"severity": severity, "message": message}
        self.alerts.append(alert)
        print(f"!!! ALERT [{severity.upper()}]: {message}")
        return alert

class MonitoringModule:
    def __init__(self):
        self.health = HealthService()
        self.alert = AlertService()
    
    def process_request(self, service, action, **kwargs):
        """API สำหรับ Monitor และ Alert"""
        target = getattr(self, service)
        if hasattr(target, action):
            return {"status": "success", "data": getattr(target, action)(**kwargs)}
        return {"error": "Action not supported"}
