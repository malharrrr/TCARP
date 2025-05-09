from datetime import date
from typing import List, Dict
from pydantic import BaseModel

# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"

# --- Causal Discovery ---

class CausalRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    lag: int

class CausalEdge(BaseModel):
    source: str
    target: str
    weight: float

class CausalResponse(BaseModel):
    nodes: List[str]
    edges: List[CausalEdge]

# --- Feature Selection ---

class FeatureRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    lag: int

class FeatureResponse(BaseModel):
    selected: List[str]

# --- RL Agent ---

class TrainRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    total_timesteps: int

class TrainResponse(BaseModel):
    model_id: str

class PredictRequest(BaseModel):
    model_id: str
    symbols: List[str]
    start_date: date
    end_date: date

class PredictResponse(BaseModel):
    dates: List[str]
    returns: Dict[str, List[float]]
    actions: List[str]

class PerDecisionExplainItem(BaseModel):
    date: date
    action: str
    contributions: Dict[str, float]

class PerDecisionExplainResponse(BaseModel):
    explains: List[PerDecisionExplainItem]

# --- Global explainability ---
class GlobalExplainResponse(BaseModel):
    importance: Dict[str, float]

# --- Causal paths ---
class CausalEdge(BaseModel):
    source: str
    target: str
    weight: float

class CausalPathRequest(BaseModel):
    nodes: List[str]
    edges: List[CausalEdge]
    feature: str

class CausalPathResponse(BaseModel):
    paths: List[List[str]]

# --- Counterfactual explainability ---
class CounterfactualRequest(PredictRequest):
    feature: str
    delta: float

class CounterfactualResponse(BaseModel):
    original_actions: List[str]
    counterfactual_actions: List[str]
    difference_indices: List[int]