// src/pages/Dashboard.jsx
import React, { useState } from 'react'
import { useStock } from '../hooks/useStock'
import StockHeader   from '../components/StockHeader'
import PriceChart    from '../components/PriceChart'
import VolumeChart   from '../components/VolumeChart'
import SentimentPanel from '../components/SentimentPanel'
import PredictionCard from '../components/PredictionCard'
import Watchlist     from '../components/Watchlist'
import SearchBar     from '../components/SearchBar'
import { BarChart2, Activity } from 'lucide-react'

export default function Dashboard() {
  const [ticker, setTicker] = useState('AAPL')

  const {
    snapshot, history, sentiment, prediction,
    period, setPeriod,
    loading, error,
    wsStatus, flashClass,
  } = useStock(ticker)

  return (
    <div className="min-h-screen bg-background text-gray-100">
      {/* Top nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent" />
            <span className="font-semibold text-sm tracking-tight">StockPulse</span>
          </div>
          <SearchBar onSearch={setTicker} currentTicker={ticker} />
          <div className="flex items-center gap-1.5">
            <BarChart2 size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Real-Time Dashboard</span>
          </div>
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="max-w-screen-2xl mx-auto px-4 pt-3">
          <div className="bg-down/10 border border-down/20 rounded-lg px-4 py-2 text-sm text-down">
            {error} — try a different ticker
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-screen-2xl mx-auto px-4 py-4 grid grid-cols-[220px_1fr_280px] gap-4 items-start">

        {/* Left: watchlist */}
        <aside>
          <Watchlist activeTicker={ticker} onSelect={setTicker} />
        </aside>

        {/* Centre: price + volume charts */}
        <main className="space-y-4 min-w-0">
          <StockHeader
            snapshot={snapshot}
            wsStatus={wsStatus}
            flashClass={flashClass}
            loading={loading}
          />
          <PriceChart
            history={history}
            period={period}
            onPeriodChange={setPeriod}
            ticker={ticker}
          />
          <VolumeChart history={history} />
        </main>

        {/* Right: sentiment + ML */}
        <aside className="space-y-4">
          <PredictionCard prediction={prediction} ticker={ticker} loading={loading} />
          <SentimentPanel sentiment={sentiment} loading={loading} />
        </aside>

      </div>
    </div>
  )
}
