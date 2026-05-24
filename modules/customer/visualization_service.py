class VisualizationService:
    def get_digital_twin_data(self, project_id):
        # รวบรวมพิกัด 3 มิติ และชั้นข้อมูล Layer ต่างๆ
        return {
            "project_id": project_id,
            "satellite_layer": {
                "source": "Sentinel-2",
                "type": "Raster_Tile",
                "url": f"https://api.sat-provider.com/tiles/{project_id}/{{z}}/{{x}}/{{y}}",
                "opacity": 0.8
            },
            "terrain_layer": {
                "source": "LiDAR_Scan_01",
                "format": "3D_Mesh_GLB",
                "url": "/assets/models/mangrove_terrain.glb"
            },
            "sensor_overlays": [
                {
                    "sensor_id": "IOT_001",
                    "position": {"x": 100.501, "y": 13.751, "z": 5.2},
                    "value": 25.5,
                    "type": "biomass_density"
                }
            ],
            "drone_flight_path": [
                {"lat": 13.75, "lon": 100.5, "alt": 50},
                {"lat": 13.751, "lon": 100.501, "alt": 50}
            ]
        }
