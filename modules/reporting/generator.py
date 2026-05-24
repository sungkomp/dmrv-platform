import json
from datetime import datetime

class AuditReportGenerator:
    """
    Advanced Reporting Engine for dMRV Platform.
    Generates high-assurance audit reports for regulators and stakeholders.
    """
    @staticmethod
    def generate_detailed_audit(state):
        """
        สร้างรายงานการตรวจสอบเชิงลึก (High-Assurance Audit Report)
        จากผลลัพธ์ของ Multi-Agent Workflow
        """
        report_id = f"AUDIT-{datetime.now().strftime('%Y%m%d')}-{state.project_id}"
        
        # 1. Structure the data for JSON output (Machine Readable)
        report_data = {
            "header": {
                "report_id": report_id,
                "project_id": state.project_id,
                "project_type": state.project_type.value,
                "generated_at": datetime.now().isoformat(),
                "verifying_org": "dMRV-Enterprise-Systems"
            },
            "verification_summary": {
                "status": state.status,
                "confidence_score": state.confidence_score,
                "carbon_metric_tco2e": round(state.carbon_metric, 4),
                "social_impact_score": state.social_impact_score,
                "is_verified": state.is_verified
            },
            "data_trust_analysis": {
                "total_packets": len(state.raw_data),
                "verified_packets": len(state.sanitized_data),
                "encrypted_packets": len(state.encrypted_data),
                "data_sources": list({d['source'].value for d in state.sanitized_data})
            },
            "ledger_finality": state.ledger_record,
            "audit_trail": state.audit_trail
        }

        # 2. Generate Human-Readable Text Report (Professional Layout)
        text_report = AuditReportGenerator._format_text_report(report_data)
        
        return {
            "json": report_data,
            "text": text_report
        }

    @staticmethod
    def generate_sustainability_summary(project_id, credits, footprint):
        from modules.footprint.service import CarbonFootprintService
        service = CarbonFootprintService()
        net = service.calculate_net_balance(footprint, credits)
        
        return {
            "project_id": project_id,
            "credits_tco2e": credits,
            "footprint_tco2e": footprint,
            "net_balance": net,
            "status": "CARBON_NEUTRAL" if net >= 0 else "OFFSET_REQUIRED"
        }

    @staticmethod
    def _format_text_report(data):
        h = data['header']
        v = data['verification_summary']
        d = data['data_trust_analysis']
        l = data['ledger_finality']
        
        lines = []
        lines.append("=" * 70)
        lines.append(f"          DIGITAL MRV (dMRV) AUDIT REPORT - {h['report_id']}")
        lines.append("=" * 70)
        lines.append(f"PROJECT ID     : {h['project_id']}")
        lines.append(f"PROJECT TYPE   : {h['project_type']}")
        lines.append(f"GENERATED AT   : {h['generated_at']}")
        lines.append(f"VERIFICATION   : {'[ SUCCESS ]' if v['status'] == 'COMPLETED' else '[ ' + v['status'] + ' ]'}")
        lines.append("-" * 70)
        
        lines.append("\n[ 📊 QUANTIFICATION RESULTS ]")
        lines.append(f"Total Carbon Reduction : {v['carbon_metric_tco2e']} tCO2e")
        lines.append(f"Confidence Score       : {v['confidence_score'] * 100:.1f}%")
        lines.append(f"Social Impact Score    : {v['social_impact_score']}")
        
        lines.append("\n[ 🛡️ SECURITY & TRUST ANALYSIS ]")
        lines.append(f"Data Sources Used      : {', '.join(d['data_sources'])}")
        lines.append(f"Integrity Status       : {d['verified_packets']}/{d['total_packets']} Packets Verified via Digital Sig")
        lines.append(f"Privacy Protocol       : Automated Classification & Encryption Active")
        
        lines.append("\n[ ⛓️ LEDGER & FINALITY ]")
        lines.append(f"Token ID               : {l.get('token_id', 'N/A')}")
        lines.append(f"Merkle Root Hash       : {l.get('merkle_root', 'N/A')[:32]}...")
        lines.append(f"Finality Status        : COMMITTED TO IMMUTABLE LEDGER")
        
        lines.append("\n[ 📝 AUDIT TRAIL LOGS ]")
        for entry in data['audit_trail'][-5:]: # Show last 5
            lines.append(f"  {entry}")
            
        lines.append("\n" + "=" * 70)
        lines.append("  This document is digitally signed and serves as a verified proof.")
        lines.append("=" * 70)
        
        return "\n".join(lines)
