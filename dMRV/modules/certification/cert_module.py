from .adaptors.tver_adapter import TverRegistryAdaptor

class StatusService:
    def __init__(self):
        self.certifications = {} # project_id: cert_info

    def update(self, project_id, info):
        self.certifications[project_id] = info

    def get_cert(self, project_id):
        return self.certifications.get(project_id)

class CertificationModule:
    def __init__(self):
        self.adaptors = {"tver": TverRegistryAdaptor()}
        self.status = StatusService()
    
    def process_request(self, service, action, **kwargs):
        """API หลักสำหรับคุยกับ Registry ภายนอก"""
        # กรณี Submission
        if action == "submit":
            reg_type = kwargs.get("reg_type")
            if reg_type in self.adaptors:
                res = self.adaptors[reg_type].submit_project(kwargs.get("data"))
                self.status.update(kwargs.get("data").get("project_id"), res)
                return {"status": "success", "data": res}
        
        # กรณี Check Status
        if action == "check":
            return {"status": "success", "data": self.status.get_cert(kwargs.get("project_id"))}
            
        return {"error": "Action not supported"}
