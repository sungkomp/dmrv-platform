class FormService:
    def create_submission_form(self, project_id, data_package):
        # รวบรวมข้อมูลจากโมดูลต่างๆ มาใส่ใน Form มาตรฐาน
        return {
            "submission_id": f"SUB-{project_id}",
            "metadata": {
                "project_id": project_id,
                "timestamp": "2026-05-22T08:00:00Z"
            },
            "payload": data_package,
            "status": "READY_FOR_VERIFICATION"
        }

class SubmissionModule:
    def __init__(self):
        self.form = FormService()
    
    def process_request(self, service, action, **kwargs):
        if action == "create":
            return {"status": "success", "data": self.form.create_submission_form(
                kwargs.get("project_id"), kwargs.get("data")
            )}
        return {"error": "Action not supported"}
