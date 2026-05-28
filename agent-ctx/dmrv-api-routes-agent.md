# Task: Create dMRV Carbon Credit Platform API Routes

## Summary
Successfully created all 16 backend API route files for the dMRV (Digital Measurement, Reporting & Verification) carbon credit platform. All routes compile and return proper JSON responses.

## Files Created

| # | Route | File | Methods |
|---|-------|------|---------|
| 1 | `/api/dmrv` | `src/app/api/dmrv/route.ts` | GET (projects+stats), POST (orchestrator workflow) |
| 2 | `/api/dmrv/ingestion` | `src/app/api/dmrv/ingestion/route.ts` | GET (list logs), POST (ingest with adaptor pattern) |
| 3 | `/api/dmrv/auth` | `src/app/api/dmrv/auth/route.ts` | GET (RBAC roles), POST (validate access) |
| 4 | `/api/dmrv/carbon` | `src/app/api/dmrv/carbon/route.ts` | GET (list credits), POST (calculate+create) |
| 5 | `/api/dmrv/certification` | `src/app/api/dmrv/certification/route.ts` | GET (list certs), POST (submit/approve/reject T-VER) |
| 6 | `/api/dmrv/verification` | `src/app/api/dmrv/verification/route.ts` | POST (cross-modal validation) |
| 7 | `/api/dmrv/monitoring` | `src/app/api/dmrv/monitoring/route.ts` | GET (health+alerts), POST (create alert) |
| 8 | `/api/dmrv/reporting` | `src/app/api/dmrv/reporting/route.ts` | GET (project reports), POST (sustainability report) |
| 9 | `/api/dmrv/marketplace` | `src/app/api/dmrv/marketplace/route.ts` | GET (marketplace), POST (mint/trade/retire) |
| 10 | `/api/dmrv/logistics` | `src/app/api/dmrv/logistics/route.ts` | GET (tracking+settlements), POST (tracking/inventory/settlement) |
| 11 | `/api/dmrv/governance` | `src/app/api/dmrv/governance/route.ts` | GET (methodologies+rules), POST (add/update methodology) |
| 12 | `/api/dmrv/submission` | `src/app/api/dmrv/submission/route.ts` | GET (list submissions), POST (create submission) |
| 13 | `/api/dmrv/audit` | `src/app/api/dmrv/audit/route.ts` | GET (audit logs), POST (domain-specific audit) |
| 14 | `/api/dmrv/footprint` | `src/app/api/dmrv/footprint/route.ts` | GET (emission factors), POST (calculate footprint) |
| 15 | `/api/dmrv/simulation` | `src/app/api/dmrv/simulation/route.ts` | POST (run simulations: awd/biogas/solar/biochar/footprint) |
| 16 | `/api/dmrv/initialize` | `src/app/api/dmrv/initialize/route.ts` | POST (seed demo data) |

## Key Implementation Details

### Orchestrator Workflow (POST /api/dmrv)
Runs 8 agent steps in sequence, each creating an AuditLog entry:
1. **SecurityAgent**: Validates signatures, sanitizes data
2. **ClassificationAgent**: Detects PII patterns, checks PDPA consent, classifies PUBLIC/CONFIDENTIAL
3. **EncryptionAgent**: SHA-256 integrity hash, encrypts CONFIDENTIAL data
4. **ExistenceVerifier**: Checks ≥2 source types for cross-validation
5. **CarbonQuantifier**: Calculates tCO2e by methodology, freshness check
6. **ContractGuard**: Double-claiming registry check + rights verification
7. **LedgerAgent**: Creates ledger entry with Merkle root
8. **ReportingAgent**: Generates audit report

### Carbon Quantification Formulas
- **Biochar**: `mass × carbon_fraction × stability × 3.667`
- **AWD**: `baseline × mitigation_factor × area`
- **Biogas**: `CH4_capture + fuel_displacement`
- **Solar**: `(kWh / 1000) × gridEF`

### Seed Data (POST /api/dmrv/initialize)
3 demo projects with Thai names:
1. Blue Carbon (T-VER-FOREST, 500ha)
2. Biochar (IPCC-2023, 50ha)
3. Solar (IPCC-2023, 200ha)
Plus: 7 plots, 8 ingestion logs, 5 credits, 3 certificates, 3 submissions, 5 audit logs, 3 alerts, 2 settlements

### RBAC (GET /api/dmrv/auth)
6 roles: admin, validator, project_developer, buyer, auditor, viewer
Each with granular permissions across 13 modules

### Emission Factors (GET /api/dmrv/footprint)
16 emission factors across Scope 1, 2, 3 from IPCC, DEFRA, EGAT sources

## Testing
All routes tested successfully with curl. Database seeded and verified.
