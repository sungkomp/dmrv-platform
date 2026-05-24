class BaseRegistryAdaptor:
    def submit_project(self, project_data):
        raise NotImplementedError("Adaptor must implement submit_project")
    
    def check_status(self, cert_id):
        raise NotImplementedError("Adaptor must implement check_status")

class TverRegistryAdaptor(BaseRegistryAdaptor):
    def submit_project(self, project_data):
        # จำลองการส่งข้อมูลไป T-VER API
        print(f"Submitting to T-VER: {project_data['project_id']}")
        return {"external_cert_id": "TVER-2026-001", "status": "SUBMITTED"}

    def check_status(self, cert_id):
        return {"cert_id": cert_id, "status": "APPROVED"}
