from dMRV.modules.monitoring.monitoring_module import MonitoringModule

mon = MonitoringModule()

# ทดสอบ Health Metrics
print(f"Metrics: {mon.process_request('health', 'get_metrics')}")

# ทดสอบ Trigger Alert
print(f"Alert: {mon.process_request('alert', 'trigger', severity='critical', message='Sensor-01 disconnected')}")
