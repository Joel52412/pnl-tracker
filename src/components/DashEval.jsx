import { useState } from 'react'
import { Eye, EyeOff, Plus, Shield, Clock, Target, Calendar, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { calcEvalMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'

// Gradient progress bar
const GRADIENTS = {
  ok:       'linear-gradient(90deg, #00d395, #00b8a9)',
  warning:  'linear-gradient(90deg, #f5a623, #f79433)',
  critical: 'linear-gradient(90deg, #ff4757, #ff6b7a)',
}
function ProgressBar({ percent, warningLevel = 'ok' }) {
  return (
    <div className="progress-bar-track">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(2, percent)}%`, background: GRADIENTS[warningLevel] || GRADIENTS.ok }}
      />
    </div>
  )
}

function WarnBanner({ message, type }) {
  const styles = {
    warning:  { background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', color: '#f5a623' },
    critical: { background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757' },
    breach:   { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff4757' },
  }
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold" style={styles[type]}>
      <AlertTriangle className="w-4 h-4 shrink-0" />{message}
    </div>
  )
}

export default function DashEval({ account, trades }) {
  const [showAdd, setShowAdd] = useState(false)
  const { hidden, toggle } = useHide()
  const fmt = useMoney()
  const m = calcEvalMetrics(account, trades)

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
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Evaluation Account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost p-2" title={hidden ? 'Show balances' : 'Hide balances'}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Trade</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && <div className="space-y-2">{alerts.map((a, i) => <WarnBanner key={i} message={a.msg} type={a.type} />)}</div>}

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <span className="stat-label">Balance</span>
          <div className={`stat-value mt-2 ${pnlClass(m.profit)}`}>{fmt(m.currentBalance, 0)}</div>
          <div className="text-xs font-mono mt-1" style={{ color: m.profit >= 0 ? 'rgba(0,211,149,0.5)' : 'rgba(255,71,87,0.5)' }}>
            {m.profit >= 0 ? '+' : ''}{fmt(m.profit)}
          </div>
        </div>

        <div className="card p-4">
          <span className="stat-label">Today</span>
          <div className={`stat-value mt-2 ${pnlClass(m.todayPnL)}`}>{fmt(m.todayPnL)}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {trades.filter(t => t.date === new Date().toISOString().split('T')[0]).length} trades
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">DD Buffer</span>
            <Shield style={{ width: 14, height: 14, color: m.drawdown.warningLevel === 'ok' ? 'rgba(255,255,255,0.3)' : m.drawdown.warningLevel === 'warning' ? '#f5a623' : '#ff4757' }} />
          </div>
          <div className={`stat-value ${m.drawdown.breached ? 'pnl-neg' : 'text-white'}`}>
            {fmt(Math.max(0, m.drawdown.buffer), 0)}
          </div>
          <div className="mt-2">
            <ProgressBar percent={m.drawdown.bufferPercent} warningLevel={m.drawdown.warningLevel} />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Daily Limit</span>
            <Clock style={{ width: 14, height: 14, color: m.dailyLoss.warningLevel === 'ok' ? 'rgba(255,255,255,0.3)' : m.dailyLoss.warningLevel === 'warning' ? '#f5a623' : '#ff4757' }} />
          </div>
          <div className={`stat-value ${m.dailyLoss.breached ? 'pnl-neg' : 'text-white'}`}>
            {fmt(m.dailyLoss.remaining, 0)}
          </div>
          <div className="mt-2">
            <ProgressBar percent={m.dailyLoss.remainingPercent} warningLevel={m.dailyLoss.warningLevel} />
          </div>
        </div>
      </div>

      {/* Eval progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {account.profit_target > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target style={{ width: 16, height: 16, color: '#00d395' }} />
              <span className="text-sm font-semibold text-white">Profit Target</span>
              {m.profitProgress >= 100 && <CheckCircle2 style={{ width: 16, height: 16, color: '#00d395' }} className="ml-auto" />}
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className={`text-2xl font-bold font-mono ${pnlClass(m.profit)}`}>{fmt(m.profit)}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>/ {fmt(m.profitTarget, 0)}</span>
            </div>
            <ProgressBar percent={m.profitProgress} warningLevel="ok" />
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.profitProgress.toFixed(1)}% of target reached</p>
          </div>
        )}

        {account.min_trading_days > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar style={{ width: 16, height: 16, color: '#60a5fa' }} />
              <span className="text-sm font-semibold text-white">Trading Days</span>
              {m.tradingDays >= m.minDays && <CheckCircle2 style={{ width: 16, height: 16, color: '#00d395' }} className="ml-auto" />}
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold font-mono text-white">{m.tradingDays}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>/ {m.minDays} days</span>
            </div>
            <ProgressBar percent={m.tradingDaysProgress} warningLevel={m.tradingDays >= m.minDays ? 'ok' : 'ok'} />
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {m.tradingDays >= m.minDays ? 'Minimum met ✓' : `${m.minDays - m.tradingDays} more day${m.minDays - m.tradingDays !== 1 ? 's' : ''} required`}
            </p>
          </div>
        )}

        {m.consistency && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {m.consistency.breached
                ? <XCircle style={{ width: 16, height: 16, color: '#ff4757' }} />
                : <CheckCircle2 style={{ width: 16, height: 16, color: '#00d395' }} />}
              <span className="text-sm font-semibold text-white">Consistency Rule</span>
              <span className={`badge ml-auto text-xs ${m.consistency.breached ? 'badge-red' : m.consistency.warningLevel === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                {m.consistency.limit}% limit
              </span>
            </div>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <div>Best day: <span className="pnl-pos">{fmt(m.consistency.bestDay)}</span></div>
              <div>Total profit: <span className={pnlClass(m.consistency.totalProfit)}>{fmt(m.consistency.totalProfit)}</span></div>
              <div className={`font-semibold ${m.consistency.breached ? 'pnl-neg' : m.consistency.warningLevel === 'warning' ? 'text-amber-400' : 'pnl-pos'}`}>
                {m.consistency.bestDayPct.toFixed(1)}% of total (limit {m.consistency.limit}%)
              </div>
            </div>
            {m.consistency.breached && (
              <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)' }}>
                <p className="text-xs" style={{ color: '#ff4757' }}>Need <span className="font-semibold">{fmt(m.consistency.needed)}</span> more profit to comply</p>
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
            {m.drawdown.hwm && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>HWM: <span className="font-mono text-white">{fmt(m.drawdown.hwm, 0)}</span></span>}
          </div>
          <div className="p-4 pb-2">
            <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
            <a href="/trades" style={{ fontSize: 12, color: '#00d395' }}>View all →</a>
          </div>
          {m.recentTrades.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No trades yet</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-3" style={{ padding: '6px 16px', fontSize: 12 }}>Log first trade</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-4 py-2.5 stat-label">Date</th>
                  <th className="text-right px-4 py-2.5 stat-label">PnL</th>
                  <th className="text-left px-4 py-2.5 stat-label hidden sm:table-cell">Instrument</th>
                </tr></thead>
                <tbody>
                  {m.recentTrades.map(t => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(t.date)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${pnlClass(t.pnl)}`}>{fmt(Number(t.pnl))}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{t.instrument ? <span className="badge badge-blue">{t.instrument}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</td>
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
