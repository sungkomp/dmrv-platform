from .base_consumer import BaseConsumer
from ..ingestion_module import IngestionModule

class IoTMQTTConsumer(BaseConsumer):
    def __init__(self, topic):
        self.topic = topic
        self.ingestion = IngestionModule()

    def start(self):
        print(f"Connecting to MQTT Broker and subscribing to {self.topic}...")
        # (ส่วนของการเชื่อมต่อ MQTT จะอยู่ที่นี่)

    def process_message(self, message):
        # เมื่อได้ข้อมูลมา ส่งเข้าโมดูลหลัก
        print(f"Received IoT data: {message}")
        self.ingestion.process_request(service="ingestion", action="ingest", source_type="iot", data=message)
