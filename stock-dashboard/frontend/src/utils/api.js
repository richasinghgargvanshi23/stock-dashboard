// src/utils/api.js
// Centralised fetch wrapper for all backend REST calls

const BASE = import.meta.env.VITE_API_URL || '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Stocks ────────────────────────────────────────────────────────────────────
export const fetchSnapshot = (ticker) =>
  get(`/stocks/${ticker}`)

export const fetchHistory = (ticker, period = '1mo', interval = '1d') =>
  get(`/stocks/${ticker}/history?period=${period}&interval=${interval}`)

export const fetchWatchlist = (tickers) =>
  get(`/stocks/watchlist?tickers=${tickers.join(',')}`)

// ── Sentiment ─────────────────────────────────────────────────────────────────
export const fetchSentiment = (ticker) =>
  get(`/sentiment/${ticker}`)

// ── ML Prediction ─────────────────────────────────────────────────────────────
export const fetchPrediction = (ticker, sentimentScore = 0) =>
  get(`/ml/predict/${ticker}?sentiment=${sentimentScore}`)

export const triggerTraining = (ticker) =>
  fetch(`${BASE}/ml/train/${ticker}`, { method: 'POST' }).then(r => r.json())
