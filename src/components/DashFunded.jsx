import { useState } from 'react'
import { Eye, EyeOff, Plus, Shield, Clock, Trophy, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle, DollarSign } from 'lucide-react'
import { calcFundedMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'
import PayoutModal from './PayoutModal'

function ProgressBar({ percent, colorClass }) {
  return (
    <div className="progress-bar-track">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  )
}

function WarnBanner({ message, type }) {
  const s = { warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300', critical: 'bg-red-500/10 border-red-500/30 text-red-300', breach: 'bg-red-600/20 border-red-500/50 text-red-200' }
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium ${s[type]}`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />{message}
    </div>
  )
}

export default function DashFunded({ account, trades, payouts }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const { hidden, toggle } = useHide()
  const fmt = useMoney()
  const m = calcFundedMetrics(account, trades, payouts)

  const ddBarColor = m.drawdown.warningLevel === 'critical' ? 'bg-red-500' : m.drawdown.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
  const dlBarColor = m.dailyLoss.warningLevel === 'critical' ? 'bg-red-500' : m.dailyLoss.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-blue-400'

  const alerts = []
  if (m.drawdown.breached) alerts.push({ type: 'breach', msg: 'ACCOUNT BREACHED — Drawdown floor has been hit!' })
  else if (m.drawdown.warningLevel === 'critical') alerts.push({ type: 'critical', msg: `Drawdown critical — ${fmt(m.drawdown.buffer)} remaining` })
  else if (m.drawdown.warningLevel === 'warning') alerts.push({ type: 'warning', msg: `Drawdown warning — ${fmt(m.drawdown.buffer)} buffer remaining` })
  if (m.dailyLoss.breached) alerts.push({ type: 'breach', msg: 'DAILY LOSS LIMIT HIT — Stop trading today!' })
  else if (m.dailyLoss.warningLevel === 'critical') alerts.push({ type: 'critical', msg: `Daily limit critical — ${fmt(m.dailyLoss.remaining)} remaining` })
  else if (m.dailyLoss.warningLevel === 'warning') alerts.push({ type: 'warning', msg: `Daily limit warning — ${fmt(m.dailyLoss.remaining)} remaining today` })

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{account.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Funded Account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost p-2" title={hidden ? 'Show balances' : 'Hide balances'}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {m.payout.met && !m.drawdown.breached && (
            <button onClick={() => setShowPayout(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <DollarSign className="w-4 h-4" /><span className="hidden sm:inline">Request Payout</span><span className="sm:hidden">Payout</span>
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Trade</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && <div className="space-y-2">{alerts.map((a, i) => <WarnBanner key={i} message={a.msg} type={a.type} />)}</div>}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <span className="stat-label">Balance</span>
          <div className={`stat-value mt-2 ${m.tradingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(m.currentBalance, 0)}</div>
          <div className={`text-xs font-mono mt-1 ${m.tradingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {m.tradingProfit >= 0 ? '+' : ''}{fmt(m.tradingProfit)}
          </div>
        </div>
        <div className="card p-4">
          <span className="stat-label">Today</span>
          <div className={`stat-value mt-2 ${pnlClass(m.todayPnL)}`}>{fmt(m.todayPnL)}</div>
          {m.totalWithdrawn > 0 && <div className="text-xs text-gray-600 mt-1">Taken: {fmt(m.totalWithdrawn)}</div>}
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">DD Buffer</span>
            <Shield className={`w-3.5 h-3.5 ${m.drawdown.warningLevel === 'ok' ? 'text-gray-500' : m.drawdown.warningLevel === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
          </div>
          <div className={`stat-value ${m.drawdown.breached ? 'text-red-400' : 'text-white'}`}>{fmt(Math.max(0, m.drawdown.buffer), 0)}</div>
          <div className="mt-2"><ProgressBar percent={m.drawdown.bufferPercent} colorClass={ddBarColor} /></div>
          <div className="text-xs text-gray-600 mt-1">Floor: {fmt(m.drawdown.floor, 0)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Daily Limit</span>
            <Clock className={`w-3.5 h-3.5 ${m.dailyLoss.warningLevel === 'ok' ? 'text-gray-500' : m.dailyLoss.warningLevel === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
          </div>
          <div className={`stat-value ${m.dailyLoss.breached ? 'text-red-400' : 'text-white'}`}>{fmt(m.dailyLoss.remaining, 0)}</div>
          <div className="mt-2"><ProgressBar percent={m.dailyLoss.remainingPercent} colorClass={dlBarColor} /></div>
        </div>
      </div>

      {/* Payout progress + consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Payout progress */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-white">Payout Progress</span>
            {m.payout.met && <span className="badge badge-green ml-auto">Eligible!</span>}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a26" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={m.payout.met ? '#34d399' : '#6366f1'} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - m.payout.progress / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold font-mono ${m.payout.met ? 'text-emerald-400' : 'text-white'}`}>{m.payout.count}</span>
                <span className="text-xs text-gray-500">of {m.payout.required}</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-sm text-gray-400">
                {m.payout.met
                  ? 'Requirements met — click Request Payout above'
                  : `${m.payout.required - m.payout.count} more qualifying day${m.payout.required - m.payout.count !== 1 ? 's' : ''} needed`}
              </p>
              <p className="text-xs text-gray-600">Min ${account.pay_min_daily}/day to qualify</p>
              {m.payout.lastPayout && (
                <p className="text-xs text-gray-600">Last payout: {formatDate(m.payout.lastPayout.date)}</p>
              )}
              <div className="bg-surface-800 rounded p-2 text-xs font-mono text-gray-400">
                {fmt(Number(account.pay_min_request), 0)} – {fmt(Number(account.pay_max_request), 0)} range
              </div>
            </div>
          </div>
        </div>

        {/* Consistency rule (if enabled) */}
        {m.consistency ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {m.consistency.breached ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span className="text-sm font-semibold text-white">Consistency Rule</span>
              <span className={`badge ml-auto text-xs ${m.consistency.breached ? 'badge-red' : m.consistency.warningLevel === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                {m.consistency.limit}% limit
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono text-gray-400">
              <div className="flex justify-between"><span>Best day</span><span className="text-emerald-400">{fmt(m.consistency.bestDay)}</span></div>
              <div className="flex justify-between"><span>Total profit</span><span className={pnlClass(m.consistency.totalProfit)}>{fmt(m.consistency.totalProfit)}</span></div>
              <div className={`flex justify-between font-semibold ${m.consistency.breached ? 'text-red-400' : m.consistency.warningLevel === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                <span>Best day %</span><span>{m.consistency.bestDayPct.toFixed(1)}% / {m.consistency.limit}%</span>
              </div>
            </div>
            {m.consistency.breached && (
              <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
                <p className="text-xs text-red-400">Need <span className="font-semibold">{fmt(m.consistency.needed)}</span> more profit to comply</p>
              </div>
            )}
            {m.payout.lastPayout && <p className="text-xs text-gray-600 mt-3">Calculated since last payout ({formatDate(m.payout.lastPayout.date)})</p>}
          </div>
        ) : (
          /* Equity curve if no consistency rule */
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Equity Curve</h2>
              {m.drawdown.hwm && <span className="text-xs text-gray-500">HWM: <span className="font-mono text-gray-300">{fmt(m.drawdown.hwm, 0)}</span></span>}
            </div>
            <div className="p-4 pb-2">
              <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
            </div>
          </div>
        )}
      </div>

      {/* Equity curve (only shown when consistency card is occupying the slot above) */}
      {m.consistency && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Equity Curve</h2>
            {m.drawdown.hwm && <span className="text-xs text-gray-500">HWM: <span className="font-mono text-gray-300">{fmt(m.drawdown.hwm, 0)}</span></span>}
          </div>
          <div className="p-4 pb-2">
            <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
          </div>
        </div>
      )}

      {/* Payout history + recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payout history */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-white">Payout History</h2>
          </div>
          {payouts.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No payouts yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Notes</th>
                </tr></thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} className="border-b border-surface-800 hover:bg-surface-800/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{formatDate(p.date)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400">{fmt(Number(p.amount))}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-surface-600">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-400">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400">{fmt(m.totalWithdrawn)}</td>
                  <td className="hidden sm:table-cell" />
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Recent trades */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
            <a href="/trades" className="text-xs text-brand hover:text-brand-hover">View all</a>
          </div>
          {m.recentTrades.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500">No trades yet</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 px-4 py-1.5 text-xs">Log first trade</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">PnL</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Instrument</th>
                </tr></thead>
                <tbody>
                  {m.recentTrades.map(t => (
                    <tr key={t.id} className="border-b border-surface-800 hover:bg-surface-800/50">
                      <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{formatDate(t.date)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${pnlClass(t.pnl)}`}>{fmt(Number(t.pnl))}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{t.instrument ? <span className="badge badge-blue">{t.instrument}</span> : <span className="text-gray-600">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} />}
      {showPayout && <PayoutModal account={account} onClose={() => setShowPayout(false)} />}
    </div>
  )
}
