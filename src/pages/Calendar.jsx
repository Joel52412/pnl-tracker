import { useState, useEffect } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { getDailyPnLMap } from '../utils/calculations'
import { formatCurrency, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import AddTradeModal from '../components/AddTradeModal'
import { ChevronLeft, ChevronRight, Plus, BookText, X, TrendingUp, TrendingDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pnlIntensity(pnl, maxAbs) {
  if (pnl === null || pnl === undefined) return ''
  if (pnl === 0) return 'bg-surface-700/50'
  if (maxAbs === 0) return pnl > 0 ? 'bg-emerald-900/50' : 'bg-red-900/50'
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs)
  if (pnl > 0) {
    if (intensity > 0.75) return 'bg-emerald-500/35'
    if (intensity > 0.5) return 'bg-emerald-500/22'
    if (intensity > 0.25) return 'bg-emerald-500/14'
    return 'bg-emerald-500/7'
  } else {
    if (intensity > 0.75) return 'bg-red-500/35'
    if (intensity > 0.5) return 'bg-red-500/22'
    if (intensity > 0.25) return 'bg-red-500/14'
    return 'bg-red-500/7'
  }
}

function pnlTextColor(pnl) {
  if (pnl === undefined || pnl === null) return 'text-gray-600'
  if (pnl > 0) return 'text-emerald-400'
  if (pnl < 0) return 'text-red-400'
  return 'text-gray-500'
}

export default function Calendar() {
  const { trades, selectedAccount, loadingTrades } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [addTradeDate, setAddTradeDate] = useState(null)
  const [journals, setJournals] = useState({}) // dateStr -> journal

  const dailyMap = getDailyPnLMap(trades)

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

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthPnLs = monthDays.map(d => dailyMap[format(d, 'yyyy-MM-dd')]).filter(v => v !== undefined)
  const monthTotal = monthPnLs.reduce((s, v) => s + v, 0)
  const profitDays = monthPnLs.filter(v => v > 0).length
  const lossDays = monthPnLs.filter(v => v < 0).length

  const allVals = Object.values(dailyMap)
  const maxAbs = allVals.length > 0 ? Math.max(...allVals.map(Math.abs)) : 1

  // Build day trades for drill-down
  const selectedTrades = selectedDate
    ? trades.filter(t => t.date === selectedDate)
    : []
  const selectedJournal = selectedDate ? journals[selectedDate] : null
  const selectedPnL = selectedDate !== null ? dailyMap[selectedDate] : undefined

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-white w-36 text-center">{format(viewDate, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <div className={`text-lg font-bold font-mono ${pnlClass(monthTotal)}`}>{fmt(monthTotal, 0)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Month Total</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold text-white">{monthPnLs.length}</div>
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

      <div className={`flex gap-5 ${selectedDate ? 'items-start' : ''}`}>
        {/* Calendar grid */}
        <div className="card overflow-hidden flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-surface-700">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const pnl = dailyMap[dateStr]
              const inMonth = isSameMonth(day, viewDate)
              const today = isToday(day)
              const isSelected = selectedDate === dateStr
              const hasJournal = !!journals[dateStr]
              const isLastRow = idx >= calDays.length - 7
              const isLastCol = (idx + 1) % 7 === 0

              return (
                <div
                  key={dateStr}
                  onClick={() => inMonth && setSelectedDate(isSelected ? null : dateStr)}
                  className={`
                    relative min-h-[70px] sm:min-h-[80px] p-2 border-b border-r border-surface-700/50
                    transition-colors cursor-pointer group
                    ${!inMonth ? 'opacity-25 pointer-events-none' : ''}
                    ${pnl !== undefined ? pnlIntensity(pnl, maxAbs) : 'hover:bg-surface-800/60'}
                    ${today ? 'ring-1 ring-inset ring-brand/50' : ''}
                    ${isSelected ? 'ring-2 ring-inset ring-brand' : ''}
                    ${isLastRow ? 'border-b-0' : ''}
                    ${isLastCol ? 'border-r-0' : ''}
                  `}
                >
                  {/* Day number row */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium leading-none ${today ? 'text-brand' : inMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {hasJournal && (
                        <BookText className="w-2.5 h-2.5 text-blue-400 opacity-70" />
                      )}
                      {inMonth && pnl === undefined && (
                        <button
                          onClick={e => { e.stopPropagation(); setAddTradeDate(dateStr) }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface-600 rounded transition-all"
                        >
                          <Plus className="w-2.5 h-2.5 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PnL value */}
                  {pnl !== undefined && (
                    <div className={`text-xs font-mono font-semibold leading-tight ${pnlTextColor(pnl)}`}>
                      {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Drill-down panel */}
        {selectedDate && (
          <div className="card w-72 shrink-0 animate-slide-in">
            <div className="card-header flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{format(parseISO(selectedDate), 'EEE, MMM d')}</h3>
                {selectedPnL !== undefined && (
                  <span className={`text-xs font-mono font-semibold ${pnlTextColor(selectedPnL)}`}>
                    {selectedPnL >= 0 ? '+' : ''}{fmt(selectedPnL)}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedDate(null)} className="btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              {/* Trades */}
              {selectedTrades.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500 mb-2">No trades this day</p>
                  <button
                    onClick={() => setAddTradeDate(selectedDate)}
                    className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 mx-auto"
                  >
                    <Plus className="w-3 h-3" />Log trade
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Trades ({selectedTrades.length})</p>
                  <div className="space-y-1">
                    {selectedTrades.map(t => (
                      <div key={t.id} className="flex items-center justify-between bg-surface-800 rounded-lg px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          {Number(t.pnl) >= 0
                            ? <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                            : <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />}
                          <div>
                            {t.instrument && <span className="badge badge-blue text-xs">{t.instrument}</span>}
                            {t.session && <span className="badge badge-gray text-xs ml-1">{t.session}</span>}
                            {!t.instrument && !t.session && <span className="text-xs text-gray-500">Trade</span>}
                          </div>
                        </div>
                        <span className={`text-xs font-mono font-semibold ${pnlClass(t.pnl)}`}>
                          {Number(t.pnl) >= 0 ? '+' : ''}{fmt(Number(t.pnl))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setAddTradeDate(selectedDate)}
                    className="btn-ghost w-full mt-2 py-1.5 text-xs flex items-center gap-1.5 justify-center text-gray-500"
                  >
                    <Plus className="w-3 h-3" />Add another
                  </button>
                </div>
              )}

              {/* Journal entry */}
              {selectedJournal ? (
                <div className="border-t border-surface-700 pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookText className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-xs font-medium text-gray-400">Journal</p>
                  </div>
                  {selectedJournal.market_condition && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-gray-500">Market:</span>
                      <span className="badge badge-blue text-xs">{selectedJournal.market_condition}</span>
                    </div>
                  )}
                  {selectedJournal.mindset_rating && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-gray-500">Mindset:</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-2.5 h-2.5 rounded-full ${n <= selectedJournal.mindset_rating ? 'bg-brand' : 'bg-surface-700'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedJournal.premarket && (
                    <div className="mt-1.5">
                      <p className="text-xs text-gray-600 mb-0.5">Pre-market</p>
                      <p className="text-xs text-gray-400 line-clamp-3">{selectedJournal.premarket}</p>
                    </div>
                  )}
                  {selectedJournal.postmarket && (
                    <div className="mt-1.5">
                      <p className="text-xs text-gray-600 mb-0.5">Post-market</p>
                      <p className="text-xs text-gray-400 line-clamp-3">{selectedJournal.postmarket}</p>
                    </div>
                  )}
                  <a href={`/journal?date=${selectedDate}`} className="block text-xs text-brand hover:text-brand-hover mt-2">
                    Edit entry →
                  </a>
                </div>
              ) : (
                <div className="border-t border-surface-700 pt-3 text-center">
                  <p className="text-xs text-gray-600 mb-2">No journal entry</p>
                  <a href={`/journal?date=${selectedDate}`} className="btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-blue-400">
                    <BookText className="w-3 h-3" />Write journal
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.08, 0.2, 0.35, 0.5].map((o, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ background: `rgba(52,211,153,${o})` }} />
            ))}
          </div>
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0.08, 0.2, 0.35, 0.5].map((o, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ background: `rgba(248,113,113,${o})` }} />
            ))}
          </div>
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <BookText className="w-3.5 h-3.5 text-blue-400" />
          Has journal
        </div>
      </div>

      {addTradeDate && <AddTradeModal prefillDate={addTradeDate} onClose={() => setAddTradeDate(null)} />}
    </div>
  )
}
