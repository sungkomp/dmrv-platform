from dMRV.modules.submission.submission_module import SubmissionModule

sub = SubmissionModule()

# รวมข้อมูลจากโมดูลอื่นๆ มาสร้างเป็น Form
mock_data = {
    "carbon_credit": 150.5,
    "logistics_summary": {"status": "Verified"},
    "audit_hash": "0xABC123"
}

form = sub.process_request(None, 'create', project_id='PRJ-001', data=mock_data)
print(f"Submission Form: {form}")
