# Contributing to dMRV

Thank you for your interest in contributing to the dMRV platform!

## Guidelines
1. **Modular Development**: All new features must be implemented as independent modules under `dMRV/modules/`.
2. **Standard API**: Ensure all modules implement the `process_request` API.
3. **Security**: Always use the `@require_role` decorator for new API endpoints.
4. **Testing**: Add test cases to the `tests/` directory for every new feature.

## Development Setup
1. Clone the repo: `git clone https://github.com/sungkomp/dmrv-platform.git`
2. Install requirements: `pip install sqlalchemy`
3. Run tests: `pytest` or execute scripts in `tests/`

For support or questions, please contact the maintainer at [your-email].
