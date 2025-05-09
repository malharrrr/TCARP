from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, causal, features, agent, explain
from fastapi.staticfiles import StaticFiles
from app.api.health import router as health_router
from app.api.agent import router as agent_router
from app.api.causal import router as causal_router
from app.api.features import router as features_router
import os

os.makedirs("exports", exist_ok=True)

app = FastAPI(title="TCARP Core API", version="0.1.0")


origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(causal.router)
app.include_router(features.router)
app.include_router(agent.router)
app.include_router(health_router)
app.include_router(agent_router)
app.include_router(causal_router)
app.include_router(features_router)
app.include_router(explain.router)

app.mount("/exports", StaticFiles(directory="exports"), name="exports")

@app.get("/")
def root():
     return {"message": "TCARP backend is running."}
