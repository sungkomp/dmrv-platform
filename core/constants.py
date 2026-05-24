from enum import Enum

class DataSource(Enum):
    SATELLITE = "SATELLITE"
    IOT_SENSOR = "IOT_SENSOR"
    DRONE_LIDAR = "DRONE_LIDAR"
    MANUAL_SURVEY = "MANUAL_SURVEY"
    AGRI_LOG = "AGRI_LOG"

class DataTier(Enum):
    TIER_1 = "HIGH_PRECISION"  # Direct Measurement (IoT, LiDAR)
    TIER_2 = "REMOTE_SENSING"  # Satellite, Proxy
    TIER_3 = "ESTIMATED"       # Manual, Books

class PIILevel(Enum):
    PUBLIC = "PUBLIC"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"

class ProjectType(Enum):
    BLUE_CARBON = "BLUE_CARBON"
    SOIL_GHG = "SOIL_GHG"
    BIOGAS = "BIOGAS"
    RENEWABLE = "RENEWABLE"
    FORESTRY_TVER = "FORESTRY_TVER"
    WASTE_MANAGEMENT = "WASTE_MGMT"
    AGRI_LOW_CARBON = "AGRI_LOW_C"
    BIOCHAR_PYROLYSIS = "BIOCHAR_PYRO"

class ThaiRegion(Enum):
    NORTH = "NORTH"
    NORTHEAST = "NORTHEAST"
    CENTRAL = "CENTRAL"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"
