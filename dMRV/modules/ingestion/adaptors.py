class BaseAdaptor:
    def parse(self, raw_data):
        raise NotImplementedError("Adaptors must implement parse()")

class SatelliteAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # แปลงข้อมูลจาก Satellite ให้เป็น Schema กลาง
        return {"type": "SATELLITE", "area": raw_data.get("sq_km"), "timestamp": raw_data.get("ts")}

class IoTSensorAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # แปลงข้อมูลจาก IoT Sensor ให้เป็น Schema กลาง
        return {"type": "IOT", "biomass": raw_data.get("val"), "timestamp": raw_data.get("time")}

class PhotoAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # ข้อมูลภาพถ่ายพร้อมพิกัด (Exif data)
        return {
            "type": "PHOTO",
            "timestamp": raw_data.get("dt_original"),
            "location": raw_data.get("gps_coords"),
            "file_hash": raw_data.get("hash"),
            "metadata": {"device": raw_data.get("model")}
        }

class DroneAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # ข้อมูลจาก Drone (Imagery + Telemetry)
        return {
            "type": "DRONE",
            "timestamp": raw_data.get("ts"),
            "location": raw_data.get("gps_center"),
            "payload": {
                "altitude": raw_data.get("alt"),
                "area_covered": raw_data.get("sq_m"),
                "resolution": raw_data.get("gsd")
            }
        }

class LidarAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # ข้อมูล LiDAR (Point Cloud metrics)
        return {
            "type": "LIDAR",
            "timestamp": raw_data.get("scan_time"),
            "location": raw_data.get("boundary"),
            "payload": {
                "point_density": raw_data.get("pts_per_sqm"),
                "canopy_height": raw_data.get("mean_height"),
                "biomass_est": raw_data.get("biomass_calc")
            }
        }

class AgriculturalActivityAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        # ข้อมูลกิจกรรมภาคการเกษตร (Activity Logs)
        return {
            "type": "AGRI_ACTIVITY",
            "timestamp": raw_data.get("activity_date"),
            "location": raw_data.get("plot_id"),
            "activity_type": raw_data.get("type"), # e.g., AWD_WATER_MANAGEMENT, FERTILIZER, RESIDUE_MGMT
            "description": raw_data.get("narrative"),
            "evidence_link": raw_data.get("photo_ref"),
            "payload": {
                "action": raw_data.get("action_taken"), # e.g., DRAINED, FLOODED, APPLIED
                "quantity": raw_data.get("amount"),
                "unit": raw_data.get("unit"),
                "worker_id": raw_data.get("worker")
            }
        }
