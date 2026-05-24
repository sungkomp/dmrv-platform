class GISVisualizer:
    """
    ระบบสร้างแผนที่แบบโต้ตอบ (Interactive Map) สำหรับแสดงพิกัดโครงการและจุดหลักฐาน
    ผลลัพธ์จะถูกสร้างเป็นไฟล์ HTML (Leaflet.js)
    """
    @staticmethod
    def generate_map(project_id, boundary_coords, evidence_points):
        """
        สร้างไฟล์ HTML แผนที่แสดงพื้นที่โครงการ (Polygon) และจุดข้อมูล (Markers)
        """
        map_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        </head>
        <body>
            <h3>Project Map: {project_id}</h3>
            <div id="map" style="height: 500px; width: 100%;"></div>
            <script>
                var map = L.map('map').setView([{boundary_coords[0][0]}, {boundary_coords[0][1]}], 15);
                L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png').addTo(map);
                
                // วาดเขตพื้นที่โครงการ
                var polygon = L.polygon({boundary_coords}, {{color: 'green'}}).addTo(map);
                map.fitBounds(polygon.getBounds());

                // วาดจุดหลักฐาน (Evidence Points)
                {chr(10).join([f"L.marker([{p['lat']}, {p['lng']}]).addTo(map).bindPopup('{p['type']}');" for p in evidence_points])}
            </script>
        </body>
        </html>
        """
        filename = f"map_{project_id}.html"
        with open(filename, "w") as f:
            f.write(map_html)
        return filename
