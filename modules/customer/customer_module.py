from .client_service import ClientService
from .visualization_service import VisualizationService

class CustomerModule:
    def __init__(self):
        self.client = ClientService()
        self.viz = VisualizationService()
    
    def process_request(self, service, action, **kwargs):
        # จัดการคำสั่งสำหรับ Client ข้อมูล
        if action == "get_dashboard":
            return {"status": "success", "data": self.client.get_portfolio(kwargs.get("client_id"))}
        
        # จัดการคำสั่งสำหรับ Visualisation (GIS/3D)
        if action == "get_gis_data":
            return {"status": "success", "data": self.viz.get_digital_twin_data(kwargs.get("project_id"))}
            
        return {"error": "Action not supported"}
