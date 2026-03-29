# StockPulse — Real-Time Stock Dashboard with Sentiment Analysis

A full-stack portfolio project combining live stock data, NLP sentiment analysis, and LSTM-based trend prediction — all in a single real-time dashboard.

![Tech Stack](https://img.shields.io/badge/Python-FastAPI-009688?style=flat-square&logo=fastapi)
![Tech Stack](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Tech Stack](https://img.shields.io/badge/ML-PyTorch%20%2B%20FinBERT-EE4C2C?style=flat-square&logo=pytorch)
![Tech Stack](https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square&logo=redis)

---

## Features

- **Live prices** via WebSocket — ticks every 15 seconds using yfinance
- **News sentiment** — NewsAPI headlines scored by FinBERT (finance-tuned BERT)
- **Reddit sentiment** — r/stocks, r/wallstreetbets posts scraped via PRAW + scored
- **LSTM prediction** — PyTorch model trained on OHLCV + technical indicators + sentiment
- **Redis caching** — rate-limit protection; degrades gracefully if Redis is unavailable
- **Interactive charts** — price history (line), volume (bar) via Chart.js
- **Watchlist** — live prices for AAPL, TSLA, MSFT, NVDA, GOOGL, AMZN, META

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Watchlist │ Price Chart │ Sentiment Panel │ ML Signal  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                          │
│  /stocks  │  /sentiment  │  /ml  │  ws://{ticker}       │
└─────┬──────────┬──────────────┬──────────────────────────┘
      │          │              │
   yfinance   NewsAPI        PRAW          Redis Cache
              FinBERT        FinBERT
                              LSTM (PyTorch)
```

---

## Tech Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Backend   | Python 3.11, FastAPI, Uvicorn, WebSockets |
| Data      | yfinance, NewsAPI, PRAW (Reddit)          |
| ML        | FinBERT (HuggingFace), LSTM (PyTorch), ta |
| Frontend  | React 18, Vite, Chart.js, TailwindCSS     |
| Cache     | Redis                                     |
| Deploy    | Render (backend + Redis) + Vercel (frontend) |

---

## Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Redis (optional — app works without it)

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/stock-dashboard.git
cd stock-dashboard
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your API keys (see API Keys section below)

uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
API docs at **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env

npm run dev
```

Frontend runs at **http://localhost:5173**

### 4. Train the LSTM model (optional)

```bash
# In another terminal with the backend running:
curl -X POST http://localhost:8000/ml/train/AAPL
# Training takes ~5 minutes. Check progress in backend logs.
```

---

## API Keys

| Service | How to get | Free tier |
|---------|-----------|-----------|
| **NewsAPI** | [newsapi.org](https://newsapi.org) | 100 req/day |
| **Reddit** | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → create script app | Free |
| **Alpha Vantage** | [alphavantage.co](https://alphavantage.co) (optional, yfinance works without it) | 25 req/day |

Add keys to `backend/.env`:
```
NEWS_API_KEY=your_key_here
REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
```

**Note:** The app runs without API keys — it will return empty sentiment data but stock prices work fully via yfinance.

---

## API Endpoints

```
GET  /stocks/{ticker}                  → live price snapshot
GET  /stocks/{ticker}/history          → OHLCV history (period, interval params)
GET  /stocks/watchlist?tickers=A,B,C   → batch snapshots
GET  /sentiment/{ticker}               → FinBERT-scored news + Reddit
GET  /ml/predict/{ticker}              → LSTM prediction (up/sideways/down)
POST /ml/train/{ticker}                → trigger background training
WS   /ws/{ticker}                      → live price + sentiment feed
GET  /health                           → service health check
```

---

## Deployment

### Backend → Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo → Render reads `render.yaml` automatically
4. Set secret env vars in the Render dashboard:
   - `NEWS_API_KEY`
   - `REDDIT_CLIENT_ID`
   - `REDDIT_CLIENT_SECRET`
   - `ALLOWED_ORIGINS` → your Vercel URL (e.g. `https://stock-dashboard.vercel.app`)

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_API_URL` → your Render backend URL (e.g. `https://stock-dashboard-api.onrender.com`)
- `VITE_WS_URL` → same but `wss://` prefix

---

## Project Structure

```
stock-dashboard/
├── backend/
│   ├── main.py                  # FastAPI app + WebSocket
│   ├── routers/
│   │   ├── stocks.py            # /stocks endpoints
│   │   ├── sentiment.py         # /sentiment endpoints
│   │   └── ml.py                # /ml endpoints
│   ├── services/
│   │   ├── stock_service.py     # yfinance wrapper
│   │   ├── sentiment_service.py # NewsAPI + PRAW + FinBERT
│   │   └── cache_service.py     # Redis wrapper
│   ├── ml/
│   │   └── model.py             # LSTM architecture + train + predict
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StockHeader.jsx
│   │   │   ├── PriceChart.jsx
│   │   │   ├── VolumeChart.jsx
│   │   │   ├── SentimentPanel.jsx
│   │   │   ├── PredictionCard.jsx
│   │   │   ├── Watchlist.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── hooks/
│   │   │   ├── useStock.js
│   │   │   └── useWebSocket.js
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   └── utils/
│   │       └── api.js
│   └── package.json
│
├── render.yaml                  # Render deployment
├── .github/workflows/ci.yml     # GitHub Actions CI
└── .gitignore
```

---

## ML Model Details

The LSTM is trained per-ticker on 2 years of daily OHLCV data with these features:

| Feature | Description |
|---------|-------------|
| close, volume | Raw price and volume |
| RSI (14) | Relative Strength Index |
| MACD, MACD Signal | Momentum oscillator |
| Bollinger Bands | Upper, lower, midline |
| EMA (20) | Exponential moving average |
| sentiment | FinBERT compound score (injected) |

**Output:** Probability of price moving UP / SIDEWAYS / DOWN over the next 3 trading days.

**Architecture:** 2-layer LSTM (128 hidden) → Linear(64) → Softmax(3)

---

## Disclaimer

This project is for **educational and portfolio purposes only**. It is not financial advice. Never make real investment decisions based on ML model outputs.
