import os
import uuid
import json
from datetime import date
from typing import List

import numpy as np
import pandas as pd
import yfinance as yf
import gym
from gym import spaces
from fastapi import APIRouter, HTTPException

from stable_baselines3 import PPO

from ..schemas import (
    TrainRequest,
    TrainResponse,
    PredictRequest,
    PredictResponse,
)

router = APIRouter(prefix="/agent", tags=["agent"])

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)


class TradingEnv(gym.Env):
    """A simple env where each step you pick one asset; reward is its next-day return."""
    metadata = {"render.modes": ["human"]}

    def __init__(self, returns_df: pd.DataFrame):
        super().__init__()
        self.symbols = list(returns_df.columns)
        arr = returns_df.values.astype(np.float32)
        self.returns = arr
        self.num_steps, self.num_assets = arr.shape

        self.action_space = spaces.Discrete(self.num_assets)
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(self.num_assets,), dtype=np.float32
        )
        self.current_step = 0

    def reset(self):
        self.current_step = 0
        return self.returns[0]

    def step(self, action: int):
        reward = float(self.returns[self.current_step, action])
        self.current_step += 1
        done = self.current_step >= self.num_steps - 1
        obs = (
            self.returns[self.current_step]
            if not done
            else np.zeros(self.num_assets, dtype=np.float32)
        )
        return obs, reward, done, {}

    def render(self, mode="human"):
        pass


def fetch_returns(symbols: List[str], start_date: date, end_date: date) -> pd.DataFrame:
    data = yf.download(
        symbols, start=start_date, end=end_date, auto_adjust=True, progress=False
    )
    if isinstance(data.columns, pd.MultiIndex):
        fields = list(dict.fromkeys(data.columns.get_level_values(1)))
        # pick Close or Adj Close if present
        field = next((f for f in ("Close", "Adj Close") if f in fields), fields[0])
        prices = data.xs(field, axis=1, level=1)
    else:
        prices = data.copy()

    if prices.empty:
        raise HTTPException(500, "No price data returned by yfinance")

    prices = prices.ffill().dropna()
    returns = prices.pct_change().dropna()
    return returns


def _train_agent_internal(
    symbols: List[str], start_date: date, end_date: date, timesteps: int
) -> str:
    returns_df = fetch_returns(symbols, start_date, end_date)
    env = TradingEnv(returns_df)
    model = PPO("MlpPolicy", env, verbose=0)
    model.learn(total_timesteps=timesteps)

    model_id = uuid.uuid4().hex
    model.save(os.path.join(MODEL_DIR, f"{model_id}.zip"))
    with open(os.path.join(MODEL_DIR, f"{model_id}.json"), "w") as f:
        json.dump({"symbols": symbols}, f)

    return model_id


@router.post("/train", response_model=TrainResponse)
def train_agent(req: TrainRequest):
    model_id = _train_agent_internal(
        req.symbols, req.start_date, req.end_date, req.total_timesteps
    )
    return TrainResponse(model_id=model_id)


def run_rollout(model: PPO, returns_arr: np.ndarray, symbols: List[str]) -> List[str]:
    """
    Given a trained PPO model, a returns array shape (T, N_features),
    and the same list of symbols, produce the list of chosen symbols.
    Out-of-range indices are clamped.
    """
    actions: List[str] = []
    obs = returns_arr[0]

    for t in range(len(returns_arr) - 1):
        # reshape 1D obs -> batch (1, n_assets)
        obs_in = obs.reshape(1, -1) if obs.ndim == 1 else obs

        # deterministic prediction
        action_idx, _ = model.predict(obs_in, deterministic=True)

        # extract int
        if isinstance(action_idx, (list, np.ndarray)):
            action_idx = int(action_idx[0])
        else:
            action_idx = int(action_idx)

        # clamp into valid range
        action_idx = max(0, min(action_idx, len(symbols) - 1))

        actions.append(symbols[action_idx])
        obs = returns_arr[t + 1]

    return actions


@router.post("/predict", response_model=PredictResponse)
def predict_agent(req: PredictRequest):
    # 1) metadata must exist
    meta_file = os.path.join(MODEL_DIR, f"{req.model_id}.json")
    if not os.path.exists(meta_file):
        raise HTTPException(404, "Model metadata not found; please retrain")

    # 2) load + validate symbols
    with open(meta_file) as f:
        meta = json.load(f)
    trained = meta.get("symbols", [])
    if trained != req.symbols:
        raise HTTPException(
            400,
            f"Model trained on {trained}, cannot predict on {req.symbols}.",
        )

    # 3) load model
    model_path = os.path.join(MODEL_DIR, f"{req.model_id}.zip")
    if not os.path.exists(model_path):
        raise HTTPException(404, "Model binary not found")
    model = PPO.load(model_path)

    # 4) fetch returns + prepare dates
    returns_df = fetch_returns(req.symbols, req.start_date, req.end_date)
    returns_arr = returns_df.values.astype(np.float32)
    dates = returns_df.index.strftime("%Y-%m-%d").tolist()[1:]

    # 5) rollout
    actions = run_rollout(model, returns_arr, req.symbols)
    returns_dict = {sym: returns_df[sym].tolist() for sym in req.symbols}

    return PredictResponse(dates=dates, returns=returns_dict, actions=actions)