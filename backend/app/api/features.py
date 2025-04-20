from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import date

import pandas as pd
import yfinance as yf

from causallearn.search.ConstraintBased.PC import pc
from causallearn.utils.GraphUtils import GraphUtils

router = APIRouter(prefix="/features", tags=["features"])


class FeatureSelectRequest(BaseModel):
    symbols: List[str] = Field(..., description="List of ticker symbols")
    start_date: date = Field(..., description="Start date, e.g. 2020-01-01")
    end_date: date = Field(..., description="End date, e.g. 2021-01-01")
    alpha: float = Field(0.05, description="Significance level for PC test")
    target: str = Field(..., description="One symbol from `symbols` to select features for")


class FeatureSelectResponse(BaseModel):
    parents: List[str]
    children: List[str]
    spouses: List[str]


@router.post("/select", response_model=FeatureSelectResponse)
def select_features(req: FeatureSelectRequest):
    if req.target not in req.symbols:
        raise HTTPException(400, f"Target {req.target} must be in symbols list.")

    # 1) Fetch data & preprocess exactly as in /causal/discover
    try:
        df = yf.download(
            req.symbols,
            start=str(req.start_date),
            end=str(req.end_date),
            progress=False,
        )["Adj Close"]
    except Exception as e:
        raise HTTPException(400, f"Error fetching data: {e}")

    df = df.ffill().dropna()
    if df.shape[0] < 2:
        raise HTTPException(400, "Not enough data after preprocessing.")

    returns = df.pct_change().dropna().values  # shape (T, N)

    # 2) Run PC to get causal graph
    try:
        cg = pc(returns, alpha=req.alpha, labels=req.symbols)
    except Exception as e:
        raise HTTPException(500, f"PC algorithm failed: {e}")

    # 3) Convert to directed networkx graph
    nxg = GraphUtils.to_nx_graph(cg.G)

    # 4) Extract Markov Blanket of req.target
    parents = list(nxg.predecessors(req.target))
    children = list(nxg.successors(req.target))

    spouses = set()
    for child in children:
        for p in nxg.predecessors(child):
            if p != req.target:
                spouses.add(p)

    return FeatureSelectResponse(
        parents=parents,
        children=children,
        spouses=list(spouses),
    )
