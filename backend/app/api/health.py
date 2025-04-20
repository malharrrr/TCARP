from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/health", tags=["health"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=schemas.HealthCheck)
def read_health(db: Session = Depends(get_db)):
    record = models.HealthCheck(status="OK")
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
