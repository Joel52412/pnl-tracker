import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const INSTRUMENT_DATA = {
  Futures: ['MNQ', 'NQ', 'MES', 'ES', 'M2K', 'RTY', 'MYM', 'YM', 'MGC', 'GC', 'MCL', 'CL', 'ZB', 'ZN', 'ZC', 'ZS', 'ZW', '6E', '6J', '6B', '6C', '6A', '6S', 'HE', 'LE'],
  Forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'USD/CHF', 'AUD/JPY', 'CAD/JPY', 'NZD/JPY', 'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'EUR/CAD', 'EUR/CHF', 'AUD/CAD'],
  Crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT'],
  Stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ', 'AMD'],
}

const ALL_FLAT = Object.values(INSTRUMENT_DATA).flat()

export default function InstrumentSelector({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        if (query !== value) onChange(query)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [query, value, onChange])

  const q = query.toLowerCase().trim()
  const hasExact = ALL_FLAT.some(i => i.toLowerCase() === q)

  const filtered = q
    ? Object.entries(INSTRUMENT_DATA).reduce((acc, [cat, items]) => {
        const matches = items.filter(i => i.toLowerCase().includes(q))
        if (matches.length) acc.push({ cat, items: matches })
        return acc
      }, [])
    : Object.entries(INSTRUMENT_DATA).map(([cat, items]) => ({ cat, items }))

  function select(item) {
    onChange(item)
    setQuery(item)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    if (e.key === 'Enter') { e.preventDefault(); if (query) { onChange(query); setOpen(false) } }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search instrument..."
          className="input pr-8"
        />
        <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-slide-in">
          {q && !hasExact && (
            <button
              type="button"
              onMouseDown={() => select(query)}
              className="w-full px-3 py-2 text-left text-sm text-brand hover:bg-surface-700 border-b border-surface-700"
            >
              Use "<span className="font-medium">{query}</span>" (custom)
            </button>
          )}

          {filtered.map(({ cat, items }) => (
            <div key={cat}>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-surface-900/70 sticky top-0">
                {cat}
              </div>
              {items.map(item => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={() => select(item)}
                  className={`w-full px-4 py-1.5 text-left text-sm transition-colors hover:bg-surface-700 ${item === value ? 'text-brand font-medium' : 'text-gray-300'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}

          {q && filtered.length === 0 && (
            <div className="px-3 py-3 text-xs text-gray-500 text-center">
              No presets — press Enter to use "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
