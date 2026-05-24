from abc import ABC, abstractmethod

class BaseConsumer(ABC):
    @abstractmethod
    def start(self):
        """เริ่มการเชื่อมต่อกับ Queue/Broker"""
        pass

    @abstractmethod
    def process_message(self, message):
        """ประมวลผลข้อมูลที่ได้รับมา"""
        pass

    def stop(self):
        """หยุดการเชื่อมต่อ"""
        pass
