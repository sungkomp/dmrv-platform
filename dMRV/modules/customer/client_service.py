class ClientService:
    def __init__(self):
        # จำลองฐานข้อมูลลูกค้าและเครดิตที่ถือครอง
        self.portfolios = {
            "CLIENT-001": [
                {"token_id": "CREDIT-001", "project": "Mangrove A", "status": "Available", "location": "13.75, 100.5"},
                {"token_id": "CREDIT-002", "project": "Mangrove A", "status": "Retired", "location": "13.75, 100.5"}
            ]
        }

    def get_portfolio(self, client_id):
        return self.portfolios.get(client_id, [])
