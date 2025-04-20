from pydantic import BaseModel
from datetime import datetime

class HealthCheck(BaseModel):
    id: int
    status: str
    checked_at: datetime

    class Config:
        orm_mode = True
