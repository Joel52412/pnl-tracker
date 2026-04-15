import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const INSTRUMENT_DATA = {
  Futures: ['MNQ', 'NQ', 'MES', 'ES', 'M2K', 'RTY', 'MYM', 'YM', 'MGC', 'GC', 'MCL', 'CL', 'ZB', 'ZN', 'ZC', 'ZS', 'ZW', '6E', '6J', '6B', '6C', '6A', '6S'],
  Forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF', 'EUR/AUD', 'GBP/AUD', 'EUR/CAD'],
  Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'BNB/USD', 'DOGE/USD'],
  Stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPY', 'QQQ', 'AMD'],
}

const ALL_FLAT = Object.values(INSTRUMENT_DATA).flat()

export default function InstrumentSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef(null)
  const dropRef = useRef(null)

  // Keep query in sync when value changes externally
  useEffect(() => { setQuery(value || '') }, [value])

  const calcPos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  function handleFocus() {
    calcPos()
    setOpen(true)
  }

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    calcPos()
    setOpen(true)
  }

  function select(item) {
    setQuery(item)
    onChange(item)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    if (e.key === 'Enter') { e.preventDefault(); if (query.trim()) { onChange(query.trim()); setOpen(false) } }
  }

  // Close when clicking outside both input and dropdown
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!inputRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  const q = query.toLowerCase().trim()
  const hasExact = ALL_FLAT.some(i => i.toLowerCase() === q)

  const filtered = q
    ? Object.entries(INSTRUMENT_DATA).reduce((acc, [cat, items]) => {
        const matches = items.filter(i => i.toLowerCase().includes(q))
        if (matches.length) acc.push({ cat, items: matches })
        return acc
      }, [])
    : Object.entries(INSTRUMENT_DATA).map(([cat, items]) => ({ cat, items }))

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-surface-800 border border-surface-600 rounded-lg shadow-2xl overflow-hidden"
    >
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {q && !hasExact && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); select(query.trim()) }}
            onTouchEnd={e => { e.preventDefault(); select(query.trim()) }}
            className="w-full px-3 py-2.5 text-left text-sm text-brand hover:bg-surface-700 border-b border-surface-700 flex items-center gap-2"
          >
            <span className="text-gray-500">Use</span>
            <span className="font-medium">"{query}"</span>
            <span className="text-gray-500 text-xs ml-auto">custom</span>
          </button>
        )}

        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">
            No presets — press Enter to save "{query}"
          </div>
        )}

        {filtered.map(({ cat, items }) => (
          <div key={cat}>
            <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider bg-surface-900/80 sticky top-0">
              {cat}
            </div>
            <div className="grid grid-cols-2">
              {items.map(item => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(item) }}
                  onTouchEnd={e => { e.preventDefault(); select(item) }}
                  className={`px-3 py-2 text-left text-sm transition-colors hover:bg-surface-700 font-mono
                    ${item === value ? 'text-brand' : 'text-gray-300'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search instrument..."
          className="input pr-8 w-full font-mono"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); if (open) setOpen(false); else handleFocus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
        >
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
