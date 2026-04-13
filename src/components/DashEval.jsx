import { useState } from 'react'
import { Eye, EyeOff, Plus, Shield, Clock, Target, Calendar, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { calcEvalMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'

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

export default function DashEval({ account, trades }) {
  const [showAdd, setShowAdd] = useState(false)
  const { hidden, toggle } = useHide()
  const fmt = useMoney()
  const m = calcEvalMetrics(account, trades)

  const ddBarColor = m.drawdown.warningLevel === 'critical' ? 'bg-red-500' : m.drawdown.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
  const dlBarColor = m.dailyLoss.warningLevel === 'critical' ? 'bg-red-500' : m.dailyLoss.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
  const profitBarColor = m.passed ? 'bg-emerald-500' : m.profitProgress >= 80 ? 'bg-emerald-400' : 'bg-brand'

  const alerts = []
  if (m.failed) alerts.push({ type: 'breach', msg: 'ACCOUNT FAILED — Drawdown floor was hit.' })
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{account.name}</h1>
            {m.passed && <span className="badge badge-green">PASSED ✓</span>}
            {m.failed && <span className="badge badge-red">FAILED ✗</span>}
            {!m.passed && !m.failed && <span className="badge badge-gray">IN PROGRESS</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Evaluation Account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost p-2" title={hidden ? 'Show balances' : 'Hide balances'}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Trade</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && <div className="space-y-2">{alerts.map((a, i) => <WarnBanner key={i} message={a.msg} type={a.type} />)}</div>}

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <span className="stat-label">Balance</span>
          <div className={`stat-value mt-2 ${m.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(m.currentBalance, 0)}</div>
          <div className={`text-xs font-mono mt-1 ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {m.profit >= 0 ? '+' : ''}{fmt(m.profit)}
          </div>
        </div>
        <div className="card p-4">
          <span className="stat-label">Today</span>
          <div className={`stat-value mt-2 ${pnlClass(m.todayPnL)}`}>{fmt(m.todayPnL)}</div>
          <div className="text-xs text-gray-600 mt-1">
            {trades.filter(t => t.date === new Date().toISOString().split('T')[0]).length} trades
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">DD Buffer</span>
            <Shield className={`w-3.5 h-3.5 ${m.drawdown.warningLevel === 'ok' ? 'text-gray-500' : m.drawdown.warningLevel === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
          </div>
          <div className={`stat-value ${m.drawdown.breached ? 'text-red-400' : 'text-white'}`}>{fmt(Math.max(0, m.drawdown.buffer), 0)}</div>
          <div className="mt-2"><ProgressBar percent={m.drawdown.bufferPercent} colorClass={ddBarColor} /></div>
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

      {/* Eval progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profit target */}
        {account.profit_target > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-white">Profit Target</span>
              {m.profitProgress >= 100 && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className={`text-2xl font-bold font-mono ${m.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(m.profit)}</span>
              <span className="text-sm text-gray-500">/ {fmt(m.profitTarget, 0)}</span>
            </div>
            <ProgressBar percent={m.profitProgress} colorClass={profitBarColor} />
            <p className="text-xs text-gray-600 mt-2">{m.profitProgress.toFixed(1)}% of target reached</p>
          </div>
        )}

        {/* Min trading days */}
        {account.min_trading_days > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Trading Days</span>
              {m.tradingDays >= m.minDays && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold font-mono text-white">{m.tradingDays}</span>
              <span className="text-sm text-gray-500">/ {m.minDays} days</span>
            </div>
            <ProgressBar percent={m.tradingDaysProgress} colorClass={m.tradingDays >= m.minDays ? 'bg-emerald-500' : 'bg-blue-400'} />
            <p className="text-xs text-gray-600 mt-2">
              {m.tradingDays >= m.minDays ? 'Minimum met ✓' : `${m.minDays - m.tradingDays} more day${m.minDays - m.tradingDays !== 1 ? 's' : ''} required`}
            </p>
          </div>
        )}

        {/* Consistency rule */}
        {m.consistency && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {m.consistency.breached
                ? <XCircle className="w-4 h-4 text-red-400" />
                : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span className="text-sm font-semibold text-white">Consistency Rule</span>
              <span className={`badge ml-auto text-xs ${m.consistency.breached ? 'badge-red' : m.consistency.warningLevel === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                {m.consistency.limit}% limit
              </span>
            </div>
            <div className="space-y-1 text-xs text-gray-400 font-mono">
              <div>Best day: <span className="text-emerald-400">{fmt(m.consistency.bestDay)}</span></div>
              <div>Total profit: <span className={pnlClass(m.consistency.totalProfit)}>{fmt(m.consistency.totalProfit)}</span></div>
              <div className={`font-semibold ${m.consistency.breached ? 'text-red-400' : m.consistency.warningLevel === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {m.consistency.bestDayPct.toFixed(1)}% of total (limit {m.consistency.limit}%)
              </div>
            </div>
            {m.consistency.breached && (
              <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
                <p className="text-xs text-red-400">Need <span className="font-semibold">{fmt(m.consistency.needed)}</span> more profit to comply</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Equity curve + recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Equity Curve</h2>
            {m.drawdown.hwm && <span className="text-xs text-gray-500">HWM: <span className="text-gray-300 font-mono">{fmt(m.drawdown.hwm, 0)}</span></span>}
          </div>
          <div className="p-4 pb-2">
            <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
          </div>
        </div>

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
    </div>
  )
}
