// src/components/VolumeChart.jsx
import React, { useMemo } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default function VolumeChart({ history }) {
  const chartData = useMemo(() => {
    const recent = history.slice(-30)
    return {
      labels: recent.map(d => d.date.slice(0, 10)),
      datasets: [{
        label: 'Volume',
        data: recent.map(d => d.volume),
        backgroundColor: recent.map((d, i) => {
          if (i === 0) return '#3b82f620'
          return d.close >= recent[i - 1]?.close ? '#10b98130' : '#ef444430'
        }),
        borderColor: recent.map((d, i) => {
          if (i === 0) return '#3b82f6'
          return d.close >= recent[i - 1]?.close ? '#10b981' : '#ef4444'
        }),
        borderWidth: 1,
        borderRadius: 2,
      }],
    }
  }, [history])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#9ca3af',
        bodyColor: '#f1f5f9',
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y
            if (v >= 1e9) return ` ${(v / 1e9).toFixed(2)}B`
            if (v >= 1e6) return ` ${(v / 1e6).toFixed(2)}M`
            return ` ${v.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        position: 'right',
        grid: { color: '#1f2937' },
        ticks: {
          color: '#6b7280',
          callback: v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v,
        },
      },
    },
  }

  return (
    <div className="card">
      <p className="text-sm text-gray-400 font-medium mb-3">Volume (30 days)</p>
      <div className="h-28">
        {history.length > 0
          ? <Bar data={chartData} options={options} />
          : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading...</div>
        }
      </div>
    </div>
  )
}
