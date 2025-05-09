from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import date
import yfinance as yf
import numpy as np
from causallearn.search.ConstraintBased.PC import pc

router = APIRouter(prefix="/causal", tags=["causal"])

class CausalDiscoverRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    alpha: float = Field(0.05)

class Edge(BaseModel):
    source: str
    target: str

class CausalDiscoverResponse(BaseModel):
    edges: List[Edge]

@router.post("/discover", response_model=CausalDiscoverResponse)
def discover(req: CausalDiscoverRequest):
    try:
        df = yf.download(
            req.symbols,
            start=str(req.start_date),
            end=str(req.end_date),
            auto_adjust=False,
            progress=False,
        )["Adj Close"]
    except Exception as e:
        raise HTTPException(400, f"Error fetching data: {e}")

    df = df.ffill().dropna()
    if df.shape[0] < 2:
        raise HTTPException(400, "Not enough data.")

    returns = df.pct_change().dropna().values
    try:
        cg = pc(returns, alpha=req.alpha, labels=req.symbols)
    except Exception as e:
        raise HTTPException(500, f"PC failed: {e}")

    if not hasattr(cg.G, "graph"):
        raise HTTPException(500, "Cannot extract adjacency matrix from causal graph.")
    mat = cg.G.graph  
    labels = req.symbols
    n = len(labels)
    edges = []
    for i in range(n):
        for j in range(n):
            if mat[i][j] != 0:
                edges.append(Edge(source=labels[i], target=labels[j]))

    return CausalDiscoverResponse(edges=edges)