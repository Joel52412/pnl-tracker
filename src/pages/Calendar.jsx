import { useState, useEffect, useMemo } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { useAuth } from '../contexts/AuthContext'
import { pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, BookText, X, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, parseISO,
} from 'date-fns'
import { supabase } from '../lib/supabase'

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WEEKEND_COLS = new Set([0, 6])

// Cell background + border per spec
function cellStyle(pnl, today, selected) {
  let bg = '#161b22'
  let border = '1px solid #21262d'

  if (pnl !== undefined && pnl !== null) {
    if (pnl > 0)      { bg = '#1a2e1f'; border = '1px solid #2ea043' }
    else if (pnl < 0) { bg = '#2d1a1a'; border = '1px solid #a3201a' }
  }

  if (today)    border = '2px solid #388bfd'
  if (selected) border = '2px solid #00d395'

  return { background: bg, border, borderRadius: 8, minHeight: 110, position: 'relative', cursor: 'pointer', transition: 'all 0.15s ease' }
}

function pnlColor(pnl) {
  if (pnl > 0) return '#3fb950'
  if (pnl < 0) return '#f85149'
  return '#484f58'
}

export default function Calendar() {
  const { trades, selectedAccount } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()

  const [viewDate, setViewDate]     = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)
  const [journals, setJournals]     = useState({})

  useEffect(() => {
    if (!selectedAccount) return
    supabase
      .from('journals').select('*').eq('account_id', selectedAccount.id)
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

  const monthStart  = startOfMonth(viewDate)
  const monthEnd    = endOfMonth(viewDate)
  const calStart    = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd      = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calDays     = eachDayOfInterval({ start: calStart, end: calEnd })

  const weeks = []
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7))

  const monthDays   = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthPnLs   = monthDays.map(d => dailyPnL[format(d, 'yyyy-MM-dd')]).filter(v => v !== undefined)
  const monthTotal  = monthPnLs.reduce((s, v) => s + v, 0)
  const tradingDays = monthPnLs.length
  const profitDays  = monthPnLs.filter(v => v > 0).length
  const lossDays    = monthPnLs.filter(v => v < 0).length

  const selectedTrades  = selectedDate ? trades.filter(t => t.date === selectedDate) : []
  const selectedJournal = selectedDate ? journals[selectedDate] : null
  const selectedPnL     = selectedDate != null ? dailyPnL[selectedDate] : undefined
  const selectedWeekIdx = selectedDate
    ? weeks.findIndex(w => w.some(d => format(d, 'yyyy-MM-dd') === selectedDate))
    : -1

  // Grid style shared between header row and each week row
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr) 80px',
    gap: 4,
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">

      {/* Month nav header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>
            {format(viewDate, 'MMMM yyyy')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: pnlColor(monthTotal) }}>
              {monthTotal >= 0 ? '+' : ''}{fmt(monthTotal, 0)}
            </span>
            <span style={{ fontSize: 12, color: '#484f58' }}>{tradingDays} day{tradingDays !== 1 ? 's' : ''} traded</span>
            <span style={{ fontSize: 11, color: '#3fb950' }}>{profitDays}W</span>
            <span style={{ fontSize: 11, color: '#f85149' }}>{lossDays}L</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5">Today</button>
        </div>
      </div>

      {/* Calendar — no outer card, cells sit directly on page background */}
      <div>
        {/* Column headers */}
        <div style={{ ...gridStyle, marginBottom: 4 }}>
          {DAY_HEADERS.map((d, i) => (
            <div key={d} style={{
              padding: '8px 0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: WEEKEND_COLS.has(i) ? 'rgba(72,79,88,0.6)' : '#484f58',
            }}>
              {d}
            </div>
          ))}
          {/* Wk header */}
          <div style={{
            padding: '8px 0',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#484f58',
          }}>
            WK
          </div>
        </div>

        {/* Weeks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weeks.map((weekDays, wi) => {
            const weekPnLs = weekDays
              .filter(d => isSameMonth(d, viewDate))
              .map(d => dailyPnL[format(d, 'yyyy-MM-dd')])
              .filter(v => v !== undefined)
            const weekTotal     = weekPnLs.reduce((s, v) => s + v, 0)
            const weekHasTrades = weekPnLs.length > 0

            return (
              <div key={wi}>
                {/* Day cells row */}
                <div style={gridStyle}>
                  {weekDays.map((day, di) => {
                    const dateStr    = format(day, 'yyyy-MM-dd')
                    const inMonth    = isSameMonth(day, viewDate)
                    const today      = isToday(day)
                    const pnl        = dailyPnL[dateStr]
                    const count      = dailyCount[dateStr]
                    const isSelected = selectedDate === dateStr
                    const hasJournal = !!journals[dateStr]

                    if (!inMonth) {
                      return (
                        <div key={dateStr} style={{
                          minHeight: 110,
                          background: 'rgba(22,27,34,0.3)',
                          borderRadius: 8,
                          border: '1px solid rgba(33,38,45,0.4)',
                        }} />
                      )
                    }

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                        style={cellStyle(pnl, today, isSelected)}
                      >
                        {/* Day number — top left */}
                        <div style={{
                          position: 'absolute', top: 8, left: 8,
                          fontSize: 13, color: today ? '#388bfd' : '#484f58',
                          fontWeight: today ? 700 : 400,
                          lineHeight: 1,
                        }}>
                          {format(day, 'd')}
                        </div>

                        {/* Journal icon — top right */}
                        {hasJournal && (
                          <div style={{ position: 'absolute', top: 9, right: 8 }}>
                            <BookText style={{ width: 10, height: 10, color: 'rgba(96,165,250,0.6)' }} />
                          </div>
                        )}

                        {/* PnL — vertically + horizontally centered */}
                        {pnl !== undefined ? (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{
                              fontSize: 20,
                              fontWeight: 700,
                              fontFamily: 'JetBrains Mono, monospace',
                              color: pnlColor(pnl),
                              lineHeight: 1,
                            }}>
                              {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                            </span>
                          </div>
                        ) : (
                          /* Add trade button for empty days */
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <button
                              onClick={e => { e.stopPropagation(); setAddTradeDate(dateStr) }}
                              style={{
                                opacity: 0,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                padding: '3px 8px',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s',
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.4)',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}
                              className="group-hover-btn"
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                            >
                              <Plus style={{ width: 10, height: 10 }} /> Add
                            </button>
                          </div>
                        )}

                        {/* Trade count — bottom center */}
                        {count !== undefined && (
                          <div style={{
                            position: 'absolute', bottom: 8, left: 0, right: 0,
                            textAlign: 'center',
                            fontSize: 11,
                            color: '#484f58',
                            lineHeight: 1,
                          }}>
                            {count} trade{count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Weekly total cell */}
                  <div style={{
                    minHeight: 110,
                    background: '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: 8,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wk {wi + 1}</span>
                    {weekHasTrades && (
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: pnlColor(weekTotal),
                      }}>
                        {weekTotal >= 0 ? '+' : ''}{fmt(weekTotal, 0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Drill-down panel — below the selected week */}
                {selectedWeekIdx === wi && selectedDate && (
                  <div className="animate-slide-in mt-1 rounded-xl"
                    style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid #21262d' }}
                  >
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
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11, color: '#484f58' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, background: '#1a2e1f', border: '1px solid #2ea043', borderRadius: 3 }} />
          Profit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, background: '#2d1a1a', border: '1px solid #a3201a', borderRadius: 3 }} />
          Loss
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, background: '#161b22', border: '2px solid #388bfd', borderRadius: 3 }} />
          Today
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookText style={{ width: 11, height: 11, color: 'rgba(96,165,250,0.6)' }} /> Journal
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
            <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: pnlColor(pnl) }}>
              {pnl >= 0 ? '+' : ''}{fmt(pnl)}
            </span>
          )}
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trades */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="stat-label">Trades {trades.length > 0 ? `(${trades.length})` : ''}</p>
            <button onClick={onAddTrade} className="flex items-center gap-1 text-xs" style={{ color: '#00d395' }}>
              <Plus className="w-3 h-3" /> Add trade
            </button>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs py-2" style={{ color: '#484f58' }}>No trades logged for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    {Number(t.pnl) >= 0
                      ? <TrendingUp style={{ width: 14, height: 14, color: '#3fb950', flexShrink: 0 }} />
                      : <TrendingDown style={{ width: 14, height: 14, color: '#f85149', flexShrink: 0 }} />}
                    <div className="flex items-center gap-1.5">
                      {t.instrument && <span className="badge badge-blue text-xs">{t.instrument}</span>}
                      {t.session    && <span className="badge badge-gray text-xs">{t.session}</span>}
                      {!t.instrument && !t.session && <span style={{ color: '#484f58', fontSize: 12 }}>—</span>}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: pnlColor(Number(t.pnl)) }}>
                    {Number(t.pnl) >= 0 ? '+' : ''}{fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
              {trades.length > 1 && (
                <div className="flex justify-end pt-1">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: pnlColor(totalPnL) }}>
                    Total: {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Journal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="stat-label flex items-center gap-1.5">
              <BookText style={{ width: 13, height: 13, color: '#60a5fa' }} /> Journal
            </p>
            <a href={`/journal?date=${dateStr}`} style={{ fontSize: 12, color: '#60a5fa' }}>
              {journal ? 'Edit' : 'Write'} →
            </a>
          </div>
          {journal ? (
            <div className="space-y-2">
              {journal.market_condition && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: '#484f58' }}>Market:</span>
                  <span className="badge badge-blue">{journal.market_condition}</span>
                </div>
              )}
              {journal.mindset_rating && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: '#484f58' }}>Mindset:</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: n <= journal.mindset_rating ? '#00d395' : 'rgba(255,255,255,0.08)',
                      }} />
                    ))}
                  </div>
                </div>
              )}
              {journal.premarket && (
                <div>
                  <p style={{ fontSize: 11, color: '#484f58', marginBottom: 2 }}>Pre-market</p>
                  <p className="text-xs rounded-lg px-2.5 py-2 line-clamp-3"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
                  >{journal.premarket}</p>
                </div>
              )}
              {journal.postmarket && (
                <div>
                  <p style={{ fontSize: 11, color: '#484f58', marginBottom: 2 }}>Post-market</p>
                  <p className="text-xs rounded-lg px-2.5 py-2 line-clamp-3"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
                  >{journal.postmarket}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#484f58', paddingTop: 8 }}>No journal entry for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}
