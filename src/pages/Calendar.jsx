import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, BookText, X, Plus, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, Flame } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns'
import { supabase } from '../lib/supabase'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKEND_COLS = new Set([0, 6])

// Returns inline background color string for a calendar cell
function cellBgColor(pnl, maxAbs) {
  if (pnl === undefined || pnl === null) return null
  if (pnl === 0) return 'rgba(255,255,255,0.02)'
  if (maxAbs === 0) return pnl > 0 ? 'rgba(0,211,149,0.12)' : 'rgba(255,71,87,0.10)'
  const ratio = Math.min(1, Math.abs(pnl) / maxAbs)
  if (pnl > 0) {
    const alpha = 0.04 + ratio * 0.20
    return `rgba(0,211,149,${alpha.toFixed(3)})`
  } else {
    const alpha = 0.04 + ratio * 0.16
    return `rgba(255,71,87,${alpha.toFixed(3)})`
  }
}

function pnlTextClass(pnl) {
  if (pnl === undefined || pnl === null) return 'pnl-zero'
  if (pnl > 0) return 'pnl-pos'
  if (pnl < 0) return 'pnl-neg'
  return 'pnl-zero'
}

// Compute current win/loss streak from daily PnLs
function calcStreak(dailyPnL) {
  const dates = Object.keys(dailyPnL).sort()
  if (dates.length === 0) return null
  let streak = 0
  for (let i = dates.length - 1; i >= 0; i--) {
    const pnl = dailyPnL[dates[i]]
    if (pnl > 0) {
      if (streak >= 0) streak++
      else break
    } else if (pnl < 0) {
      if (streak <= 0) streak--
      else break
    } else {
      break
    }
  }
  return streak
}

export default function Calendar() {
  const { trades, selectedAccount } = useAccount()
  const fmt = useMoney()

  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)
  const [journals, setJournals] = useState({})
  const [showYearPicker, setShowYearPicker] = useState(false)

  useEffect(() => {
    setJournals({})
    setSelectedDate(null)
    if (!selectedAccount) return
    let cancelled = false
    supabase
      .from('journals')
      .select('*')
      .eq('account_id', selectedAccount.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Failed to load journals:', error); return }
        if (data) {
          const map = {}
          data.forEach(j => { map[String(j.date).slice(0, 10)] = j })
          setJournals(map)
        }
      })
    return () => { cancelled = true }
  }, [selectedAccount])

  const prevMonth = useCallback(() => setViewDate(d => subMonths(d, 1)), [])
  const nextMonth = useCallback(() => setViewDate(d => addMonths(d, 1)), [])
  const goToday = useCallback(() => { setViewDate(new Date()); setSelectedDate(null) }, [])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') prevMonth()
      if (e.key === 'ArrowRight') nextMonth()
      if (e.key === 'Escape') setSelectedDate(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevMonth, nextMonth])

  const dailyPnL = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const d = String(t.date || '').slice(0, 10)
      if (!d) return
      map[d] = (map[d] || 0) + Number(t.pnl || 0)
    })
    return map
  }, [trades])

  const dailyCount = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const d = String(t.date || '').slice(0, 10)
      if (!d) return
      map[d] = (map[d] || 0) + 1
    })
    return map
  }, [trades])

  const dailyWinners = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      const d = String(t.date || '').slice(0, 10)
      if (!d) return
      if (!map[d]) map[d] = { wins: 0, losses: 0 }
      if (Number(t.pnl) > 0) map[d].wins++
      else if (Number(t.pnl) < 0) map[d].losses++
    })
    return map
  }, [trades])

  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd })

  const weeks = []
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7))

  const monthDays  = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthPnLs  = monthDays.map(d => dailyPnL[format(d, 'yyyy-MM-dd')]).filter(v => v !== undefined)
  const monthTotal = monthPnLs.reduce((s, v) => s + v, 0)
  const tradingDays = monthPnLs.length
  const profitDays  = monthPnLs.filter(v => v > 0).length
  const lossDays    = monthPnLs.filter(v => v < 0).length
  const beDays      = monthPnLs.filter(v => v === 0).length
  const maxAbs      = monthPnLs.length > 0 ? Math.max(...monthPnLs.map(Math.abs)) : 1

  const streak = useMemo(() => calcStreak(dailyPnL), [dailyPnL])

  const selectedTrades  = selectedDate ? trades.filter(t => String(t.date || '').slice(0, 10) === selectedDate) : []
  const selectedJournal = selectedDate ? journals[selectedDate] : null
  const selectedPnL     = selectedDate != null ? dailyPnL[selectedDate] : undefined
  const selectedWeekIdx = selectedDate
    ? weeks.findIndex(w => w.some(d => format(d, 'yyyy-MM-dd') === selectedDate))
    : -1

  const year = viewDate.getFullYear()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

      {/* Month nav header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setShowYearPicker(v => !v)} className="text-xl text-white font-medium hover:text-brand transition-colors">
              {format(viewDate, 'MMMM yyyy')}
            </button>
            <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5 ml-1">Today</button>
          </div>

          {/* Monthly summary bar */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className={`font-mono text-sm ${pnlClass(monthTotal)}`}>
              {monthTotal >= 0 ? '+' : ''}{fmt(monthTotal, 0)}
            </span>
            <span className="text-xs text-gray-500">{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</span>
            {profitDays > 0 && <span className="text-xs text-emerald-400">{profitDays}W</span>}
            {lossDays > 0 && <span className="text-xs text-red-400">{lossDays}L</span>}
            {beDays > 0 && <span className="text-xs text-gray-500">{beDays}BE</span>}
            {streak !== null && streak !== 0 && (
              <span className={`text-xs flex items-center gap-1 ${streak > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <Flame className="w-3 h-3" />
                {streak > 0 ? `+${streak}` : streak} streak
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Year quick-picker */}
      {showYearPicker && (
        <div className="card p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Quick Jump</span>
            <button onClick={() => setShowYearPicker(false)} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const mDate = new Date(year, i, 1)
              const isCurrent = isSameMonth(mDate, viewDate)
              const mStr = format(mDate, 'yyyy-MM')
              const mPnL = Object.entries(dailyPnL)
                .filter(([d]) => d.startsWith(mStr))
                .reduce((s, [, v]) => s + v, 0)
              return (
                <button
                  key={i}
                  onClick={() => { setViewDate(mDate); setShowYearPicker(false) }}
                  className={`px-2 py-2 text-xs font-medium transition-colors ${isCurrent ? 'bg-brand/20 text-brand border border-brand/30' : 'text-gray-400 hover:bg-surface-800 hover:text-white border border-transparent'}`}
                >
                  <div>{format(mDate, 'MMM')}</div>
                  {mPnL !== 0 && <div className={`text-[10px] font-mono mt-0.5 ${pnlClass(mPnL)}`}>{fmt(mPnL, 0)}</div>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => setViewDate(d => subMonths(d, 12))} className="btn-ghost text-xs px-2 py-1">← {year - 1}</button>
            <button onClick={() => setViewDate(d => addMonths(d, 12))} className="btn-ghost text-xs px-2 py-1">{year + 1} →</button>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="card overflow-hidden">

        {/* Column headers */}
        <div className="grid grid-cols-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={d} className="py-2 text-center text-[10px] uppercase tracking-wider font-medium"
              style={{ color: WEEKEND_COLS.has(i) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)' }}>
              {d}
            </div>
          ))}
          <div className="py-2 text-center text-[10px] uppercase tracking-wider font-medium"
            style={{ color: 'rgba(255,255,255,0.25)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            Week
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((weekDays, wi) => {
          const weekPnLs = weekDays
            .filter(d => isSameMonth(d, viewDate))
            .map(d => dailyPnL[format(d, 'yyyy-MM-dd')])
            .filter(v => v !== undefined)
          const weekTotal   = weekPnLs.reduce((s, v) => s + v, 0)
          const weekHasTrades = weekPnLs.length > 0
          const isLastWeek  = wi === weeks.length - 1

          return (
            <div key={wi}>
              {/* Day cells row */}
              <div
                className="grid grid-cols-8"
                style={{ borderBottom: (!isLastWeek || selectedWeekIdx === wi) ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                {weekDays.map((day, di) => {
                  const dateStr    = format(day, 'yyyy-MM-dd')
                  const inMonth    = isSameMonth(day, viewDate)
                  const today      = isToday(day)
                  const isWeekend  = WEEKEND_COLS.has(di)
                  const pnl        = dailyPnL[dateStr]
                  const count      = dailyCount[dateStr]
                  const isSelected = selectedDate === dateStr
                  const hasJournal = !!journals[dateStr]
                  const wl         = dailyWinners[dateStr]
                  const isLastCol  = di === 6

                  // Build inline cell style
                  const bgColor   = inMonth && pnl !== undefined ? cellBgColor(pnl, maxAbs) : null
                  const cellStyle = {
                    minHeight: 88,
                    borderRight: isLastCol ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    background: !inMonth ? 'rgba(255,255,255,0.01)' : (bgColor || 'transparent'),
                    transition: 'background 0.15s ease',
                    position: 'relative',
                    cursor: inMonth ? 'pointer' : 'default',
                  }
                  if (today) {
                    cellStyle.boxShadow = 'inset 0 0 0 1px rgba(59,130,246,0.5)'
                  }
                  if (isSelected) {
                    cellStyle.boxShadow = 'inset 0 0 0 1px rgba(0,211,149,0.6)'
                  }

                  return (
                    <div
                      key={dateStr}
                      onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                      className="p-2 group"
                      style={cellStyle}
                    >
                      {/* Weekend dim overlay */}
                      {isWeekend && inMonth && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.08)', pointerEvents: 'none' }} />
                      )}

                      {inMonth && (
                        <>
                          {/* Day number + icons */}
                          <div className="flex items-center justify-between mb-1" style={{ position: 'relative', zIndex: 1 }}>
                            <div className="flex items-center gap-1">
                              <span style={{
                                fontSize: 11,
                                fontWeight: today ? 700 : 500,
                                color: today ? '#58a6ff' : 'rgba(255,255,255,0.45)',
                                lineHeight: 1,
                              }}>
                                {format(day, 'd')}
                              </span>
                              {today && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {hasJournal && <BookText style={{ width: 9, height: 9, color: 'rgba(96,165,250,0.6)' }} />}
                              {pnl === undefined && (
                                <button
                                  onClick={e => { e.stopPropagation(); setAddTradeDate(dateStr) }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                                  style={{ background: 'rgba(255,255,255,0.06)' }}
                                >
                                  <Plus style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.4)' }} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* PnL + trade count */}
                          {pnl !== undefined ? (
                            <div className="flex flex-col items-center justify-center" style={{ minHeight: 50, position: 'relative', zIndex: 1 }}>
                              <span className={`font-mono ${pnlTextClass(pnl)}`} style={{ fontSize: 15, fontWeight: 500 }}>
                                {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                              </span>
                              {count > 1 && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                  {count} trades
                                </span>
                              )}
                              {/* Win/loss dots */}
                              {wl && (wl.wins > 0 || wl.losses > 0) && (
                                <div className="flex items-center gap-0.5 mt-1">
                                  {Array.from({ length: Math.min(wl.wins, 4) }, (_, i) => (
                                    <div key={`w${i}`} className="w-1 h-1 rounded-full bg-emerald-500/70" />
                                  ))}
                                  {Array.from({ length: Math.min(wl.losses, 4) }, (_, i) => (
                                    <div key={`l${i}`} className="w-1 h-1 rounded-full bg-red-500/70" />
                                  ))}
                                  {wl.wins + wl.losses > 4 && (
                                    <span className="text-[8px] text-gray-600">+{wl.wins + wl.losses - 4}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ minHeight: 50 }} />
                          )}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Weekly total cell */}
                <div
                  className="flex flex-col items-center justify-center gap-1 p-2"
                  style={{
                    minHeight: 88,
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: weekHasTrades ? (cellBgColor(weekTotal, maxAbs) || 'rgba(255,255,255,0.01)') : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>Wk {wi + 1}</span>
                  {weekHasTrades && (
                    <span className={`font-mono ${pnlTextClass(weekTotal)}`} style={{ fontSize: 13, fontWeight: 500 }}>
                      {weekTotal >= 0 ? '+' : ''}{fmt(weekTotal, 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Drill-down panel */}
              {selectedWeekIdx === wi && selectedDate && (
                <div className="animate-slide-in" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,10,15,0.5)' }}>
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
      <div className="flex items-center gap-5 justify-center flex-wrap text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.05, 0.12, 0.20, 0.28].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(0,211,149,${o})` }} />
            ))}
          </div>
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.05, 0.10, 0.16, 0.22].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(255,71,87,${o})` }} />
            ))}
          </div>
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <BookText style={{ width: 12, height: 12, color: 'rgba(96,165,250,0.6)' }} /> Journal
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400/60" /> Today
        </div>
      </div>

      {addTradeDate && (
        <AddTradeModal prefillDate={addTradeDate} onClose={() => setAddTradeDate(null)} />
      )}
    </div>
  )
}

function DrillDown({ dateStr, trades, journal, pnl, fmt, onClose, onAddTrade }) {
  const displayDate = format(new Date(dateStr + 'T12:00:00'), 'EEEE, MMMM d')
  const totalPnL = trades.reduce((s, t) => s + Number(t.pnl), 0)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm text-white">{displayDate}</h3>
          {pnl !== undefined && (
            <span className={`text-sm font-mono ${pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
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
            <p className="stat-label">Trades {trades.length > 0 ? `(${trades.length})` : ''}</p>
            <button onClick={onAddTrade} className="flex items-center gap-1 text-xs hover:text-brand transition-colors" style={{ color: '#00d395' }}>
              <Plus className="w-3 h-3" />Add trade
            </button>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No trades logged for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2.5">
                    {Number(t.pnl) > 0
                      ? <TrendingUp style={{ width: 14, height: 14, color: '#00d395', flexShrink: 0 }} />
                      : Number(t.pnl) < 0
                        ? <TrendingDown style={{ width: 14, height: 14, color: '#ff4757', flexShrink: 0 }} />
                        : <Minus style={{ width: 14, height: 14, color: '#6b7280', flexShrink: 0 }} />}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.instrument && <span className="badge badge-blue text-xs">{t.instrument}</span>}
                      {t.session    && <span className="badge badge-gray text-xs">{t.session}</span>}
                      {Number(t.pnl) === 0 && <span className="badge badge-amber text-xs">BE</span>}
                      {!t.instrument && !t.session && Number(t.pnl) !== 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }} className="text-xs">—</span>}
                    </div>
                  </div>
                  <span className={`text-sm font-mono ${Number(t.pnl) > 0 ? 'pnl-pos' : Number(t.pnl) < 0 ? 'pnl-neg' : 'pnl-zero'}`}>
                    {Number(t.pnl) > 0 ? '+' : ''}{fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
              {trades.length > 1 && (
                <div className="flex justify-end pt-1">
                  <span className={`text-xs font-mono ${totalPnL >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
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
            <p className="stat-label flex items-center gap-1.5">
              <BookText style={{ width: 13, height: 13, color: '#60a5fa' }} />Journal
            </p>
            <a href={`/journal?date=${dateStr}`} className="text-xs hover:text-brand transition-colors" style={{ color: '#60a5fa' }}>
              {journal ? 'Edit' : 'Write'} →
            </a>
          </div>
          {journal ? (
            <div className="space-y-2">
              {journal.market_condition && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Market:</span>
                  <span className="badge badge-blue text-xs">{journal.market_condition}</span>
                </div>
              )}
              {journal.mindset_rating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Mindset:</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: n <= journal.mindset_rating ? '#00d395' : 'rgba(255,255,255,0.1)',
                      }} />
                    ))}
                  </div>
                </div>
              )}
              {journal.premarket && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Pre-market</p>
                  <p className="text-xs rounded-lg px-2.5 py-2 line-clamp-3"
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)' }}
                  >{journal.premarket}</p>
                </div>
              )}
              {journal.postmarket && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Post-market</p>
                  <p className="text-xs rounded-lg px-2.5 py-2 line-clamp-3"
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)' }}
                  >{journal.postmarket}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No journal entry for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}
