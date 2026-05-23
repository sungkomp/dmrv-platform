from dMRV.modules.auth.security_utils import require_role

class AuthModule:
    @require_role("auth")
    def process_request(self, service, action, **kwargs):
        return {"status": "success", "message": "Authenticated"}
