"""
routers/ml.py
Endpoints for training the LSTM and getting predictions.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from ml.model import train_model, predict
from services import cache_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/train/{ticker}")
def trigger_training(ticker: str, background_tasks: BackgroundTasks):
    """
    Kick off LSTM training in the background.
    Training takes 2-5 minutes. Check /ml/predict/{ticker} after.
    """
    background_tasks.add_task(train_model, ticker.upper(), 30)
    return {
        "message": f"Training started for {ticker.upper()} (30 epochs).",
        "note": "Call GET /ml/predict/{ticker} once training completes.",
    }


@router.get("/predict/{ticker}")
def get_prediction(ticker: str, sentiment: float = 0.0):
    """
    Get LSTM prediction for next-3-day trend.
    Optionally pass ?sentiment=0.45 to inject a live sentiment score.
    Cached for 30 minutes.
    """
    cache_key = f"prediction:{ticker.upper()}:{round(sentiment, 2)}"
    cached = cache_service.get(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    result = predict(ticker.upper(), sentiment)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    cache_service.set(cache_key, result, cache_service.TTL_PREDICTION)
    return result
