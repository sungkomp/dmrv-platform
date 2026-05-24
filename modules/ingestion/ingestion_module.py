from .adaptors import SatelliteAdaptor, PhotoAdaptor, DroneAdaptor, LidarAdaptor, AgriculturalActivityAdaptor, IoTSensorAdaptor, WeatherAdaptor, SoilAdaptor, BiocharCarbonAdaptor, WaterManagementAdaptor, FertilizerAdaptor, BiogasAdaptor, SolarAdaptor

class IngestionModule:
    def __init__(self):
        self.adaptors = {
            "satellite": SatelliteAdaptor(),
            "photo": PhotoAdaptor(),
            "drone": DroneAdaptor(),
            "lidar": LidarAdaptor(),
            "agri_activity": AgriculturalActivityAdaptor(),
            "iot": IoTSensorAdaptor(),
            "weather": WeatherAdaptor(),
            "soil": SoilAdaptor(),
            "biochar": BiocharCarbonAdaptor(),
            "awd": WaterManagementAdaptor(),
            "fertilizer": FertilizerAdaptor(),
            "biogas": BiogasAdaptor(),
            "solar": SolarAdaptor()
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
