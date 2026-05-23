# RBAC Definitions
ROLES = {
    "ADMIN": "Admin",
    "AUDITOR": "Auditor",
    "PROJECT_OWNER": "ProjectOwner",
    "CORPORATE_BUYER": "CorporateBuyer",
    "DATA_PROVIDER": "DataProvider"
}

# Define what each role can access (Modular Level)
ROLE_PERMISSIONS = {
    ROLES["ADMIN"]: ["all"],
    ROLES["AUDITOR"]: ["audit", "reporting", "verification", "governance"],
    ROLES["PROJECT_OWNER"]: ["logistics", "ingestion", "submission", "customer"],
    ROLES["CORPORATE_BUYER"]: ["marketplace", "customer", "reporting"],
    ROLES["DATA_PROVIDER"]: ["ingestion", "logistics"]
}
