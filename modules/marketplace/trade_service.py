import uuid
from datetime import datetime

class TradeService:
    """
    Advanced Carbon Credit Trading Service.
    Manages the lifecycle of credits in the marketplace.
    """
    def __init__(self):
        self.credits = {} # token_id: data
        self.trade_history = []

    def list_credit(self, token_id, project_id, amount, price, owner):
        if token_id in self.credits: return {"error": "Already listed"}
        self.credits[token_id] = {
            "project_id": project_id,
            "total": amount,
            "available": amount,
            "price": price,
            "owner": owner,
            "status": "AVAILABLE"
        }
        return {"status": "LISTED", "token_id": token_id}

    def execute_trade(self, token_id, buyer_id, quantity):
        credit = self.credits.get(token_id)
        if not credit or credit["available"] < quantity:
            return {"error": "Invalid trade request"}
            
        credit["available"] -= quantity
        trade_id = f"TRD-{uuid.uuid4().hex[:8].upper()}"
        record = {"trade_id": trade_id, "buyer": buyer_id, "qty": quantity, "ts": datetime.now().isoformat()}
        self.trade_history.append(record)
        return {"status": "SUCCESS", "trade_id": trade_id}

    def retire_credit(self, token_id, quantity, reason):
        # Prevent double spending by burning credits
        credit = self.credits.get(token_id)
        if not credit or credit["available"] < quantity:
            return {"error": "Invalid retirement request"}
            
        credit["available"] -= quantity
        retire_id = f"RET-{uuid.uuid4().hex[:8].upper()}"
        return {"status": "RETIRED", "retire_id": retire_id, "qty": quantity, "reason": reason}
