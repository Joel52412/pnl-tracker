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
const WEEKEND_COLS = new Set([0, 6])

// Returns inline background color string for a calendar cell
function cellBgColor(pnl, maxAbs) {
  if (pnl === undefined || pnl === null) return null
  if (pnl === 0) return 'rgba(255,255,255,0.03)'
  if (maxAbs === 0) return pnl > 0 ? 'rgba(0,211,149,0.15)' : 'rgba(255,71,87,0.12)'
  const ratio = Math.min(1, Math.abs(pnl) / maxAbs)
  if (pnl > 0) {
    const alpha = 0.05 + ratio * 0.22
    return `rgba(0,211,149,${alpha.toFixed(2)})`
  } else {
    const alpha = 0.05 + ratio * 0.17
    return `rgba(255,71,87,${alpha.toFixed(2)})`
  }
}

function cellBorderColor(pnl) {
  if (pnl === undefined || pnl === null || pnl === 0) return null
  return pnl > 0 ? 'rgba(0,211,149,0.3)' : 'rgba(255,71,87,0.25)'
}

function pnlTextClass(pnl) {
  if (pnl === undefined || pnl === null) return 'pnl-zero'
  if (pnl > 0) return 'pnl-pos'
  if (pnl < 0) return 'pnl-neg'
  return 'pnl-zero'
}

export default function Calendar() {
  const { trades, selectedAccount } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()

  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)
  const [journals, setJournals] = useState({})

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

  const dailyPnL = useMemo(() => {
    const map = {}
    trades.forEach(t => { map[t.date] = (map[t.date] || 0) + Number(t.pnl) })
    return map
  }, [trades])

  const dailyCount = useMemo(() => {
    const map = {}
    trades.forEach(t => { map[t.date] = (map[t.date] || 0) + 1 })
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
  const maxAbs      = monthPnLs.length > 0 ? Math.max(...monthPnLs.map(Math.abs)) : 1

  const selectedTrades  = selectedDate ? trades.filter(t => t.date === selectedDate) : []
  const selectedJournal = selectedDate ? journals[selectedDate] : null
  const selectedPnL     = selectedDate != null ? dailyPnL[selectedDate] : undefined
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
            <h1 className="text-xl text-white w-44">{format(viewDate, 'MMMM yyyy')}</h1>
            <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-4 mt-1.5 pl-10 text-sm">
            <span className={`font-mono font-semibold ${pnlClass(monthTotal)}`}>
              {monthTotal >= 0 ? '+' : ''}{fmt(monthTotal, 0)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</span>
            <span style={{ color: '#00d395', fontSize: 12 }}>{profitDays}W</span>
            <span style={{ color: '#ff4757', fontSize: 12 }}>{lossDays}L</span>
          </div>
        </div>
        <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5 mt-1 shrink-0">Today</button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">

        {/* Column headers */}
        <div className="grid grid-cols-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ color: WEEKEND_COLS.has(i) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)' }}>
              {d}
            </div>
          ))}
          <div className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
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
                style={{ borderBottom: (!isLastWeek || selectedWeekIdx === wi) ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
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
                  const isLastCol  = di === 6

                  // Build inline cell style
                  const bgColor   = inMonth && pnl !== undefined ? cellBgColor(pnl, maxAbs) : null
                  const bdColor   = inMonth && pnl !== undefined ? cellBorderColor(pnl) : null
                  const cellStyle = {
                    minHeight: 90,
                    borderRight: isLastCol ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    background: !inMonth
                      ? 'rgba(255,255,255,0.01)'
                      : (bgColor || 'transparent'),
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    cursor: inMonth ? 'pointer' : 'default',
                  }
                  if (today && !isSelected) {
                    cellStyle.border = '2px solid rgba(59,130,246,0.6)'
                    cellStyle.boxShadow = '0 0 12px rgba(59,130,246,0.2)'
                    cellStyle.borderRight = undefined
                  }
                  if (isSelected) {
                    cellStyle.border = '2px solid rgba(0,211,149,0.5)'
                    cellStyle.boxShadow = '0 0 12px rgba(0,211,149,0.15)'
                    cellStyle.borderRight = undefined
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
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
                      )}

                      {inMonth && (
                        <>
                          {/* Day number + icons */}
                          <div className="flex items-center justify-between mb-1" style={{ position: 'relative', zIndex: 1 }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: today ? 700 : 500,
                              color: today ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                              lineHeight: 1,
                            }}>
                              {format(day, 'd')}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {hasJournal && <BookText style={{ width: 10, height: 10, color: 'rgba(96,165,250,0.7)' }} />}
                              {pnl === undefined && (
                                <button
                                  onClick={e => { e.stopPropagation(); setAddTradeDate(dateStr) }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                                  style={{ background: 'rgba(255,255,255,0.08)' }}
                                >
                                  <Plus style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.5)' }} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* PnL + trade count */}
                          {pnl !== undefined ? (
                            <div className="flex flex-col items-center justify-center" style={{ minHeight: 56, position: 'relative', zIndex: 1 }}>
                              <span className={`font-mono leading-tight ${pnlTextClass(pnl)}`} style={{ fontSize: 17 }}>
                                {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                              </span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
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
                <div
                  className="flex flex-col items-center justify-center gap-1 p-2"
                  style={{
                    minHeight: 90,
                    borderLeft: '1px solid rgba(255,255,255,0.07)',
                    background: weekHasTrades ? (cellBgColor(weekTotal, maxAbs) || 'transparent') : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Wk {wi + 1}</span>
                  {weekHasTrades && (
                    <span className={`font-mono leading-tight ${pnlTextClass(weekTotal)}`} style={{ fontSize: 13 }}>
                      {weekTotal >= 0 ? '+' : ''}{fmt(weekTotal, 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Drill-down panel */}
              {selectedWeekIdx === wi && selectedDate && (
                <div className="animate-slide-in" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,10,15,0.6)' }}>
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
      <div className="flex items-center gap-5 justify-center flex-wrap text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.06, 0.12, 0.18, 0.27].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(0,211,149,${o})` }} />
            ))}
          </div>
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.06, 0.10, 0.16, 0.22].map((o, i) => (
              <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(255,71,87,${o})` }} />
            ))}
          </div>
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <BookText style={{ width: 13, height: 13, color: 'rgba(96,165,250,0.7)' }} /> Journal
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm" style={{ border: '2px solid rgba(59,130,246,0.6)' }} /> Today
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">{displayDate}</h3>
          {pnl !== undefined && (
            <span className={`text-sm font-mono font-bold ${pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
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
            <button onClick={onAddTrade} className="flex items-center gap-1 text-xs" style={{ color: '#00d395' }}>
              <Plus className="w-3 h-3" />Add trade
            </button>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No trades logged for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    {Number(t.pnl) >= 0
                      ? <TrendingUp style={{ width: 14, height: 14, color: '#00d395', flexShrink: 0 }} />
                      : <TrendingDown style={{ width: 14, height: 14, color: '#ff4757', flexShrink: 0 }} />}
                    <div className="flex items-center gap-1.5">
                      {t.instrument && <span className="badge badge-blue text-xs">{t.instrument}</span>}
                      {t.session    && <span className="badge badge-gray text-xs">{t.session}</span>}
                      {!t.instrument && !t.session && <span style={{ color: 'rgba(255,255,255,0.2)' }} className="text-xs">—</span>}
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${Number(t.pnl) >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                    {Number(t.pnl) >= 0 ? '+' : ''}{fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
              {trades.length > 1 && (
                <div className="flex justify-end pt-1">
                  <span className={`text-xs font-mono font-semibold ${totalPnL >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
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
            <a href={`/journal?date=${dateStr}`} className="text-xs" style={{ color: '#60a5fa' }}>
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
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
                  >{journal.premarket}</p>
                </div>
              )}
              {journal.postmarket && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Post-market</p>
                  <p className="text-xs rounded-lg px-2.5 py-2 line-clamp-3"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
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
