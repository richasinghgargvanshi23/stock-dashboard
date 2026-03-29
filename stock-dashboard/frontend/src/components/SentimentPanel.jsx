// src/components/SentimentPanel.jsx
import React from 'react'
import { TrendingUp, TrendingDown, Minus, Newspaper, MessageSquare } from 'lucide-react'

function SentimentBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-400">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-mono text-gray-300">{pct}%</span>
    </div>
  )
}

function ArticleRow({ item }) {
  const score = item.sentiment?.compound ?? 0
  const isPos = score > 0.05
  const isNeg = score < -0.05

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="mt-0.5 shrink-0">
        {item.source === 'reddit'
          ? <MessageSquare size={12} className="text-orange-400" />
          : <Newspaper size={12} className="text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 line-clamp-2 group-hover:text-white transition-colors">
          {item.title}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {item.published_at?.slice(0, 10)}
          {item.source === 'reddit' && ` · r/${item.subreddit}`}
        </p>
      </div>
      <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
        isPos ? 'text-up bg-up/10' :
        isNeg ? 'text-down bg-down/10' :
        'text-gray-400 bg-white/5'
      }`}>
        {score >= 0 ? '+' : ''}{score.toFixed(2)}
      </span>
    </a>
  )
}

export default function SentimentPanel({ sentiment, loading }) {
  if (loading || !sentiment) {
    return (
      <div className="card">
        <p className="text-sm text-gray-400 mb-3 font-medium">Sentiment Analysis</p>
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const { label, overall_score, positive_pct, negative_pct, neutral_pct, total_articles, items = [] } = sentiment

  const LabelIcon = label === 'positive' ? TrendingUp : label === 'negative' ? TrendingDown : Minus
  const labelColor = label === 'positive' ? 'text-up' : label === 'negative' ? 'text-down' : 'text-neutral'

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">Sentiment Analysis</span>
        <span className="text-[10px] text-gray-500">{total_articles} sources</span>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 ${labelColor}`}>
          <LabelIcon size={18} />
          <span className="text-sm font-semibold capitalize">{label}</span>
        </div>
        <span className={`font-mono text-lg font-bold ${labelColor}`}>
          {overall_score >= 0 ? '+' : ''}{overall_score.toFixed(3)}
        </span>
      </div>

      {/* Distribution bars */}
      <div className="space-y-2">
        <SentimentBar label="Positive" pct={positive_pct} color="#10b981" />
        <SentimentBar label="Neutral"  pct={neutral_pct}  color="#f59e0b" />
        <SentimentBar label="Negative" pct={negative_pct} color="#ef4444" />
      </div>

      {/* Article feed */}
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Latest Sources</p>
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {items.slice(0, 10).map((item, i) => (
            <ArticleRow key={i} item={item} />
          ))}
          {items.length === 0 && (
            <p className="text-xs text-gray-500 py-2">No recent articles found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
