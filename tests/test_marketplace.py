from dMRV.modules.marketplace.marketplace_module import MarketplaceModule

mkt = MarketplaceModule()

# ทดสอบ Mint
print(f"Mint: {mkt.process_request(None, 'mint', token_id='CREDIT-001')}")

# ทดสอบ Trade
print(f"Trade: {mkt.process_request(None, 'trade', token_id='CREDIT-001', buyer='Corp_A')}")

# ทดสอบ Retire
print(f"Retire: {mkt.process_request(None, 'retire', token_id='CREDIT-001')}")
