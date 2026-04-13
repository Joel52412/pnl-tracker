import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, BookText, X, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, parseISO,
} from 'date-fns'
import { supabase } from '../lib/supabase'

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKEND_COLS = new Set([0, 6]) // Su=0, Sa=6

// Returns Tailwind bg class based on PnL magnitude
function cellBg(pnl, maxAbs) {
  if (pnl === undefined || pnl === null) return ''
  if (pnl === 0) return 'bg-surface-700/30'
  if (maxAbs === 0) return pnl > 0 ? 'bg-emerald-900/50' : 'bg-red-900/50'
  const ratio = Math.min(1, Math.abs(pnl) / maxAbs)
  if (pnl > 0) {
    if (ratio > 0.75) return 'bg-emerald-500/40'
    if (ratio > 0.5)  return 'bg-emerald-500/28'
    if (ratio > 0.25) return 'bg-emerald-500/16'
    return 'bg-emerald-500/8'
  } else {
    if (ratio > 0.75) return 'bg-red-500/40'
    if (ratio > 0.5)  return 'bg-red-500/28'
    if (ratio > 0.25) return 'bg-red-500/16'
    return 'bg-red-500/8'
  }
}

function pnlText(pnl) {
  if (pnl === undefined || pnl === null) return 'text-gray-600'
  if (pnl > 0) return 'text-emerald-300'
  if (pnl < 0) return 'text-red-300'
  return 'text-gray-500'
}

export default function Calendar() {
  const { trades, selectedAccount } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()

  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)
  const [journals, setJournals] = useState({}) // dateStr -> journal

  // Fetch journals for this account
  useEffect(() => {
    if (!selectedAccount) return
    supabase
      .from('journals')
      .select('*')
      .eq('account_id', selectedAccount.id)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(j => { map[j.date] = j })
          setJournals(map)
        }
      })
  }, [selectedAccount])

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday()   { setViewDate(new Date()); setSelectedDate(null) }

  // Build daily maps
  const dailyPnL = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      map[t.date] = (map[t.date] || 0) + Number(t.pnl)
    })
    return map
  }, [trades])

  const dailyCount = useMemo(() => {
    const map = {}
    trades.forEach(t => { map[t.date] = (map[t.date] || 0) + 1 })
    return map
  }, [trades])

  // Month boundaries
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)

  // Calendar grid: Sun-start weeks covering the whole month
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd   = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd })

  // Group into weeks
  const weeks = []
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7))
  }

  // Month stats (in-month days only)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthPnLs = monthDays.map(d => dailyPnL[format(d, 'yyyy-MM-dd')]).filter(v => v !== undefined)
  const monthTotal    = monthPnLs.reduce((s, v) => s + v, 0)
  const tradingDays   = monthPnLs.length
  const profitDays    = monthPnLs.filter(v => v > 0).length
  const lossDays      = monthPnLs.filter(v => v < 0).length

  // Color intensity scale: use current month's max abs
  const maxAbs = monthPnLs.length > 0 ? Math.max(...monthPnLs.map(Math.abs)) : 1

  // Drill-down data
  const selectedTrades  = selectedDate ? trades.filter(t => t.date === selectedDate) : []
  const selectedJournal = selectedDate ? journals[selectedDate] : null
  const selectedPnL     = selectedDate != null ? dailyPnL[selectedDate] : undefined

  // Which week index contains the selected date
  const selectedWeekIdx = selectedDate
    ? weeks.findIndex(w => w.some(d => format(d, 'yyyy-MM-dd') === selectedDate))
    : -1

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

      {/* Month nav header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
            <h1 className="text-xl font-bold text-white w-44">{format(viewDate, 'MMMM yyyy')}</h1>
            <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
          </div>
          {/* Month summary inline */}
          <div className="flex items-center gap-4 mt-1.5 pl-10 text-sm">
            <span className={`font-mono font-semibold ${pnlClass(monthTotal)}`}>
              {monthTotal >= 0 ? '+' : ''}{fmt(monthTotal, 0)}
            </span>
            <span className="text-gray-500">{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</span>
            <span className="text-emerald-500 text-xs">{profitDays}W</span>
            <span className="text-red-500 text-xs">{lossDays}L</span>
          </div>
        </div>
        <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5 mt-1 shrink-0">
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">

        {/* Column headers */}
        <div className="grid grid-cols-8 border-b border-surface-700">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`py-2.5 text-center text-xs font-semibold uppercase tracking-wider
                ${WEEKEND_COLS.has(i) ? 'text-gray-600' : 'text-gray-400'}`}
            >
              {d}
            </div>
          ))}
          <div className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 border-l border-surface-700">
            Week
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((weekDays, wi) => {
          // Weekly total: sum in-month days
          const weekPnLs = weekDays
            .filter(d => isSameMonth(d, viewDate))
            .map(d => dailyPnL[format(d, 'yyyy-MM-dd')])
            .filter(v => v !== undefined)
          const weekTotal = weekPnLs.reduce((s, v) => s + v, 0)
          const weekHasTrades = weekPnLs.length > 0
          const isLastWeek = wi === weeks.length - 1

          return (
            <div key={wi}>
              {/* Day cells row */}
              <div className={`grid grid-cols-8 ${!isLastWeek || selectedWeekIdx === wi ? 'border-b border-surface-700/60' : ''}`}>
                {weekDays.map((day, di) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const inMonth = isSameMonth(day, viewDate)
                  const today   = isToday(day)
                  const isWeekend = WEEKEND_COLS.has(di)
                  const pnl   = dailyPnL[dateStr]
                  const count = dailyCount[dateStr]
                  const isSelected = selectedDate === dateStr
                  const hasJournal = !!journals[dateStr]
                  const isLastCol  = di === 6

                  return (
                    <div
                      key={dateStr}
                      onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                      className={`
                        relative min-h-[90px] p-2 transition-colors
                        border-r border-surface-700/40 cursor-pointer group
                        ${isLastCol ? 'border-r-0' : ''}
                        ${!inMonth
                          ? 'bg-surface-950/60'
                          : pnl !== undefined
                            ? cellBg(pnl, maxAbs)
                            : 'hover:bg-surface-800/50'
                        }
                        ${isSelected ? 'ring-2 ring-inset ring-brand/70' : ''}
                        ${today ? 'ring-1 ring-inset ring-blue-400/50' : ''}
                      `}
                    >
                      {/* Weekend overlay */}
                      {isWeekend && inMonth && (
                        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                      )}

                      {inMonth && (
                        <>
                          {/* Day number + icons */}
                          <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className={`text-xs font-medium leading-none
                              ${today ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                              {format(day, 'd')}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {hasJournal && <BookText className="w-2.5 h-2.5 text-blue-400/70" />}
                              {pnl === undefined && (
                                <button
                                  onClick={e => { e.stopPropagation(); setAddTradeDate(dateStr) }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                                >
                                  <Plus className="w-2.5 h-2.5 text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* PnL + trade count — centered in remaining space */}
                          {pnl !== undefined ? (
                            <div className="flex flex-col items-center justify-center relative z-10"
                                 style={{ minHeight: 56 }}>
                              <span className={`text-base font-bold font-mono leading-tight ${pnlText(pnl)}`}>
                                {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5">
                                {count} trade{count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <div style={{ minHeight: 56 }} />
                          )}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Weekly total cell */}
                <div className={`min-h-[90px] p-2 border-l border-surface-700/60 flex flex-col items-center justify-center gap-1
                  ${weekHasTrades ? cellBg(weekTotal, maxAbs) : 'bg-surface-950/40'}`}>
                  <span className="text-xs text-gray-600 font-medium">Wk {wi + 1}</span>
                  {weekHasTrades && (
                    <span className={`text-sm font-bold font-mono leading-tight ${pnlText(weekTotal)}`}>
                      {weekTotal >= 0 ? '+' : ''}{fmt(weekTotal, 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Drill-down panel — shown below the week that contains the selected date */}
              {selectedWeekIdx === wi && selectedDate && (
                <div className="border-b border-surface-700 bg-surface-900/80 animate-slide-in">
                  <DrillDown
                    dateStr={selectedDate}
                    trades={selectedTrades}
                    journal={selectedJournal}
                    pnl={selectedPnL}
                    fmt={fmt}
                    onClose={() => setSelectedDate(null)}
                    onAddTrade={() => setAddTradeDate(selectedDate)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 justify-center flex-wrap text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.08, 0.18, 0.30, 0.42].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(52,211,153,${o})` }} />
            ))}
          </div>
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.08, 0.18, 0.30, 0.42].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(248,113,113,${o})` }} />
            ))}
          </div>
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <BookText className="w-3.5 h-3.5 text-blue-400/70" />Journal
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm ring-1 ring-blue-400/50 bg-transparent" />Today
        </div>
      </div>

      {addTradeDate && (
        <AddTradeModal prefillDate={addTradeDate} onClose={() => setAddTradeDate(null)} />
      )}
    </div>
  )
}

function DrillDown({ dateStr, trades, journal, pnl, fmt, onClose, onAddTrade }) {
  const displayDate = format(parseISO(dateStr + 'T12:00:00'), 'EEEE, MMMM d')
  const totalPnL = trades.reduce((s, t) => s + Number(t.pnl), 0)

  return (
    <div className="p-4">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">{displayDate}</h3>
          {pnl !== undefined && (
            <span className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnl >= 0 ? '+' : ''}{fmt(pnl)}
            </span>
          )}
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trades column */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trades {trades.length > 0 ? `(${trades.length})` : ''}
            </p>
            <button
              onClick={onAddTrade}
              className="flex items-center gap-1 text-xs text-brand hover:text-brand-hover"
            >
              <Plus className="w-3 h-3" />Add trade
            </button>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">No trades logged for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {Number(t.pnl) >= 0
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <div className="flex items-center gap-1.5">
                      {t.instrument && <span className="badge badge-blue text-xs">{t.instrument}</span>}
                      {t.session    && <span className="badge badge-gray text-xs">{t.session}</span>}
                      {!t.instrument && !t.session && <span className="text-xs text-gray-600">—</span>}
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number(t.pnl) >= 0 ? '+' : ''}{fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
              {trades.length > 1 && (
                <div className="flex justify-end pt-1">
                  <span className={`text-xs font-mono font-semibold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    Total: {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Journal column */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookText className="w-3.5 h-3.5 text-blue-400" />Journal
            </p>
            <a href={`/journal?date=${dateStr}`} className="text-xs text-blue-400 hover:text-blue-300">
              {journal ? 'Edit' : 'Write'} →
            </a>
          </div>
          {journal ? (
            <div className="space-y-2">
              {journal.market_condition && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Market:</span>
                  <span className="badge badge-blue text-xs">{journal.market_condition}</span>
                </div>
              )}
              {journal.mindset_rating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Mindset:</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`w-2.5 h-2.5 rounded-full ${n <= journal.mindset_rating ? 'bg-brand' : 'bg-surface-700'}`} />
                    ))}
                  </div>
                </div>
              )}
              {journal.premarket && (
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Pre-market</p>
                  <p className="text-xs text-gray-400 line-clamp-3 bg-surface-800 rounded-lg px-2.5 py-2">{journal.premarket}</p>
                </div>
              )}
              {journal.postmarket && (
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Post-market</p>
                  <p className="text-xs text-gray-400 line-clamp-3 bg-surface-800 rounded-lg px-2.5 py-2">{journal.postmarket}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600 py-2">No journal entry for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}
