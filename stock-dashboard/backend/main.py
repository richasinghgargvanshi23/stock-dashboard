"""
main.py
FastAPI application entry point.
- REST endpoints: /stocks, /sentiment, /ml
- WebSocket: /ws/{ticker} — pushes live price + sentiment every 15s
"""

import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import stocks, sentiment, ml
from services.stock_service import get_stock_snapshot
from services.sentiment_service import get_aggregate_sentiment
from services import cache_service

load_dotenv()

app = FastAPI(
    title="Stock Dashboard API",
    version="1.0.0",
    description="Live stock prices, news sentiment (FinBERT), and LSTM trend prediction.",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(stocks.router)
app.include_router(sentiment.router)
app.include_router(ml.router)


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ticker: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(ticker, []).append(ws)
        print(f"[WS] +1 client on {ticker} ({len(self.connections[ticker])} total)")

    def disconnect(self, ticker: str, ws: WebSocket):
        if ticker in self.connections:
            self.connections[ticker].discard(ws) if hasattr(self.connections[ticker], "discard") \
                else self.connections[ticker].remove(ws)

    async def send(self, ws: WebSocket, data: dict):
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            pass


manager = ConnectionManager()


@app.websocket("/ws/{ticker}")
async def websocket_live(websocket: WebSocket, ticker: str):
    """
    Connect: ws://localhost:8000/ws/AAPL
    Pushes a JSON payload every 15 seconds:
    {
        "ticker": "AAPL",
        "price": 192.35,
        "change_pct": 0.42,
        "sentiment": { "label": "positive", "overall_score": 0.34 },
        "timestamp": "2024-01-01T12:00:00Z"
    }
    """
    ticker = ticker.upper()
    await manager.connect(ticker, websocket)

    try:
        while True:
            # Price snapshot (cached 15s)
            snapshot_key = f"snapshot:{ticker}"
            snapshot = cache_service.get(snapshot_key)
            if not snapshot:
                try:
                    snapshot = get_stock_snapshot(ticker)
                    cache_service.set(snapshot_key, snapshot, cache_service.TTL_SNAPSHOT)
                except Exception as e:
                    await manager.send(websocket, {"error": str(e)})
                    await asyncio.sleep(15)
                    continue

            # Sentiment (cached 10 min)
            sent_key = f"sentiment:{ticker}"
            sent = cache_service.get(sent_key)
            if not sent:
                try:
                    sent = get_aggregate_sentiment(ticker)
                    cache_service.set(sent_key, sent, cache_service.TTL_SENTIMENT)
                except Exception:
                    sent = {"label": "neutral", "overall_score": 0.0}

            payload = {
                "ticker": ticker,
                "price": snapshot.get("price"),
                "change": snapshot.get("change"),
                "change_pct": snapshot.get("change_pct"),
                "volume": snapshot.get("volume"),
                "sentiment": {
                    "label":         sent.get("label", "neutral"),
                    "overall_score": sent.get("overall_score", 0.0),
                    "positive_pct":  sent.get("positive_pct", 0),
                    "negative_pct":  sent.get("negative_pct", 0),
                    "neutral_pct":   sent.get("neutral_pct", 0),
                },
                "timestamp": snapshot.get("timestamp"),
            }

            await manager.send(websocket, payload)
            await asyncio.sleep(15)

    except WebSocketDisconnect:
        manager.disconnect(ticker, websocket)
        print(f"[WS] Client disconnected from {ticker}")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {
        "status": "ok",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    redis_ok = cache_service.get("__ping__") is not None or cache_service.set("__ping__", 1, 5)
    return {
        "api": "ok",
        "redis": "ok" if redis_ok else "unavailable (running without cache)",
    }
