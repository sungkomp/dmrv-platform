from dMRV.modules.certification.cert_module import CertificationModule

cert = CertificationModule()

# 1. ส่งข้อมูลขอรับรองไป T-VER
submission = cert.process_request(None, 'submit', 
    reg_type='tver', 
    data={'project_id': 'PRJ-001', 'carbon_amount': 150.5}
)
print(f"Submission: {submission}")

# 2. ตรวจสอบสถานะ
status = cert.process_request(None, 'check', project_id='PRJ-001')
print(f"Status: {status}")
