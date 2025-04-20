import os
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import date

import pandas as pd
import yfinance as yf
import numpy as np

import gym
from gym import spaces
from stable_baselines3 import PPO

# Prepare a folder to save trained models
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_DIR = os.path.join(BASE, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

router = APIRouter(prefix="/agent", tags=["agent"])


class TrainRequest(BaseModel):
    symbols: List[str]
    start_date: date
    end_date: date
    total_timesteps: int = Field(10_000, description="PPO training timesteps")


class TrainResponse(BaseModel):
    model_id: str


class PredictRequest(BaseModel):
    model_id: str
    symbols: List[str]
    start_date: date
    end_date: date


class PredictResponse(BaseModel):
    actions: List[int]  # index of chosen symbol at each step


# -------------- a minimal trading env ---------------- #
class TradingEnv(gym.Env):
    def __init__(self, data: np.ndarray):
        """
        data: np.ndarray shape (T, N) of daily returns
        action: choose one asset index to go long
        obs: the N-dimensional return vector at current step
        """
        super().__init__()
        self.data = data
        self.T, self.N = data.shape
        self.current_step = 0

        self.action_space = spaces.Discrete(self.N)
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(self.N,), dtype=np.float32
        )

    def reset(self):
        self.current_step = 0
        return self.data[self.current_step]

    def step(self, action):
        ret = float(self.data[self.current_step, action])
        self.current_step += 1
        done = self.current_step >= self.T

        obs = self.data[self.current_step] if not done else np.zeros(self.N)
        return obs, ret, done, {}

# ----------------------------------------------------- #


@router.post("/train", response_model=TrainResponse)
def train_agent(req: TrainRequest):
    # 1) Download & preprocess returns
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

    # 2) Build gym env and train PPO
    env = TradingEnv(returns)
    model = PPO("MlpPolicy", env, verbose=0)
    model.learn(total_timesteps=req.total_timesteps)

    # 3) Save model
    model_id = str(uuid.uuid4())
    path = os.path.join(MODEL_DIR, f"{model_id}.zip")
    model.save(path)

    return TrainResponse(model_id=model_id)


@router.post("/predict", response_model=PredictResponse)
def predict_actions(req: PredictRequest):
    # 1) Load model
    path = os.path.join(MODEL_DIR, f"{req.model_id}.zip")
    if not os.path.isfile(path):
        raise HTTPException(404, f"Model {req.model_id} not found.")

    model = PPO.load(path)

    # 2) Download & preprocess data
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
    returns = df.pct_change().dropna().values
    if returns.shape[0] < 1:
        raise HTTPException(400, "Not enough data after preprocessing.")

    # 3) Roll through env with model
    env = TradingEnv(returns)
    obs = env.reset()
    actions = []
    done = False
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        actions.append(int(action))
        obs, _, done, _ = env.step(action)

    return PredictResponse(actions=actions)
