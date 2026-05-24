class PlotRegistry:
    def __init__(self):
        # โครงสร้าง: { plot_id: { coords: [], tracks: { "biochar": status, "awd": status } } }
        self.registered_plots = {}

    def register_track(self, plot_id, coordinates, track_type):
        if plot_id not in self.registered_plots:
            self.registered_plots[plot_id] = {"coords": coordinates, "tracks": {}}
        
        self.registered_plots[plot_id]["tracks"][track_type] = "REGISTERED"
        print(f"Plot {plot_id} registered for track: {track_type}")

    def is_track_active(self, plot_id, track_type):
        return self.registered_plots.get(plot_id, {}).get("tracks", {}).get(track_type) == "REGISTERED"

    def get_all_plots(self):
        return self.registered_plots
