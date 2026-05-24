class InventoryService:
    def __init__(self):
        self.inventory = {}

    def update_stock(self, item_id, quantity):
        self.inventory[item_id] = self.inventory.get(item_id, 0) + quantity
        return True

    def get_stock(self, item_id):
        return self.inventory.get(item_id, 0)
