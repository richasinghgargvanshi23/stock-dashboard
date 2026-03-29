// src/components/SearchBar.jsx
import React, { useState } from 'react'
import { Search } from 'lucide-react'

const SUGGESTIONS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'JPM', 'BAC', 'WMT', 'DIS', 'UBER']

export default function SearchBar({ onSearch, currentTicker }) {
  const [value, setValue]   = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const t = value.trim().toUpperCase()
    if (t) { onSearch(t); setValue(''); setFocused(false) }
  }

  const handleSuggest = (ticker) => {
    onSearch(ticker)
    setValue('')
    setFocused(false)
  }

  const filtered = value
    ? SUGGESTIONS.filter(s => s.startsWith(value.toUpperCase()) && s !== currentTicker)
    : []

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
        <Search size={14} className="text-gray-500 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search ticker… AAPL, TSLA"
          className="bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none w-48"
          autoCapitalize="characters"
        />
      </form>

      {/* Autocomplete dropdown */}
      {focused && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg overflow-hidden z-20 shadow-xl">
          {filtered.slice(0, 6).map(t => (
            <button
              key={t}
              onMouseDown={() => handleSuggest(t)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
