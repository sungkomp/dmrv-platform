class SettlementService:
    def __init__(self):
        self.settlements = []

    def process_settlement(self, asset_id, amount):
        record = {"asset_id": asset_id, "amount": amount, "status": "processed"}
        self.settlements.append(record)
        return record
