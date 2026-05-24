from datetime import datetime

class SettlementService:
    """
    Settlement Service: เชื่อมต่อผลการตรวจสอบ (Audit Result) เข้าสู่ระบบบัญชีการเงิน
    """
    def __init__(self):
        self.ledger = []

    def settle_credit(self, token_id, carbon_amount, price_per_ton):
        """ดำเนินการจ่ายเงินและตัดยอดเครดิตคาร์บอน"""
        settlement_id = f"SET-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        total_payment = carbon_amount * price_per_ton
        
        record = {
            "settlement_id": settlement_id,
            "token_id": token_id,
            "total_payment": total_payment,
            "status": "PAID",
            "timestamp": datetime.now().isoformat()
        }
        self.ledger.append(record)
        return record

class LogisticsModule:
    """
    จัดการการเคลื่อนย้ายสินทรัพย์และการตั้งถิ่นฐาน (Settlement) ของโครงการ
    """
    def __init__(self):
        self.settlement = SettlementService()

    def process_request(self, service, action, **kwargs):
        if action == "settle":
            return self.settlement.settle_credit(
                kwargs.get("token_id"),
                kwargs.get("carbon_amount"),
                kwargs.get("price")
            )
        return {"error": "Action not supported"}
