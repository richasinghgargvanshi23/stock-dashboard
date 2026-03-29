"""
routers/stocks.py
REST endpoints for stock price data.
"""

from fastapi import APIRouter, HTTPException, Query
from services.stock_service import get_stock_snapshot, get_historical_ohlcv, get_multiple_snapshots
from services import cache_service

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/watchlist")
def watchlist(
    tickers: str = Query(..., description="Comma-separated tickers e.g. AAPL,TSLA,MSFT")
):
    """Get price snapshots for multiple tickers (watchlist)."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    cache_key = f"watchlist:{','.join(sorted(ticker_list))}"
    cached = cache_service.get(cache_key)
    if cached:
        return cached

    result = get_multiple_snapshots(ticker_list)
    cache_service.set(cache_key, result, cache_service.TTL_SNAPSHOT)
    return result


@router.get("/{ticker}")
def stock_snapshot(ticker: str):
    """Get current price snapshot for a single ticker."""
    ticker = ticker.upper()
    cache_key = f"snapshot:{ticker}"
    cached = cache_service.get(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = get_stock_snapshot(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    cache_service.set(cache_key, result, cache_service.TTL_SNAPSHOT)
    return result


@router.get("/{ticker}/history")
def stock_history(
    ticker: str,
    period: str   = Query(default="1mo",  enum=["1d", "5d", "1mo", "3mo", "6mo", "1y"]),
    interval: str = Query(default="1d",   enum=["1m", "5m", "15m", "1h", "1d"]),
):
    """Get OHLCV history for candlestick charts."""
    ticker = ticker.upper()
    cache_key = f"history:{ticker}:{period}:{interval}"
    cached = cache_service.get(cache_key)
    if cached:
        return cached

    data = get_historical_ohlcv(ticker, period, interval)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for {ticker}")

    result = {"ticker": ticker, "period": period, "interval": interval, "data": data}
    cache_service.set(cache_key, result, cache_service.TTL_HISTORY)
    return result
