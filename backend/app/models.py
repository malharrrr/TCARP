from sqlalchemy import Column, Integer, String, DateTime, func
from .database import Base

class HealthCheck(Base):
    __tablename__ = "health_checks"
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, index=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
