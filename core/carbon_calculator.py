class CarbonCalculator:
    @staticmethod
    def get_stability_factor(h_c_ratio):
        # มาตรฐานสมมติ: H/C < 0.4 มีความเสถียรสูงมาก
        if h_c_ratio < 0.4:
            return 0.9
        elif h_c_ratio < 0.7:
            return 0.7
        else:
            return 0.5

    @staticmethod
    def calculate_sequestration_tco2e(mass_t, carbon_fraction, h_c_ratio):
        stability = CarbonCalculator.get_stability_factor(h_c_ratio)
        carbon_ton = mass_t * carbon_fraction * stability
        # tCO2e = Ton C * 3.667 (มวลโมเลกุล CO2/C)
        return round(carbon_ton * 3.667, 3)
