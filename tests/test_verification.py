from dMRV.modules.verification.verification_module import VerificationModule

verify_mod = VerificationModule()

# ทดสอบ Verify ผลลัพธ์รวม
result = verify_mod.process_request('verify', 'cross_check', project_id='PRJ-001', evidence_root='ROOT-SHA-999')
print(f"Verification Result: {result}")
