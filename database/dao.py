from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from .models import Base, Plot, IngestionLog, Certificate

class DataAccessObject:
    def __init__(self, db_url='sqlite:///dmrv_production.db'):
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def add_ingestion_log(self, plot_id, activity_type, payload, evidence_url):
        session = self.Session()
        log = IngestionLog(plot_id=plot_id, activity_type=activity_type, payload=payload, evidence_url=evidence_url)
        session.add(log)
        session.commit()
        session.close()

    def get_certificates_by_project(self, project_id):
        session = self.Session()
        certs = session.query(Certificate).filter_by(project_id=project_id).all()
        session.close()
        return certs

    def register_plot(self, plot_id, coordinates, owner_info=""):
        session = self.Session()
        plot = Plot(plot_id=plot_id, coordinates=coordinates, owner_info=owner_info)
        session.add(plot)
        session.commit()
        session.close()
