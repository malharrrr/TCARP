import os
import json
from typing import List, Union

import numpy as np
import pandas as pd
import yfinance as yf
import shap
import networkx as nx
from fastapi import APIRouter, HTTPException
from stable_baselines3 import PPO

from ..schemas import (
    PredictRequest,
    PerDecisionExplainResponse,
    PerDecisionExplainItem,
    GlobalExplainResponse,
    CausalPathRequest,
    CausalPathResponse,
    CounterfactualRequest,
    CounterfactualResponse,
    CausalEdge,
)
from .agent import fetch_returns, run_rollout

router = APIRouter(prefix="/explain", tags=["explain"])
MODEL_DIR = "models"


def _load_model_and_returns(req: PredictRequest):
    # --- load metadata ---
    meta_path = os.path.join(MODEL_DIR, f"{req.model_id}.json")
    if not os.path.exists(meta_path):
        raise HTTPException(404, "Model metadata not found; retrain first")
    with open(meta_path) as f:
        meta = json.load(f)

    if meta.get("symbols", []) != req.symbols:
        raise HTTPException(
            400,
            f"Model trained on {meta.get('symbols')}, not {req.symbols}"
        )

    # --- load model ---
    model_path = os.path.join(MODEL_DIR, f"{req.model_id}.zip")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model file not found")
    model = PPO.load(model_path)

    # --- fetch returns & prepare arrays/dates ---
    returns_df = fetch_returns(req.symbols, req.start_date, req.end_date)
    returns_arr = returns_df.values.astype(np.float32)
    # we drop the first row of dates to align with the rollout length
    dates = returns_df.index.strftime("%Y-%m-%d").tolist()[1:]

    return model, returns_df, returns_arr, dates


@router.post("/perdecision", response_model=PerDecisionExplainResponse)
def explain_per_decision(req: PredictRequest):
    """
    For each day in the period, returns per-feature SHAP attributions
    for the action actually taken on that day.
    """
    model, returns_df, returns_arr, dates = _load_model_and_returns(req)

    # run rollout to get the sequence of actions (we only need indices)
    # this returns list of symbols, but we will re-predict to get indices
    run_rollout(model, returns_arr, req.symbols)

    # build KernelExplainer over the policy.predict function
    # shap expects a function f(X) -> [n_samples] of predicted class indices
    def f(x: np.ndarray) -> np.ndarray:
        # x has shape (n_samples, n_features)
        # we want an array of shape (n_samples,) of action indices
        preds = []
        for obs in x:
            action_idx, _ = model.predict(obs.astype(np.float32))
            preds.append(int(action_idx))
        return np.array(preds)

    background = returns_arr[: min(100, len(returns_arr))]
    explainer = shap.KernelExplainer(f, background)

    # shap_values will be a list of arrays, one per possible action/class
    raw_shap = explainer.shap_values(returns_arr)  # list of [T x N_features]
    shap_vals_list = raw_shap if isinstance(raw_shap, list) else [raw_shap]

    items: List[PerDecisionExplainItem] = []
    for i, date in enumerate(dates):
        # figure out which action was taken on day i
        action_idx, _ = model.predict(returns_arr[i])
        # grab the shap row for that class
        class_shap = shap_vals_list[action_idx]
        if i >= class_shap.shape[0]:
            raise HTTPException(
                500,
                f"SHAP array too short ({class_shap.shape[0]}) for date index {i}"
            )
        contrib = {
            sym: float(class_shap[i, j])
            for j, sym in enumerate(req.symbols)
        }
        items.append(
            PerDecisionExplainItem(
                date=date,
                action=req.symbols[action_idx],
                contributions=contrib,
            )
        )

    return PerDecisionExplainResponse(explains=items)


@router.post("/global", response_model=GlobalExplainResponse)
def explain_global(req: PredictRequest):
    """
    Aggregates absolute per-decision SHAP contributions into
    a single global importance score per feature.
    """
    per_resp = explain_per_decision(req)
    # stack into matrix [T x N_features]
    mat = np.vstack([
        list(item.contributions.values()) for item in per_resp.explains
    ])
    # mean absolute across time
    imp = np.mean(np.abs(mat), axis=0)
    importance = {sym: float(imp[i]) for i, sym in enumerate(req.symbols)}
    return GlobalExplainResponse(importance=importance)


@router.post("/causalpath", response_model=CausalPathResponse)
def explain_causal_path(req: CausalPathRequest):
    """
    Given a discovered causal graph and a feature, list all
    simple directed paths from that feature to others.
    """
    G = nx.DiGraph()
    for edge in req.edges:
        if not isinstance(edge, CausalEdge):
            raise HTTPException(400, "Invalid edge format")
        G.add_edge(edge.source, edge.target, weight=edge.weight)

    if req.feature not in req.nodes:
        raise HTTPException(400, f"Feature {req.feature} not in graph nodes")

    paths = []
    for target in req.nodes:
        if target == req.feature:
            continue
        for path in nx.all_simple_paths(G, source=req.feature, target=target):
            paths.append(path)

    return CausalPathResponse(paths=paths)


@router.post("/counterfactual", response_model=CounterfactualResponse)
def explain_counterfactual(req: CounterfactualRequest):
    """
    “What if” analysis: bump one feature by (1 + delta), rerun,
    and report where the policy’s actions change.
    """
    # load original rollout
    _, _, returns_arr, _ = _load_model_and_returns(req)
    orig_actions = run_rollout(
        PPO.load(os.path.join(MODEL_DIR, f"{req.model_id}.zip")),
        returns_arr,
        req.symbols,
    )

    # perturb
    returns_df = fetch_returns(req.symbols, req.start_date, req.end_date)
    if req.feature not in returns_df.columns:
        raise HTTPException(400, f"Feature {req.feature} not in returns data")
    returns_df[req.feature] *= (1.0 + req.delta)
    cf_arr = returns_df.values.astype(np.float32)

    # counterfactual rollout
    cf_actions = run_rollout(
        PPO.load(os.path.join(MODEL_DIR, f"{req.model_id}.zip")),
        cf_arr,
        req.symbols,
    )

    diffs = [i for i, (o, c) in enumerate(zip(orig_actions, cf_actions)) if o != c]
    return CounterfactualResponse(
        original_actions=orig_actions,
        counterfactual_actions=cf_actions,
        difference_indices=diffs,
    )