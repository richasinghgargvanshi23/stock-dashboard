"""
services/stock_service.py
Fetches live and historical stock data via yfinance.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime
from typing import Optional


def get_stock_snapshot(ticker: str) -> dict:
    """Fetch current price snapshot for a single ticker."""
    stock = yf.Ticker(ticker.upper())
    info = stock.info

    price = (
        info.get("currentPrice")
        or info.get("regularMarketPrice")
        or info.get("previousClose")
    )

    return {
        "ticker": ticker.upper(),
        "name": info.get("longName", ticker.upper()),
        "price": round(float(price), 2) if price else None,
        "change": round(float(info.get("regularMarketChange", 0)), 2),
        "change_pct": round(float(info.get("regularMarketChangePercent", 0)), 4),
        "volume": info.get("regularMarketVolume"),
        "avg_volume": info.get("averageVolume"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def get_historical_ohlcv(
    ticker: str,
    period: str = "1mo",
    interval: str = "1d"
) -> list[dict]:
    """
    Fetch OHLCV candlestick data for charting.

    period:   1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y
    interval: 1m, 5m, 15m, 1h, 1d, 1wk
    """
    stock = yf.Ticker(ticker.upper())
    df = stock.history(period=period, interval=interval)

    if df.empty:
        return []

    df.reset_index(inplace=True)
    date_col = "Datetime" if "Datetime" in df.columns else "Date"

    records = []
    for _, row in df.iterrows():
        records.append({
            "date": str(row[date_col])[:19],
            "open":   round(float(row["Open"]),   2),
            "high":   round(float(row["High"]),   2),
            "low":    round(float(row["Low"]),    2),
            "close":  round(float(row["Close"]),  2),
            "volume": int(row["Volume"]),
        })

    return records


def get_multiple_snapshots(tickers: list[str]) -> list[dict]:
    """Batch-fetch snapshots for a watchlist."""
    results = []
    for ticker in tickers:
        try:
            results.append(get_stock_snapshot(ticker))
        except Exception as e:
            results.append({"ticker": ticker.upper(), "error": str(e)})
    return results
