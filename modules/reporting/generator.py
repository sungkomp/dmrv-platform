class ReportingService:
    @staticmethod
    def generate_sustainability_report(project_id, total_footprint, total_credits):
        """
        สร้างรายงานสรุป Net Carbon Balance
        """
        net_balance = total_credits - total_footprint
        
        report = {
            "project_id": project_id,
            "summary": {
                "total_emissions_tco2e": total_footprint,
                "total_reduction_tco2e": total_credits,
                "net_carbon_balance": round(net_balance, 3)
            },
            "status": "CARBON_NEUTRAL" if net_balance >= 0 else "OFFSET_REQUIRED",
            "generated_at": "2026-05-23T15:00:00Z"
        }
        
        # แสดงผลลัพธ์
        print(f"--- Sustainability Report for {project_id} ---")
        print(f"Total Footprint: {report['summary']['total_emissions_tco2e']} tCO2e")
        print(f"Total Reduction: {report['summary']['total_reduction_tco2e']} tCO2e")
        print(f"Net Balance: {report['summary']['net_carbon_balance']} tCO2e")
        print(f"Status: {report['status']}")
        
        return report
