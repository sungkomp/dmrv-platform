from datetime import datetime, timedelta
from core.base_agent import BaseAgent
from core.constants import DataSource

class HeartbeatMonitorAgent(BaseAgent):
    """
    ตรวจสอบความต่อเนื่องของสัญญาณจากอุปกรณ์ IoT (Liveness Check).
    หากข้อมูลขาดหายเกินระยะเวลาที่กำหนด จะส่งสถานะ Alert ให้ระบบจัดการ
    """
    def __init__(self, name="HeartbeatMonitor", interval_hours=2):
        super().__init__(name)
        self.interval_hours = interval_hours

    def execute(self, state, *args, **kwargs):
        state.log(self.name, "Checking IoT Liveness...")
        iot_data = [d for d in state.data.get('raw_data', []) if d.get('source') == DataSource.IOT_SENSOR]
        
        if not iot_data:
            state.log(self.name, "No IoT data reported.")
            return True
            
        ts_list = [datetime.fromisoformat(str(d.get('timestamp'))) for d in iot_data if d.get('timestamp')]
        if not ts_list:
            state.log(self.name, "No valid timestamps found.")
            return True
            
        latest_ts = max(ts_list)
        if datetime.now() - latest_ts > timedelta(hours=self.interval_hours):
            state.log(self.name, f"CRITICAL: Liveness lost since {latest_ts}")
            return False
            
        state.log(self.name, "IoT Liveness confirmed.")
        return True
