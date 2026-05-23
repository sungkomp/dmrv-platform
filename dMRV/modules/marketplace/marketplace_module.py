from .trade_service import TradeService

class MarketplaceModule:
    def __init__(self):
        self.trade = TradeService()
    
    def process_request(self, service, action, **kwargs):
        """API สำหรับการซื้อขายเครดิตคาร์บอน"""
        if hasattr(self.trade, action):
            method = getattr(self.trade, action)
            return {"status": "success", "data": method(**kwargs)}
        return {"error": "Action not supported"}
