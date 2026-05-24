from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Plot(Base):
    __tablename__ = 'plots'
    id = Column(Integer, primary_key=True)
    plot_id = Column(String, unique=True, nullable=False)
    coordinates = Column(JSON)
    owner_info = Column(String)

class IngestionLog(Base):
    __tablename__ = 'ingestion_logs'
    id = Column(Integer, primary_key=True)
    plot_id = Column(String, ForeignKey('plots.plot_id'))
    activity_type = Column(String)
    payload = Column(JSON)
    timestamp = Column(DateTime)
    evidence_url = Column(String)

class Certificate(Base):
    __tablename__ = 'certificates'
    id = Column(Integer, primary_key=True)
    project_id = Column(String)
    track_type = Column(String)
    status = Column(String)
    amount_tco2e = Column(Float)
    master_cert_id = Column(String, nullable=True)
    issued_at = Column(DateTime)
