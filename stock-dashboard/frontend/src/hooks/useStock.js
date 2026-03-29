// src/hooks/useStock.js
import { useState, useEffect, useRef } from 'react'
import { fetchSnapshot, fetchHistory, fetchSentiment, fetchPrediction } from '../utils/api'
import { useWebSocket } from './useWebSocket'

export function useStock(ticker) {
  const [snapshot,   setSnapshot]   = useState(null)
  const [history,    setHistory]    = useState([])
  const [sentiment,  setSentiment]  = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [period,     setPeriod]     = useState('1mo')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const prevPriceRef = useRef(null)
  const [flashClass, setFlashClass] = useState('')

  // WebSocket for live price ticks
  const { data: liveData, status: wsStatus } = useWebSocket(ticker)

  // Flash animation when price changes
  useEffect(() => {
    if (!liveData?.price) return
    const prev = prevPriceRef.current
    if (prev !== null && prev !== liveData.price) {
      setFlashClass(liveData.price > prev ? 'flash-up' : 'flash-down')
      setTimeout(() => setFlashClass(''), 700)
    }
    prevPriceRef.current = liveData.price
  }, [liveData?.price])

  // Initial REST load
  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)

    Promise.all([
      fetchSnapshot(ticker),
      fetchSentiment(ticker),
    ])
      .then(([snap, sent]) => {
        setSnapshot(snap)
        setSentiment(sent)
        // Fire prediction using sentiment score
        return fetchPrediction(ticker, sent?.overall_score || 0)
      })
      .then(setPrediction)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  // Fetch OHLCV when ticker or period changes
  useEffect(() => {
    if (!ticker) return
    fetchHistory(ticker, period)
      .then(res => setHistory(res.data || []))
      .catch(() => {})
  }, [ticker, period])

  // Merge live WebSocket data into snapshot
  const liveSnapshot = liveData
    ? { ...snapshot, ...liveData }
    : snapshot

  return {
    snapshot: liveSnapshot,
    history,
    sentiment,
    prediction,
    period,
    setPeriod,
    loading,
    error,
    wsStatus,
    flashClass,
  }
}
