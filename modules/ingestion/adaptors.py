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

class WeatherAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "WEATHER",
            "timestamp": raw_data.get("obs_time"),
            "location": raw_data.get("station_id"),
            "payload": {
                "temp_c": raw_data.get("temp"),
                "humidity": raw_data.get("humidity"),
                "precipitation": raw_data.get("precip_mm")
            }
        }

class SoilAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "SOIL",
            "timestamp": raw_data.get("sample_date"),
            "location": raw_data.get("plot_id"),
            "payload": {
                "ph": raw_data.get("ph_level"),
                "soc": raw_data.get("soc_percent"),
                "npk": raw_data.get("npk_values")
            }
        }

class BiocharCarbonAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "BIOCHAR_CREDIT",
            "timestamp": raw_data.get("production_date"),
            "location": raw_data.get("facility_id"),
            "payload": {
                "mass_t": raw_data.get("mass_t"),
                "carbon_fraction": raw_data.get("fc"),
                "h_c_ratio": raw_data.get("h_c"),
                "pyrolysis_temp_c": raw_data.get("temp"),
                "lab_report_id": raw_data.get("lab_report_id")
            }
        }

class WaterManagementAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "AWD_LOG",
            "timestamp": raw_data.get("date"),
            "location": raw_data.get("plot_id"),
            "payload": {
                "dry_days": raw_data.get("dry_days"),
                "flooded_days": raw_data.get("flooded_days"),
                "evidence_ref": raw_data.get("photo_ref")
            }
        }

class FertilizerAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "FERTILIZER_MGMT",
            "timestamp": raw_data.get("date"),
            "location": raw_data.get("plot_id"),
            "payload": {
                "fertilizer_type": raw_data.get("type"),
                "amount_kg": raw_data.get("amount_kg"),
                "application_method": raw_data.get("method"),
                "previous_usage_kg": raw_data.get("prev_usage")
            }
        }

class BiogasAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "BIOGAS_REDUCTION",
            "timestamp": raw_data.get("production_date"),
            "location": raw_data.get("facility_id"),
            "payload": {
                "biogas_m3": raw_data.get("volume_m3"),
                "methane_content_pct": raw_data.get("ch4_pct"),
                "replaced_fuel": raw_data.get("fuel_type"),
                "replaced_qty_kg": raw_data.get("replaced_qty")
            }
        }

class SolarAdaptor(BaseAdaptor):
    def parse(self, raw_data):
        return {
            "type": "RENEWABLE_ENERGY",
            "timestamp": raw_data.get("date"),
            "location": raw_data.get("facility_id"),
            "payload": {
                "energy_kwh": raw_data.get("kwh"),
                "grid_displacement": raw_data.get("grid_displaced"), # True/False
                "system_capacity_kw": raw_data.get("capacity_kw")
            }
        }
