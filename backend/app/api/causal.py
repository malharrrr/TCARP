from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import date

import pandas as pd
import yfinance as yf
import numpy as np

from causallearn.search.ConstraintBased.PC import pc
from causallearn.utils.GraphUtils import GraphUtils

router = APIRouter(prefix="/causal", tags=["causal"])


class CausalDiscoverRequest(BaseModel):
    symbols: List[str] = Field(..., description="List of ticker symbols")
    start_date: date = Field(..., description="Start date, e.g. 2020-01-01")
    end_date: date = Field(..., description="End date, e.g. 2021-01-01")
    alpha: float = Field(0.05, description="Significance level for PC test")


class Edge(BaseModel):
    source: str
    target: str


class CausalDiscoverResponse(BaseModel):
    edges: List[Edge]


@router.post("/discover", response_model=CausalDiscoverResponse)
def discover(req: CausalDiscoverRequest):
    # 1. Download data
    try:
        df = yf.download(
            req.symbols,
            start=str(req.start_date),
            end=str(req.end_date),
            progress=False,
        )["Adj Close"]
    except Exception as e:
        raise HTTPException(400, f"Error fetching data: {e}")

    if df.isnull().all().all():
        raise HTTPException(400, "No data returned for given symbols/dates.")

    # 2. Preprocess: forward‑fill then drop any remaining NaNs
    df = df.ffill().dropna()
    if df.shape[0] < 2:
        raise HTTPException(400, "Not enough data points after preprocessing.")

    # 3. Compute daily returns
    returns = df.pct_change().dropna()
    data = returns.values  # shape (T, N)

    # 4. Run PC algorithm
    try:
        cg = pc(data, alpha=req.alpha, labels=req.symbols)
    except Exception as e:
        raise HTTPException(500, f"PC algorithm failed: {e}")

    # 5. Convert to edge list
    nxg = GraphUtils.to_nx_graph(cg.G)
    edges = []
    for u, v in nxg.edges():
        edges.append(Edge(source=u, target=v))

    return CausalDiscoverResponse(edges=edges)
