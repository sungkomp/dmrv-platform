from functools import wraps
from dMRV.modules.auth.rbac_rules import ROLE_PERMISSIONS

def require_role(required_module):
    def decorator(func):
        @wraps(func)
        def wrapper(self, service, action, **kwargs):
            # ดึง user_role จาก context (จำลอง)
            user_role = kwargs.get("user_role")
            
            permissions = ROLE_PERMISSIONS.get(user_role, [])
            if "all" in permissions or required_module in permissions:
                return func(self, service, action, **kwargs)
            else:
                return {"error": f"Access Denied: {user_role} cannot access {required_module}"}
        return wrapper
    return decorator
