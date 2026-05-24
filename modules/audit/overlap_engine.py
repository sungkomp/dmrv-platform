from dMRV.core.registry import PlotRegistry

class OverlapEngine:
    def __init__(self):
        self.registry = PlotRegistry()

    def check_overlap(self, new_plot_id, new_coordinates):
        """
        ตรวจสอบการทับซ้อนของพิกัดแปลงใหม่กับแปลงที่มีอยู่แล้ว
        """
        existing_plots = self.registry.get_all_plots()
        
        for plot_id, coords in existing_plots.items():
            if self._is_intersecting(new_coordinates, coords):
                return {"status": "OVERLAPPED", "with_plot": plot_id}
        
        # ถ้าไม่ทับซ้อนให้ลงทะเบียน
        self.registry.register_plot(new_plot_id, new_coordinates)
        return {"status": "CLEAN"}

    def _is_intersecting(self, poly1, poly2):
        # ในระดับเบื้องต้นใช้การตรวจสอบจุด (Bounding Box หรือ Point-in-Polygon)
        # สำหรับโปรเจกต์จริง แนะนำให้ใช้ library 'shapely'
        # ตรงนี้คือจำลอง Logic การเช็คความซ้ำซ้อน
        return False # สมมติว่ายังไม่ทับซ้อน
