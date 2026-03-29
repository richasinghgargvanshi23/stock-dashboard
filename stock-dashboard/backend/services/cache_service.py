"""
services/cache_service.py
Redis cache layer — gracefully degrades to no-cache if Redis is unavailable.
"""

import os
import json
import redis
from typing import Optional, Any
from dotenv import load_dotenv

load_dotenv()

_client: Optional[redis.Redis] = None


def _get_client() -> Optional[redis.Redis]:
    global _client
    if _client is None:
        try:
            url = os.getenv("REDIS_URL", "redis://localhost:6379")
            _client = redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
            _client.ping()
            print("[Redis] Connected.")
        except Exception as e:
            print(f"[Redis] Not available ({e}) — running without cache.")
            _client = None
    return _client


def get(key: str) -> Optional[Any]:
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def set(key: str, value: Any, ttl_seconds: int = 60) -> bool:
    client = _get_client()
    if not client:
        return False
    try:
        client.setex(key, ttl_seconds, json.dumps(value))
        return True
    except Exception:
        return False


def delete(key: str) -> bool:
    client = _get_client()
    if not client:
        return False
    try:
        client.delete(key)
        return True
    except Exception:
        return False


# TTL presets (seconds)
TTL_SNAPSHOT   = 15       # price snapshot  → 15 seconds
TTL_HISTORY    = 300      # OHLCV history   → 5 minutes
TTL_SENTIMENT  = 600      # sentiment data  → 10 minutes
TTL_PREDICTION = 1800     # ML prediction   → 30 minutes
