from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import date
import yfinance as yf
from causallearn.search.ConstraintBased.PC import pc

router = APIRouter(prefix="/features", tags=["features"])

class FeatureSelectRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    alpha: float = Field(0.05)
    target: str

class FeatureSelectResponse(BaseModel):
    parents: List[str]
    children: List[str]
    spouses: List[str]

@router.post("/select", response_model=FeatureSelectResponse)
def select_features(req: FeatureSelectRequest):
    if req.target not in req.symbols:
        raise HTTPException(400, "Target must be in symbols.")

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
    mat = cg.G.graph  # adjacency matrix
    labels = req.symbols
    idx = labels.index(req.target)

    parents = [labels[k] for k in range(len(labels)) if mat[k][idx] != 0]
    children = [labels[k] for k in range(len(labels)) if mat[idx][k] != 0]

    spouses_set = set()
    for c in children:
        ci = labels.index(c)
        for p in range(len(labels)):
            if mat[p][ci] != 0 and labels[p] != req.target:
                spouses_set.add(labels[p])
    spouses = list(spouses_set)

    return FeatureSelectResponse(
        parents=parents,
        children=children,
        spouses=spouses,
    )
