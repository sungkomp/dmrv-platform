# dMRV Enterprise Platform

A modular, scalable, and secure Digital Measurement, Reporting, and Verification (dMRV) platform designed for carbon credit management.

## Architecture Overview
The platform employs a **Pluggable Modular Architecture** where core orchestration logic is decoupled from specialized domain modules. This allows for independent development, testing, and deployment of features.

### Core Structure
- **`dMRV/core/`**: Centralized orchestration, state management, and base interfaces.
- **`dMRV/modules/`**: Independent domain modules.

### Security & Privacy Features
- **Automated Classification**: Detects Direct PII (Email, Phone, ID) and Indirect PII (GPS, IoT ID, Wallet) using regex patterns.
- **PDPA Compliance**: Mandatory `consent_granted` check before processing any PII. Violations result in immediate workflow termination.
- **Automated Encryption**: Confidential data is automatically encrypted (AES-256) before further processing.
- **Data Integrity**: SHA-256 cryptographic hashing of raw evidence ensures immutability and auditability.

## Quick Start

1. **Environment Setup:**
   ```bash
   pip install sqlalchemy
   ```

2. **Database Initialization:**
   ```bash
   export PYTHONPATH=.
   python3 dMRV/core/database.py
   ```

3. **Running Simulations:**
   ```bash
   # Run the modular workflow
   python3 dMRV/test_modular_workflow.py

   # Run individual module tests
   python3 dMRV/test_ingestion.py
   python3 dMRV/test_certification.py
   ```

## Development
- Add new domains by creating a new directory under `dMRV/modules/`.
- Ensure all modules implement the `process_request` API.
- Secure endpoints using the `@require_role` decorator from `dMRV/modules/auth/security_utils.py`.

## License
MIT
