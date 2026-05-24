import json
from datetime import datetime
from dMRV.modules.audit.soil_ghg_audit import SoilGHGAuditService
from dMRV.modules.audit.biogas_audit import BiogasAuditService
from dMRV.modules.footprint.service import FootprintService

class SimulationService:
    @staticmethod
    def simulate_reduction(activity_type, params, **kwargs):
        if activity_type == "awd":
            return SoilGHGAuditService.verify_awd_reduction(params, baseline_emission=5.0, area_ha=kwargs.get("area_ha", 1.0))
        elif activity_type == "biogas":
            return BiogasAuditService.verify_biogas_reduction(params.get("payload", {}))
        return {"status": "ERROR", "message": "Unknown activity"}

    @staticmethod
    def simulate_footprint(scope, activity, qty):
        service = FootprintService()
        return service.calculate_footprint(scope, activity, qty)

    @staticmethod
    def export_snapshot(simulation_data, filename=None):
        """
        บันทึกผลการประเมินลงไฟล์ JSON เพื่อเก็บเป็น Snapshot ประจำตัวผู้ใช้
        """
        if not filename:
            filename = f"pre_assessment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(simulation_data, f, indent=4)
        
        return filename
