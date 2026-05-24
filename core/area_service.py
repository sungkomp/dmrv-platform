import math

class AreaService:
    RAI_TO_HECTARE = 1 / 6.25

    @staticmethod
    def rai_to_hectare(rai):
        return rai * AreaService.RAI_TO_HECTARE

    @staticmethod
    def calculate_polygon_area_ha(coordinates):
        """
        คำนวณพื้นที่จากพิกัด (Polygon) และแปลงเป็น เฮกตาร์
        พิกัด: List of (lat, lon)
        ใช้สูตร Shoelace formula สำหรับพื้นที่ผิวโลกโดยประมาณ
        """
        # (นี่คือเวอร์ชันพื้นฐาน ควรใช้ Library เช่น 'shapely' หรือ 'pyproj' ในอนาคต)
        if len(coordinates) < 3:
            return 0.0
        
        # คำนวณพื้นที่แบบง่าย (Square Meters)
        area_sqm = 0.0
        for i in range(len(coordinates)):
            j = (i + 1) % len(coordinates)
            area_sqm += coordinates[i][0] * coordinates[j][1]
            area_sqm -= coordinates[j][0] * coordinates[i][1]
        
        area_sqm = abs(area_sqm) * 111320 * 111320 * math.cos(math.radians(coordinates[0][0])) / 2
        
        # แปลงเป็น Hectares
        return area_sqm / 10000

    @staticmethod
    def get_area_ha(rai=None, coordinates=None):
        if coordinates:
            return AreaService.calculate_polygon_area_ha(coordinates)
        if rai:
            return AreaService.rai_to_hectare(rai)
        return 0.0
