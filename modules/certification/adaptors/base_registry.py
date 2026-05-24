from abc import ABC, abstractmethod

class BaseCarbonAdaptor(ABC):
    """
    Base Class สำหรับสร้าง Adaptor ไปยังหน่วยงานมาตรฐานคาร์บอนต่างๆ
    ช่วยให้ระบบรองรับ T-VER, Gold Standard, หรือ VCS ในอนาคต
    """
    @abstractmethod
    def prepare_submission(self, state):
        pass

    @abstractmethod
    def submit(self, state):
        pass
