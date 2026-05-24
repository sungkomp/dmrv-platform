from dMRV.core.emission_factors import EmissionFactorRegistry

class FootprintService:
    def calculate_footprint(self, scope, activity_type, quantity):
        ef = EmissionFactorRegistry.get_factor(activity_type)
        return {
            "scope": scope,
            "activity": activity_type,
            "tco2e": round(quantity * ef, 4)
        }

    def aggregate_footprint(self, activities_list):
        total = sum(self.calculate_footprint(a['scope'], a['type'], a['qty'])['tco2e'] for a in activities_list)
        return {"total_footprint_tco2e": total}
