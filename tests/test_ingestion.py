from dMRV.modules.ingestion.ingestion_module import IngestionModule

ingestor = IngestionModule()

# ทดสอบรับข้อมูลจาก Satellite
sat_data = ingestor.process_request("ingest", "ingest", source_type="satellite", data={"sq_km": 500, "ts": "2026-05-22"})
print(f"Normalized Satellite Data: {sat_data}")

# ทดสอบรับข้อมูลจาก IoT
iot_data = ingestor.process_request("ingest", "ingest", source_type="iot", data={"val": 120, "time": "2026-05-22T10:00"})
print(f"Normalized IoT Data: {iot_data}")
