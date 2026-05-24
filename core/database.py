from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

Base = declarative_base()

class Project(Base):
    __tablename__ = 'projects'
    id = Column(String, primary_key=True)
    name = Column(String)
    methodology = Column(String)

class CarbonCredit(Base):
    __tablename__ = 'carbon_credits'
    token_id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey('projects.id'))
    amount = Column(Float)
    status = Column(String)  # Available, Traded, Retired
    ext_metadata = Column(JSON)

class SensorData(Base):
    __tablename__ = 'sensor_data'
    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String)
    value = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# Setup connection (Using SQLite for prototyping, can switch to Postgres for production)
engine = create_engine('sqlite:///dmrv_production.db')
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)
    print("Database initialized.")
