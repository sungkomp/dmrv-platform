# dMRV Enterprise Platform: Technical Documentation

## 1. Project Overview
dMRV (Digital Monitoring, Reporting, and Verification) is an enterprise-grade platform for managing carbon credits. It ensures data integrity, PDPA compliance, and automated T-VER submission for various carbon methodologies.

## 2. Architecture Guidelines
- **Agentic Workflow**: Every operation is processed via an `Orchestrator` using modular agents (`SecurityAgent`, `Quantifier`, `Ledger`, etc.).
- **Data Integrity**: All ingestion uses digital signatures, and all final records are hashed via Merkle Roots.
- **Spatial Enforcement**: Every project must have registered `Boundary` coordinates. Spatial checks enforce anti-fraud and anti-overlap policies.
- **Methodology Registry**: All calculation parameters (emission factors, permanence) are stored in `core/carbon_parameters.py`.

## 3. Deployment Workflow
1. **Containerization**: Use the provided `Dockerfile` and `docker-compose.yml`.
2. **Environment**: Ensure `PYTHONPATH` includes the project root.
3. **Validation**: Run the full suite using:
   ```bash
   python3 test_modular_integration.py
   ```

## 4. Module Responsibilities
- `core/`: State management, Orchestration, Registry, and Constants.
- `modules/audit/`: Specific methodologies (Soil GHG/AWD, Biochar, Blue Carbon).
- `modules/spatial/`: Geographic boundary validation and spatial registry.
- `modules/certification/`: Official issuance and TGO/T-VER adaptor interface.
- `modules/marketplace/`: Credit trading and anti-double claiming retirement service.

## 5. Standard Operating Procedure (SOP)
1. **Register Project**: Define `project_boundary` in state.
2. **Data Ingestion**: Ingest multi-modal data with signatures.
3. **Quantification**: Run `Orchestrator` to execute validation pipeline.
4. **Issuance**: Automated certificate generation and TGO submission.
5. **Settlement**: Finalize financial transactions via `SettlementService`.
