import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, BookText, X, Plus } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, parseISO,
} from 'date-fns'
import { supabase } from '../lib/supabase'

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

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

  // Cell background color based on PnL - TopStep style
  function getCellBg(pnl) {
    if (pnl === undefined || pnl === null) return '#111318'
    if (pnl === 0) return '#111318'
    return pnl > 0 ? '#1a2e1f' : '#2d1515'
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">

      {/* Month total at top */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
          <h1 className="text-sm font-semibold" style={{ color: '#8b949e', width: 110 }}>{format(viewDate, 'MMMM yyyy')}</h1>
          <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <span className={`text-base font-bold ${monthTotal >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
          {monthTotal >= 0 ? '+' : ''}{fmt(monthTotal, 0)}
        </span>
        <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5">Today</button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {/* Column headers */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr) 110px', borderBottom: '1px solid #1e2028' }}>
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>{d}</div>
          ))}
          <div className="py-2 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e', borderLeft: '1px solid #1e2028' }}>Week</div>
        </div>

        {/* Weeks */}
        {weeks.map((weekDays, wi) => {
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
              <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr) 110px', borderBottom: (!isLastWeek || selectedWeekIdx === wi) ? '1px solid #1e2028' : 'none' }}>
                {weekDays.map((day, di) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const inMonth = isSameMonth(day, viewDate)
                  const today = isToday(day)
                  const pnl = dailyPnL[dateStr]
                  const count = dailyCount[dateStr]
                  const isSelected = selectedDate === dateStr
                  const hasJournal = !!journals[dateStr]
                  const isLastCol = di === 6

                  const bgColor = inMonth && pnl !== undefined ? getCellBg(pnl) : '#111318'
                  const opacity = !inMonth ? 0.4 : 1
                  const dayNumColor = (pnl !== undefined && pnl !== 0) ? 'rgba(255,255,255,0.35)' : '#484f58'

                  let cellStyle = {
                    aspectRatio: 1,
                    borderRight: isLastCol ? 'none' : '1px solid #1e2028',
                    background: bgColor,
                    opacity,
                    position: 'relative',
                    cursor: inMonth ? 'pointer' : 'default',
                  }

                  if (today && !isSelected) {
                    cellStyle.boxShadow = 'inset 0 0 0 2px #3b82f6'
                  }
                  if (isSelected) {
                    cellStyle.boxShadow = 'inset 0 0 0 2px #3fb950'
                  }

                  return (
                    <div
                      key={dateStr}
                      onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                      className="group"
                      style={cellStyle}
                    >
                      {inMonth && (
                        <>
                          {/* Day number top-left */}
                          {today ? (
                            <div style={{
                              position: 'absolute',
                              top: 6, left: 6,
                              width: 17, height: 17,
                              borderRadius: '50%',
                              background: '#3b82f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 600, color: '#fff',
                            }}>
                              {format(day, 'd')}
                            </div>
                          ) : (
                            <span style={{
                              position: 'absolute',
                              top: 6, left: 8,
                              fontSize: 10,
                              color: dayNumColor,
                              lineHeight: 1,
                            }}>
                              {format(day, 'd')}
                            </span>
                          )}

                          {/* PnL centered */}
                          {pnl !== undefined ? (
                            <div className="flex flex-col items-center justify-center" style={{ position: 'absolute', inset: 0, paddingTop: 20 }}>
                              <span className={`font-bold font-mono leading-tight ${pnl > 0 ? 'text-[#4ade80]' : pnl < 0 ? 'text-[#f87171]' : ''}`} style={{ fontSize: 12 }}>
                                {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                              </span>
                              {/* Trade count bottom centered */}
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                                {count}
                              </span>
                            </div>
                          ) : null}

                          {/* Journal indicator */}
                          {hasJournal && (
                            <BookText style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, color: 'rgba(96,165,250,0.7)' }} />
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
                    background: '#161b22',
                    borderLeft: '1px solid #1e2028',
                  }}
                >
                  <span style={{ fontSize: 9, color: '#8b949e', fontWeight: 500 }}>Wk {wi + 1}</span>
                  {weekHasTrades && (
                    <span className={`font-bold font-mono leading-tight ${weekTotal >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`} style={{ fontSize: 12 }}>
                      {weekTotal >= 0 ? '+' : ''}{fmt(weekTotal, 0)}
                    </span>
                  )}
                  {weekHasTrades && (
                    <span style={{ fontSize: 9, color: '#8b949e' }}>
                      {weekPnLs.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Drill-down panel */}
              {selectedWeekIdx === wi && selectedDate && (
                <div style={{ borderBottom: '1px solid #1e2028', background: '#0d0f14' }}>
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

      {addTradeDate && (
        <AddTradeModal prefillDate={addTradeDate} onClose={() => setAddTradeDate(null)} />
      )}
    </div>
  )
}

function DrillDown({ dateStr, trades, journal, pnl, fmt, onClose, onAddTrade }) {
  const displayDate = format(parseISO(dateStr + 'T12:00:00'), 'EEEE, MMMM d')

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">{displayDate}</h3>
          {pnl !== undefined && (
            <span className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
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
            <p className="section-label">Trades {trades.length > 0 ? `(${trades.length})` : ''}</p>
            <button onClick={onAddTrade} className="flex items-center gap-1 text-xs" style={{ color: '#3fb950' }}>
              <Plus className="w-3 h-3" />Add trade
            </button>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs py-2" style={{ color: '#484f58' }}>No trades logged for this day.</p>
          ) : (
            <div className="space-y-1.5">
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded" style={{ background: '#161b22' }}>
                  <span className="text-gray-400">{t.instrument || '—'}</span>
                  <span className={`font-mono font-semibold ${t.pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                    {t.pnl >= 0 ? '+' : ''}{fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journal column */}
        <div>
          <p className="section-label mb-2">Journal</p>
          {journal ? (
            <div className="text-xs space-y-2 p-3 rounded" style={{ background: '#161b22' }}>
              {journal.market_condition && (
                <div><span style={{ color: '#8b949e' }}>Condition:</span> <span className="badge badge-blue">{journal.market_condition}</span></div>
              )}
              {journal.mindset_rating && (
                <div><span style={{ color: '#8b949e' }}>Mindset:</span> {'●'.repeat(journal.mindset_rating)}{'○'.repeat(5 - journal.mindset_rating)}</div>
              )}
              {journal.premarket && (
                <div><span style={{ color: '#8b949e' }}>Pre:</span> <span style={{ color: '#c9d1d9' }}>{journal.premarket}</span></div>
              )}
              {journal.postmarket && (
                <div><span style={{ color: '#8b949e' }}>Post:</span> <span style={{ color: '#c9d1d9' }}>{journal.postmarket}</span></div>
              )}
            </div>
          ) : (
            <p className="text-xs py-2" style={{ color: '#484f58' }}>No journal entry for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}
