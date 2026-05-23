from dMRV.core.database import init_db, SessionLocal, Project, CarbonCredit

# Initialize tables
init_db()

# Test adding data
db = SessionLocal()
new_project = Project(id="PRJ-001", name="Mangrove A", methodology="IPCC-2023")
db.add(new_project)
db.commit()

# Verify
project = db.query(Project).filter_by(id="PRJ-001").first()
print(f"Project saved: {project.name}, Methodology: {project.methodology}")
db.close()
