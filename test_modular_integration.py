from core.state_manager import VerificationState
from core.constants import ProjectType, ThaiRegion, DataSource
from core.orchestrator import Orchestrator
import json

def test_production_integration():
    """
    Test the integrated system across Thai regions and project types.
    """
    orch = Orchestrator()
    results = []
    
    # 1. Test South Blue Carbon
    s1 = VerificationState("PROD-TH-SOUTH-01", ProjectType.BLUE_CARBON, ThaiRegion.SOUTH, True)
    s1.data['project_boundary'] = [(5.0, 99.0), (5.0, 99.2), (5.2, 99.2), (5.2, 99.0)]
    s1.data['raw_data'] = [
        {"source": DataSource.SATELLITE, "payload": {"area_ha": 500, "lat": 5.1, "long": 99.1}, "signature": "SIG_VALID_1"},
        {"source": DataSource.DRONE_LIDAR, "payload": {"area_ha": 490, "lat": 5.15, "long": 99.15}, "signature": "SIG_VALID_2"}
    ]
    orch.run_workflow(s1)
    results.append(s1)
    
    # 2. Test North Biochar
    s2 = VerificationState("PROD-TH-NORTH-02", ProjectType.BIOCHAR_PYROLYSIS, ThaiRegion.NORTH, True)
    s2.data['project_boundary'] = [(18.0, 98.0), (18.0, 98.2), (18.2, 98.2), (18.2, 98.0)]
    s2.data['raw_data'] = [
        {"source": DataSource.IOT_SENSOR, "payload": {"biochar_ton": 250, "lat": 18.1, "long": 98.1}, "signature": "SIG_VALID_3"},
        {"source": DataSource.AGRI_LOG, "payload": {"type": "corn_cob"}, "signature": "SIG_VALID_4"}
    ]
    orch.run_workflow(s2)
    results.append(s2)

    # 3. Test Central AWD Rice (Success)
    s3 = VerificationState("PROD-TH-AWD-SUCCESS", ProjectType.AGRI_LOW_CARBON, ThaiRegion.CENTRAL, True)
    s3.data['raw_data'] = [
        {"source": DataSource.IOT_SENSOR, "payload": {"area_ha": 100, "water_level_cm": -18, "is_dry_day": True}, "signature": "SIG_VALID_5"},
        {"source": "MANUAL_SURVEY", "payload": {"type": "PHOTO_EVIDENCE", "gps": "14.5, 100.2"}, "signature": "SIG_VALID_6"}
    ]
    # Simulate 20 dry days by duplicating data or adjusting logic in test
    for _ in range(19): s3.data['raw_data'].append({"source": DataSource.IOT_SENSOR, "payload": {"is_dry_day": True, "water_level_cm": -16}, "signature": "SIG_VALID_5"})
    orch.run_workflow(s3)

    # 4. Test Central AWD Rice (Failure - No dry days)
    s4 = VerificationState("PROD-TH-AWD-FAIL", ProjectType.AGRI_LOW_CARBON, ThaiRegion.CENTRAL, True)
    s4.data['raw_data'] = [
        {"source": DataSource.IOT_SENSOR, "payload": {"area_ha": 100, "water_level_cm": 5, "is_dry_day": False}, "signature": "SIG_VALID_7"}
    ]
    orch.run_workflow(s4)

    # 6. Test Central Soil GHG + Biochar
    s6 = VerificationState("PROD-TH-SOIL-06", ProjectType.SOIL_GHG, ThaiRegion.CENTRAL, True)
    s6.data['raw_data'] = [
        {"source": DataSource.AGRI_LOG, "payload": {"biochar_ton": 50, "depth_cm": 20}, "signature": "SIG_VALID_8"},
        {"source": DataSource.MANUAL_SURVEY, "payload": {"type": "GPS_COORDS", "lat": 14.0, "long": 100.0}, "signature": "SIG_VALID_9"}
    ]
    orch.run_workflow(s6)

    print("\n" + "="*50)
    print("INTEGRATION TEST RESULTS")
    print("="*50)
    for s in [s1, s2, s3, s4, s6]:
        status_icon = "✅" if s.carbon_metric > 0 else "❌"
        print(f"{status_icon} Project: {s.project_id:20} | Status: {s.status:10} | Carbon: {s.carbon_metric:8.2f} tCO2e")

    # 7. Test Net Carbon Balance (Footprint vs Credits)
    from modules.footprint.service import CarbonFootprintService
    fp_service = CarbonFootprintService()
    
    # สมมติมี Footprint จากการใช้ไฟฟ้าและน้ำมันในโครงการ
    project_emissions = fp_service.calculate_emissions({"diesel_liter": 500, "electricity_kwh": 2000})
    credits_generated = results[-1].carbon_metric
    
    net_balance = fp_service.calculate_net_balance(project_emissions, credits_generated)
    
    print("\n" + "-"*30 + " SUSTAINABILITY SUMMARY " + "-"*30)
    print(f"Project Emissions  : {project_emissions} tCO2e")
    print(f"Credits Generated  : {credits_generated:.2f} tCO2e")
    print(f"Net Carbon Balance : {net_balance:.2f} tCO2e")
    print(f"Status             : {'NEUTRAL' if net_balance >= 0 else 'NEED OFFSET'}")

if __name__ == "__main__":
    test_production_integration()
