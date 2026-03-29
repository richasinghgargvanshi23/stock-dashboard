"""
ml/model.py
LSTM model for short-term stock trend prediction.
Features: OHLCV + technical indicators (RSI, MACD, Bollinger) + FinBERT sentiment score.
Output: probability of price going UP / DOWN / SIDEWAYS over the next 3 days.
"""

import os
import numpy as np
import pandas as pd
import joblib
import yfinance as yf
import ta
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime
from typing import Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

LOOKBACK      = 60    # days of history fed into LSTM
FEATURE_COLS  = [
    "close", "volume", "rsi", "macd", "macd_signal",
    "bb_upper", "bb_lower", "bb_mavg", "ema_20", "sentiment",
]


# ── LSTM Architecture ────────────────────────────────────────────────────────

class StockLSTM(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 128, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 3),       # 3 classes: UP, DOWN, SIDEWAYS
            nn.Softmax(dim=1),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


# ── Feature Engineering ──────────────────────────────────────────────────────

def build_features(ticker: str, sentiment_score: float = 0.0) -> Optional[pd.DataFrame]:
    """Download 2 years of history, compute technical indicators, inject sentiment."""
    df = yf.Ticker(ticker).history(period="2y", interval="1d")
    if df.empty or len(df) < LOOKBACK + 10:
        return None

    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.columns = ["open", "high", "low", "close", "volume"]
    df.dropna(inplace=True)

    # Technical indicators via `ta` library
    df["rsi"]        = ta.momentum.RSIIndicator(df["close"], window=14).rsi()
    macd_obj         = ta.trend.MACD(df["close"])
    df["macd"]       = macd_obj.macd()
    df["macd_signal"]= macd_obj.macd_signal()
    bb               = ta.volatility.BollingerBands(df["close"], window=20)
    df["bb_upper"]   = bb.bollinger_hband()
    df["bb_lower"]   = bb.bollinger_lband()
    df["bb_mavg"]    = bb.bollinger_mavg()
    df["ema_20"]     = ta.trend.EMAIndicator(df["close"], window=20).ema_indicator()

    # Inject latest sentiment score as a constant feature column
    df["sentiment"]  = sentiment_score

    df.dropna(inplace=True)
    return df


def _make_sequences(df: pd.DataFrame, scaler=None):
    """
    Slice feature matrix into (X, y) sequences for LSTM training.
    Label = 1 (UP) if close[t+3] > close[t]*1.01, 0 (SIDEWAYS), 2 (DOWN)
    """
    data = df[FEATURE_COLS].values
    if scaler is None:
        scaler = MinMaxScaler()
        data = scaler.fit_transform(data)
    else:
        data = scaler.transform(data)

    X, y = [], []
    closes = df["close"].values

    for i in range(LOOKBACK, len(data) - 3):
        X.append(data[i - LOOKBACK:i])
        future_pct = (closes[i + 3] - closes[i]) / closes[i]
        if future_pct > 0.01:
            label = 0   # UP
        elif future_pct < -0.01:
            label = 2   # DOWN
        else:
            label = 1   # SIDEWAYS
        y.append(label)

    return np.array(X), np.array(y), scaler


# ── Training ──────────────────────────────────────────────────────────────────

def train_model(ticker: str, epochs: int = 30) -> dict:
    """Train LSTM for a given ticker and save weights + scaler."""
    print(f"[ML] Training LSTM for {ticker}...")
    df = build_features(ticker)
    if df is None:
        return {"error": f"Not enough data to train for {ticker}"}

    X, y, scaler = _make_sequences(df)

    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.long)
    X_val_t   = torch.tensor(X_val,   dtype=torch.float32)
    y_val_t   = torch.tensor(y_val,   dtype=torch.long)

    model = StockLSTM(input_size=len(FEATURE_COLS))
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    best_val_loss = float("inf")
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        pred = model(X_train_t)
        loss = criterion(pred, y_train_t)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_pred = model(X_val_t)
            val_loss = criterion(val_pred, y_val_t).item()
            val_acc  = (val_pred.argmax(dim=1) == y_val_t).float().mean().item()

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), os.path.join(MODEL_DIR, f"{ticker}_lstm.pt"))
            joblib.dump(scaler, os.path.join(MODEL_DIR, f"{ticker}_scaler.pkl"))

        if (epoch + 1) % 5 == 0:
            print(f"  Epoch {epoch+1}/{epochs} — val_loss: {val_loss:.4f}  val_acc: {val_acc:.4f}")

    print(f"[ML] Training complete for {ticker}.")
    return {
        "ticker": ticker,
        "epochs": epochs,
        "best_val_loss": round(best_val_loss, 4),
        "trained_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Inference ──────────────────────────────────────────────────────────────────

def predict(ticker: str, sentiment_score: float = 0.0) -> dict:
    """Load saved model and predict next-3-day trend."""
    model_path  = os.path.join(MODEL_DIR, f"{ticker}_lstm.pt")
    scaler_path = os.path.join(MODEL_DIR, f"{ticker}_scaler.pkl")

    if not os.path.exists(model_path):
        return {"error": f"No trained model found for {ticker}. POST /ml/train/{ticker} first."}

    df = build_features(ticker, sentiment_score)
    if df is None or len(df) < LOOKBACK:
        return {"error": "Not enough recent data to predict."}

    scaler = joblib.load(scaler_path)
    data   = scaler.transform(df[FEATURE_COLS].values)
    window = data[-LOOKBACK:]

    model = StockLSTM(input_size=len(FEATURE_COLS))
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    with torch.no_grad():
        x = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
        probs = model(x).squeeze().numpy()

    labels = ["UP", "SIDEWAYS", "DOWN"]
    predicted_label = labels[int(np.argmax(probs))]

    return {
        "ticker": ticker.upper(),
        "prediction": predicted_label,
        "confidence": round(float(np.max(probs)), 4),
        "probabilities": {
            "UP":       round(float(probs[0]), 4),
            "SIDEWAYS": round(float(probs[1]), 4),
            "DOWN":     round(float(probs[2]), 4),
        },
        "sentiment_score_used": sentiment_score,
        "predicted_at": datetime.utcnow().isoformat() + "Z",
    }
