// src/components/StockHeader.jsx
import React from 'react'
import { ArrowUpRight, ArrowDownRight, Wifi, WifiOff } from 'lucide-react'

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-mono text-gray-200">{value ?? '—'}</p>
    </div>
  )
}

function formatLargeNum(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function formatVol(n) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toLocaleString()
}

export default function StockHeader({ snapshot, wsStatus, flashClass, loading }) {
  if (loading || !snapshot) {
    return (
      <div className="card animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded mb-2" />
        <div className="h-12 w-36 bg-white/5 rounded" />
      </div>
    )
  }

  const change    = snapshot.change ?? 0
  const changePct = snapshot.change_pct ?? 0
  const isUp      = change >= 0
  const Arrow     = isUp ? ArrowUpRight : ArrowDownRight
  const chgColor  = isUp ? 'text-up' : 'text-down'
  const WsIcon    = wsStatus === 'open' ? Wifi : WifiOff

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-4">
        {/* Left: name + price */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {snapshot.ticker}
            </span>
            <span className="text-xs text-gray-400">{snapshot.name}</span>
            {snapshot.sector && (
              <span className="text-[10px] text-gray-600">{snapshot.sector}</span>
            )}
          </div>

          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold font-mono ${flashClass}`}>
              ${snapshot.price?.toFixed(2) ?? '—'}
            </span>
            <div className={`flex items-center gap-0.5 mb-1 ${chgColor}`}>
              <Arrow size={16} />
              <span className="text-sm font-mono font-semibold">
                {isUp ? '+' : ''}{change.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-gray-400 ml-1">
                ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: stats grid */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          <Stat label="Volume"     value={formatVol(snapshot.volume)} />
          <Stat label="Mkt Cap"    value={formatLargeNum(snapshot.market_cap)} />
          <Stat label="P/E"        value={snapshot.pe_ratio?.toFixed(1)} />
          <Stat label="52W High"   value={snapshot.fifty_two_week_high ? `$${snapshot.fifty_two_week_high.toFixed(2)}` : null} />
          <Stat label="52W Low"    value={snapshot.fifty_two_week_low  ? `$${snapshot.fifty_two_week_low.toFixed(2)}`  : null} />
          <Stat label="Avg Vol"    value={formatVol(snapshot.avg_volume)} />
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 mt-3">
        <div className={`w-1.5 h-1.5 rounded-full live-dot ${
          wsStatus === 'open' ? 'bg-up' : wsStatus === 'error' ? 'bg-down' : 'bg-neutral'
        }`} />
        <span className="text-[10px] text-gray-500">
          {wsStatus === 'open' ? 'Live — updates every 15s' :
           wsStatus === 'connecting' ? 'Connecting...' :
           wsStatus === 'error' ? 'Connection error — retrying' :
           'Reconnecting...'}
        </span>
        <WsIcon size={10} className="text-gray-600 ml-0.5" />
      </div>
    </div>
  )
}
