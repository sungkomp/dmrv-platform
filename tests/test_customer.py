from dMRV.modules.customer.customer_module import CustomerModule

cust = CustomerModule()

# ทดสอบตรวจสอบ Dashboard ของลูกค้า
dashboard = cust.process_request(None, 'get_dashboard', client_id='CLIENT-001')
print(f"Customer Dashboard: {dashboard}")
