// src/components/PredictionCard.jsx
import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw } from 'lucide-react'
import { triggerTraining } from '../utils/api'

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-400">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value * 100).toFixed(1)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-gray-300">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  )
}

export default function PredictionCard({ prediction, ticker, loading }) {
  const [training, setTraining] = useState(false)
  const [trainMsg, setTrainMsg] = useState('')

  const handleTrain = async () => {
    setTraining(true)
    setTrainMsg('')
    try {
      await triggerTraining(ticker)
      setTrainMsg('Training started! Come back in ~5 min.')
    } catch {
      setTrainMsg('Failed to start training.')
    } finally {
      setTraining(false)
    }
  }

  if (loading || !prediction) {
    return (
      <div className="card">
        <p className="text-sm text-gray-400 mb-3 font-medium">ML Prediction</p>
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-white/5 rounded" />)}
        </div>
      </div>
    )
  }

  if (prediction.error) {
    return (
      <div className="card">
        <p className="text-sm text-gray-400 mb-2 font-medium">ML Prediction</p>
        <p className="text-xs text-gray-500 mb-3">{prediction.error}</p>
        <button
          onClick={handleTrain}
          disabled={training}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-blue-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={training ? 'animate-spin' : ''} />
          {training ? 'Starting...' : `Train model for ${ticker}`}
        </button>
        {trainMsg && <p className="text-[10px] text-gray-400 mt-1">{trainMsg}</p>}
      </div>
    )
  }

  const { prediction: signal, confidence, probabilities } = prediction

  const Icon    = signal === 'UP' ? TrendingUp : signal === 'DOWN' ? TrendingDown : Minus
  const color   = signal === 'UP' ? 'text-up' : signal === 'DOWN' ? 'text-down' : 'text-neutral'
  const bgColor = signal === 'UP' ? 'bg-up/10' : signal === 'DOWN' ? 'bg-down/10' : 'bg-neutral/10'

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
          <Brain size={14} />
          <span>ML Prediction</span>
        </div>
        <span className="text-[10px] text-gray-500">Next 3 days</span>
      </div>

      {/* Signal badge */}
      <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${bgColor}`}>
        <div className={`flex items-center gap-2 ${color}`}>
          <Icon size={20} />
          <span className="text-lg font-bold">{signal}</span>
        </div>
        <div className="text-right">
          <p className={`font-mono font-bold text-xl ${color}`}>
            {(confidence * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400">confidence</p>
        </div>
      </div>

      {/* Probability breakdown */}
      <div className="space-y-2">
        <ProbBar label="↑ Bullish"  value={probabilities.UP}       color="#10b981" />
        <ProbBar label="→ Sideways" value={probabilities.SIDEWAYS}  color="#f59e0b" />
        <ProbBar label="↓ Bearish"  value={probabilities.DOWN}      color="#ef4444" />
      </div>

      {/* Sentiment used */}
      <p className="text-[10px] text-gray-500">
        Sentiment score used: {prediction.sentiment_score_used >= 0 ? '+' : ''}
        {prediction.sentiment_score_used?.toFixed(3)}
        {' · '}
        Updated {prediction.predicted_at?.slice(11, 16)} UTC
      </p>

      {/* Retrain button */}
      <button
        onClick={handleTrain}
        disabled={training}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={10} className={training ? 'animate-spin' : ''} />
        {training ? 'Starting training...' : 'Retrain model'}
      </button>
      {trainMsg && <p className="text-[10px] text-gray-400">{trainMsg}</p>}
    </div>
  )
}
