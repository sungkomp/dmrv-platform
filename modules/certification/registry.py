import uuid
from datetime import datetime

class CertificateRegistry:
    def __init__(self):
        self._certificates = {}

    def register(self, project_id, cert_data):
        cert_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        entry = {
            "cert_id": cert_id,
            "project_id": project_id,
            "issued_at": datetime.utcnow().isoformat(),
            "data": cert_data
        }
        self._certificates[cert_id] = entry
        print(f"Certificate {cert_id} issued for project {project_id}")
        return cert_id
