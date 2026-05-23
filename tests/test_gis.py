from dMRV.modules.customer.customer_module import CustomerModule

cust = CustomerModule()

# ทดสอบดึงข้อมูล GIS (Satellite + 3D)
gis_data = cust.process_request(None, 'get_gis_data', project_id='PRJ-001')
print(f"GIS Data Payload: {gis_data}")
