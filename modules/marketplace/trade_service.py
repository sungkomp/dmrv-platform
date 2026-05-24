class TradeService:
    def __init__(self):
        self.registry = {} # token_id: status (Available, Traded, Retired)

    def mint(self, token_id):
        self.registry[token_id] = "Available"
        return {"token_id": token_id, "status": "Available"}

    def trade(self, token_id, buyer):
        if self.registry.get(token_id) == "Available":
            self.registry[token_id] = "Traded"
            return {"token_id": token_id, "buyer": buyer, "status": "Traded"}
        return {"error": "Not available for trade"}

    def retire(self, token_id):
        self.registry[token_id] = "Retired"
        return {"token_id": token_id, "status": "Retired"}
