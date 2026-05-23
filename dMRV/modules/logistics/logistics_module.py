from .tracking_service import TrackingService
from .inventory_service import InventoryService
from .settlement_service import SettlementService

class LogisticsModule:
    def __init__(self):
        self.tracking = TrackingService()
        self.inventory = InventoryService()
        self.settlement = SettlementService()
        print("LogisticsModule initialized with services.")

    def process_request(self, service, action, **kwargs):
        """Unified API endpoint for external interaction."""
        if not hasattr(self, service):
            return {"error": f"Service {service} not found"}
        
        service_instance = getattr(self, service)
        if not hasattr(service_instance, action):
            return {"error": f"Action {action} not found in service {service}"}
        
        method = getattr(service_instance, action)
        result = method(**kwargs)
        return {"status": "success", "data": result}

    def get_status(self):
        return {"status": "active", "services": ["tracking", "inventory", "settlement"]}
