from typing import List, Dict, Tuple
import math

class SpatialRegistry:
    """
    Registry ติดตามการใช้พื้นที่: อนุญาตให้มีกิจกรรมต่างประเภทได้ แต่ห้ามมีกิจกรรมประเภทเดิมทับซ้อน
    """
    def __init__(self):
        self.registered_activities = [] # List of {"boundary": poly, "type": project_type}

    def register_new_activity(self, project_id, boundary, project_type):
        for entry in self.registered_activities:
            # ตรวจสอบการทับซ้อนของพื้นที่
            if SpatialVerifier.check_boundary_overlap(boundary, entry["boundary"]):
                # ถ้าซ้อนทับกัน ห้ามเป็นกิจกรรมประเภทเดียวกัน
                if project_type == entry["type"]:
                    return False, f"Conflict: กิจกรรม {project_type} มีอยู่แล้วในพื้นที่นี้"
        
        self.registered_activities.append({"project_id": project_id, "boundary": boundary, "type": project_type})
        return True, "Registered successfully"

# Global instance for simulation
spatial_registry = SpatialRegistry()

class SpatialVerifier:
    # ... (Keep existing methods is_point_in_polygon, check_boundary_overlap, validate_evidence_location) ...
    @staticmethod
    def is_point_in_polygon(point, polygon):
        x, y = point
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xints:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @staticmethod
    def check_boundary_overlap(poly1, poly2):
        for p in poly1:
            if SpatialVerifier.is_point_in_polygon(p, poly2):
                return True
        return False

    @staticmethod
    def validate_evidence_location(lat, lng, project_boundary):
        return SpatialVerifier.is_point_in_polygon((lat, lng), project_boundary)
