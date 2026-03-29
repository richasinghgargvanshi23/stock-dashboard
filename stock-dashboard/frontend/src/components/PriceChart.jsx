// src/components/PriceChart.jsx
import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Filler, TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, TimeScale)

const PERIODS = [
  { label: '1D', value: '1d',  interval: '5m'  },
  { label: '5D', value: '5d',  interval: '15m' },
  { label: '1M', value: '1mo', interval: '1d'  },
  { label: '3M', value: '3mo', interval: '1d'  },
  { label: '6M', value: '6mo', interval: '1d'  },
  { label: '1Y', value: '1y',  interval: '1d'  },
]

export default function PriceChart({ history, period, onPeriodChange, ticker }) {
  const isUp = useMemo(() => {
    if (history.length < 2) return true
    return history[history.length - 1].close >= history[0].close
  }, [history])

  const color = isUp ? '#10b981' : '#ef4444'

  const chartData = useMemo(() => ({
    labels: history.map(d => d.date),
    datasets: [{
      label: ticker,
      data: history.map(d => d.close),
      borderColor: color,
      backgroundColor: `${color}18`,
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: color,
    }],
  }), [history, color, ticker])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#9ca3af',
        bodyColor: '#f1f5f9',
        padding: 10,
        callbacks: {
          label: ctx => ` $${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid:   { color: '#1f2937' },
        ticks:  {
          color: '#6b7280',
          maxTicksLimit: 8,
          maxRotation: 0,
          callback(_, i, ticks) {
            if (i === 0 || i === ticks.length - 1 || i % Math.ceil(ticks.length / 6) === 0) {
              const d = history[i]?.date
              return d ? d.slice(0, 10) : ''
            }
            return ''
          },
        },
      },
      y: {
        position: 'right',
        grid:   { color: '#1f2937' },
        ticks:  { color: '#6b7280', callback: v => `$${v.toFixed(0)}` },
      },
    },
  }), [history])

  return (
    <div className="card">
      {/* Period selector */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 font-medium">Price History</span>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                period === p.value
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {history.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Loading chart data...
          </div>
        )}
      </div>
    </div>
  )
}
