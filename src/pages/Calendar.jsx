import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { getDailyPnLMap } from '../utils/calculations'
import { formatCurrency, pnlClass } from '../utils/formatters'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pnlIntensity(pnl, maxAbs) {
  if (pnl === null || pnl === undefined) return ''
  if (pnl === 0) return 'bg-surface-700/50 text-gray-500'
  if (maxAbs === 0) return pnl > 0 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs)
  if (pnl > 0) {
    if (intensity > 0.75) return 'bg-emerald-500/40 text-emerald-200 font-semibold'
    if (intensity > 0.5) return 'bg-emerald-500/25 text-emerald-300'
    if (intensity > 0.25) return 'bg-emerald-500/15 text-emerald-400'
    return 'bg-emerald-500/8 text-emerald-500'
  } else {
    if (intensity > 0.75) return 'bg-red-500/40 text-red-200 font-semibold'
    if (intensity > 0.5) return 'bg-red-500/25 text-red-300'
    if (intensity > 0.25) return 'bg-red-500/15 text-red-400'
    return 'bg-red-500/8 text-red-500'
  }
}

export default function Calendar() {
  const { trades, loadingTrades } = useAccount()
  const [viewDate, setViewDate] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)

  const dailyMap = getDailyPnLMap(trades)

  // Navigate months
  function prevMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  // Build calendar days (Mon-Sun week start)
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Month stats
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthPnLs = monthDays
    .map(d => dailyMap[format(d, 'yyyy-MM-dd')])
    .filter(v => v !== undefined)
  const monthTotal = monthPnLs.reduce((s, v) => s + v, 0)
  const profitDays = monthPnLs.filter(v => v > 0).length
  const lossDays = monthPnLs.filter(v => v < 0).length
  const tradingDays = monthPnLs.length

  // Max abs for color intensity
  const allVals = Object.values(dailyMap)
  const maxAbs = allVals.length > 0 ? Math.max(...allVals.map(Math.abs)) : 1

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white w-36 text-center">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="btn-ghost p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <div className={`text-lg font-bold font-mono ${pnlClass(monthTotal)}`}>
            {formatCurrency(monthTotal, 0)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Month Total</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-white">{tradingDays}</div>
          <div className="text-xs text-gray-500 mt-0.5">Trading Days</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{profitDays}</div>
          <div className="text-xs text-gray-500 mt-0.5">Profit Days</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-red-400">{lossDays}</div>
          <div className="text-xs text-gray-500 mt-0.5">Loss Days</div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-surface-700">
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const pnl = dailyMap[dateStr]
            const inMonth = isSameMonth(day, viewDate)
            const today = isToday(day)
            const colorClass = pnl !== undefined ? pnlIntensity(pnl, maxAbs) : ''
            const hovered = hoveredDate === dateStr
            const isLastRow = idx >= calDays.length - 7

            return (
              <div
                key={dateStr}
                className={`
                  relative min-h-[72px] sm:min-h-[80px] p-2 border-b border-r border-surface-700/50 cursor-pointer
                  transition-colors group
                  ${!inMonth ? 'opacity-30' : ''}
                  ${colorClass || (inMonth ? 'hover:bg-surface-800/60' : '')}
                  ${today ? 'ring-1 ring-inset ring-brand/40' : ''}
                  ${isLastRow ? 'border-b-0' : ''}
                  ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                `}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {/* Day number */}
                <div className={`text-xs font-medium mb-1 flex items-center justify-between ${today ? 'text-brand' : inMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                  <span className={today ? 'w-5 h-5 bg-brand/20 rounded-full flex items-center justify-center text-brand text-xs' : ''}>
                    {format(day, 'd')}
                  </span>
                  {inMonth && pnl === undefined && (
                    <button
                      onClick={() => setAddTradeDate(dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface-600 rounded transition-all"
                    >
                      <Plus className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>

                {/* PnL */}
                {pnl !== undefined && (
                  <div className="mt-1">
                    <span className="text-xs font-mono font-medium leading-tight">
                      {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 0)}
                    </span>
                  </div>
                )}

                {/* Tooltip on hover */}
                {hovered && pnl !== undefined && (
                  <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl pointer-events-none">
                    <div className="font-medium text-gray-200">{format(day, 'EEEE, MMM d')}</div>
                    <div className={`font-mono mt-0.5 ${pnlClass(pnl)}`}>{formatCurrency(pnl)}</div>
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-800 border-b border-r border-surface-600 rotate-45" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.6, 1].map(o => (
              <div key={o} className="w-4 h-4 rounded-sm" style={{ background: `rgba(52,211,153,${o * 0.5})` }} />
            ))}
          </div>
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.6, 1].map(o => (
              <div key={o} className="w-4 h-4 rounded-sm" style={{ background: `rgba(248,113,113,${o * 0.5})` }} />
            ))}
          </div>
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-surface-700/50 rounded-sm" />
          No trade
        </div>
      </div>

      {addTradeDate && (
        <AddTradeModal prefillDate={addTradeDate} onClose={() => setAddTradeDate(null)} />
      )}
    </div>
  )
}
