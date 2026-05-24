class TrackingService:
    def __init__(self):
        self.active_tracks = {}

    def update_position(self, asset_id, lat, lon):
        self.active_tracks[asset_id] = {"lat": lat, "lon": lon}
        return True

    def get_location(self, asset_id):
        return self.active_tracks.get(asset_id)
