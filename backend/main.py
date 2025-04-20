from fastapi import FastAPI
from app.api import health, causal, features, agent

app = FastAPI(title="TCARP Core API", version="0.1.0")

app.include_router(health.router)
app.include_router(causal.router)
app.include_router(features.router)
app.include_router(agent.router)

@app.get("/")
def root():
    return {"message": "TCARP backend is running."}
