from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import SessionLocal, engine
from ..schemas import HealthResponse

models.Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/health", tags=["health"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")
