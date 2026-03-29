// src/components/Watchlist.jsx
import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchWatchlist } from '../utils/api'

const DEFAULT_TICKERS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META']

function WatchItem({ stock, isActive, onClick }) {
  const change = stock.change_pct ?? 0
  const isUp   = change >= 0
  const Icon   = isUp ? TrendingUp : TrendingDown

  if (stock.error) {
    return (
      <div className="px-3 py-2 text-xs text-gray-600">
        {stock.ticker} — unavailable
      </div>
    )
  }

  return (
    <button
      onClick={() => onClick(stock.ticker)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
        isActive
          ? 'bg-accent/20 border border-accent/30'
          : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-100">{stock.ticker}</p>
        <p className="text-[10px] text-gray-500 truncate max-w-[80px]">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium text-gray-100">
          ${stock.price?.toFixed(2) ?? '—'}
        </p>
        <div className={`flex items-center justify-end gap-0.5 text-[11px] font-mono ${isUp ? 'text-up' : 'text-down'}`}>
          <Icon size={10} />
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </div>
      </div>
    </button>
  )
}

export default function Watchlist({ activeTicker, onSelect }) {
  const [stocks, setStocks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWatchlist(DEFAULT_TICKERS)
      .then(setStocks)
      .catch(() => {})
      .finally(() => setLoading(false))

    // Refresh every 30 seconds
    const id = setInterval(() => {
      fetchWatchlist(DEFAULT_TICKERS).then(setStocks).catch(() => {})
    }, 30_000)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="card h-full">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Watchlist</p>
      {loading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {stocks.map(stock => (
            <WatchItem
              key={stock.ticker}
              stock={stock}
              isActive={stock.ticker === activeTicker}
              onClick={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
