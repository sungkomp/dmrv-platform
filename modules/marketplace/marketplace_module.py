from .trade_service import TradeService

class MarketplaceModule:
    def __init__(self):
        self.trade = TradeService()
    
    def process_request(self, service, action, **kwargs):
        """
        Marketplace Gateway API.
        Supported actions: list_credit, execute_trade, retire_credit
        """
        if hasattr(self.trade, action):
            method = getattr(self.trade, action)
            res = method(**kwargs)
            if "error" in res: return res
            return {"status": "success", "data": res}
        return {"error": f"Action '{action}' not supported"}
