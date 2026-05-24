# dMRV Enterprise Platform

A modular, scalable, and secure Digital Measurement, Reporting, and Verification (dMRV) platform designed for carbon credit management, compliant with T-VER/TGO standards.

## Architecture Overview
The platform employs a Pluggable Modular Architecture where core orchestration logic is decoupled from specialized domain modules.
- **Core Orchestration**: Agent-based workflow (Security, Classification, Verification, Quantifier, Ledger).
- **Domain Modules**: Audit services for Soil GHG, Blue Carbon, Biogas, Biochar, and Waste Management.
- **Reporting & Marketplace**: Advanced audit report generation and integrated carbon credit trading/retirement.
- **Spatial Verification**: Spatial fencing to prevent geo-spoofing.

## Quick Start
1. **Prerequisites**: Install Docker and Docker Compose.
2. **Setup**:
   ```bash
   git clone <repo-url>
   cd dMRV_upload
   docker-compose up --build
   ```

## Workflow Execution
The system uses an Orchestrator pattern. To run a full integration test:
```bash
export PYTHONPATH=$PYTHONPATH:.
python3 test_modular_integration.py
```

## Compliance & Standards
- **T-VER Integration**: Automatic submission to TGO API via `TVERAdaptor`.
- **PDPA Compliance**: Automated PII detection and encryption.
- **Anti-Double Claiming**: Ledger-based issuance and credit retirement.

## Deployment
Use the provided `docker-compose.yml` for local deployment or containerized environments.
