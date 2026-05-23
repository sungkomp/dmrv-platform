from .adaptors import SatelliteAdaptor, PhotoAdaptor, DroneAdaptor, LidarAdaptor, AgriculturalActivityAdaptor

class IngestionModule:
    def __init__(self):
        self.adaptors = {
            "satellite": SatelliteAdaptor(),
            "photo": PhotoAdaptor(),
            "drone": DroneAdaptor(),
            "lidar": LidarAdaptor(),
            "agri_activity": AgriculturalActivityAdaptor()
        }

    def process_request(self, service, action, **kwargs):
        """Standard API to ingest and normalize data"""
        if action == "ingest":
            source_type = kwargs.get("source_type")
            raw_data = kwargs.get("data")
            
            if source_type in self.adaptors:
                normalized = self.adaptors[source_type].parse(raw_data)
                return {"status": "success", "data": normalized}
            return {"error": "Adaptor not found"}
        
        return {"error": "Action not supported"}
