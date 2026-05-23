from dMRV.modules.logistics.logistics_module import LogisticsModule
from dMRV.modules.auth.security_utils import require_role

# เพิ่ม Decorator ลงไปใน LogisticsModule เพื่อทดสอบ
class SecureLogistics(LogisticsModule):
    @require_role("logistics")
    def process_request(self, service, action, **kwargs):
        return super().process_request(service, action, **kwargs)

# ทดสอบ
logistics = SecureLogistics()

# ลองเรียกด้วย Role ที่ถูกต้อง
print(f"Valid Access: {logistics.process_request(None, None, user_role='ProjectOwner')}")

# ลองเรียกด้วย Role ที่ผิด (ไม่มีสิทธิ์เข้า logistics)
print(f"Invalid Access: {logistics.process_request(None, None, user_role='CorporateBuyer')}")
