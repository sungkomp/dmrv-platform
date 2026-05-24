from .registry import CertificateRegistry

class CertificationService:
    def __init__(self):
        self.registry = CertificateRegistry()

    def issue_certificate(self, project_id, track_type, audit_report):
        if audit_report.get("status") != "PASSED":
            return {"error": "Audit report status is not PASSED"}
        
        cert_data = {
            "type": track_type.upper(),
            "scope": audit_report.get("methodology"),
            "amount_tco2e": audit_report.get("amount_tco2e"),
            "validator": audit_report.get("validator", "System-Auto-Validator")
        }
        
        return self.registry.register(project_id, cert_data)

    def issue_master_certificate(self, project_id, sub_certificates_data):
        """
        ออกใบรับรองหลัก (Master Certificate) ที่รวมใบรับรองย่อยหลายรายการ
        """
        master_cert_data = {
            "type": "MASTER_GHG_CERTIFICATE",
            "sub_certificates": sub_certificates_data,
            "total_tco2e": sum(c.get("amount_tco2e", 0) for c in sub_certificates_data),
            "total_count": len(sub_certificates_data)
        }
        
        return self.registry.register(project_id, master_cert_data)
