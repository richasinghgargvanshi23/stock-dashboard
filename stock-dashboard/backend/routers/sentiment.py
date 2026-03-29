"""
routers/sentiment.py
REST endpoint for news + Reddit sentiment analysis via FinBERT.
"""

from fastapi import APIRouter, HTTPException
from services.sentiment_service import get_aggregate_sentiment
from services import cache_service

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.get("/{ticker}")
def ticker_sentiment(ticker: str, company_name: str = ""):
    """
    Fetch and score news + Reddit posts for a ticker using FinBERT.
    Cached for 10 minutes (API rate limits).
    """
    ticker = ticker.upper()
    cache_key = f"sentiment:{ticker}"
    cached = cache_service.get(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = get_aggregate_sentiment(ticker, company_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    cache_service.set(cache_key, result, cache_service.TTL_SENTIMENT)
    return result
