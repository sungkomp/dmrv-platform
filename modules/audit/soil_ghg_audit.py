class AWDVerificationService:
    """
    ระบบตรวจสอบเงื่อนไข 'นาเปียกสลับแห้ง' (AWD) ตามมาตรฐาน T-VER
    """
    @staticmethod
    def verify_compliance(awd_data_list):
        total_dry_days = 0
        max_depth_reached = 0
        has_photo_evidence = False
        
        for record in awd_data_list:
            payload = record.get('payload', {})
            
            # ตรวจสอบจากแหล่งข้อมูล (Source)
            source_str = str(record.get('source'))
            
            # 1. ตรวจสอบจากเซนเซอร์ IoT
            if "IOT_SENSOR" in source_str:
                water_level = payload.get('water_level_cm', 0)
                if water_level <= -15:
                    max_depth_reached = min(max_depth_reached, water_level)
                
                if payload.get('is_dry_day'):
                    total_dry_days += 1
            
            # 2. ตรวจสอบหลักฐานภาพถ่าย (จาก payload หรือ source)
            if "PHOTO" in str(record) or "PHOTO" in str(payload):
                has_photo_evidence = True

        # เกณฑ์การตัดสิน (Conditions)
        conditions = {
            "depth_ok": max_depth_reached <= -15,
            "dry_days_ok": total_dry_days >= 20,
            "evidence_ok": has_photo_evidence
        }
        
        is_compliant = all(conditions.values())
        
        return {
            "is_compliant": is_compliant,
            "details": conditions,
            "metrics": {
                "total_dry_days": total_dry_days,
                "max_depth_cm": max_depth_reached
            },
            "reduction_factor": 0.48 if is_compliant else 0.0
        }
