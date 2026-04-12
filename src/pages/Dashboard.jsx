import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { getAccountMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import EquityCurveChart from '../components/EquityCurveChart'
import AddTradeModal from '../components/AddTradeModal'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Plus, Zap, Trophy, Shield, Clock,
} from 'lucide-react'

function ProgressBar({ percent, colorClass }) {
  return (
    <div className="progress-bar-track">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.max(2, percent)}%` }}
      />
    </div>
  )
}

function AlertBanner({ message, type }) {
  const styles = {
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    critical: 'bg-red-500/10 border-red-500/30 text-red-300',
    breach: 'bg-red-600/20 border-red-500/50 text-red-200',
  }
  const icons = { warning: AlertTriangle, critical: AlertTriangle, breach: AlertTriangle }
  const Icon = icons[type] || AlertTriangle
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}

export default function Dashboard() {
  const { selectedAccount, trades, loadingTrades } = useAccount()
  const [showAddTrade, setShowAddTrade] = useState(false)

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 text-sm">
        No account selected
      </div>
    )
  }

  if (loadingTrades) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const m = getAccountMetrics(selectedAccount, trades)
  const { currentBalance, todayPnL, drawdown, dailyLoss, payout, equityCurve, recentTrades } = m

  // Build alerts
  const alerts = []
  if (drawdown.breached) {
    alerts.push({ type: 'breach', msg: 'ACCOUNT BREACHED — Drawdown floor has been hit!' })
  } else if (drawdown.warningLevel === 'critical') {
    alerts.push({ type: 'critical', msg: `Drawdown critical — only ${formatCurrency(drawdown.buffer)} remaining (${drawdown.bufferPercent.toFixed(0)}%)` })
  } else if (drawdown.warningLevel === 'warning') {
    alerts.push({ type: 'warning', msg: `Drawdown warning — ${formatCurrency(drawdown.buffer)} buffer remaining (${drawdown.bufferPercent.toFixed(0)}%)` })
  }
  if (dailyLoss.breached) {
    alerts.push({ type: 'breach', msg: 'DAILY LOSS LIMIT HIT — Stop trading for today!' })
  } else if (dailyLoss.warningLevel === 'critical') {
    alerts.push({ type: 'critical', msg: `Daily limit critical — only ${formatCurrency(dailyLoss.remaining)} remaining` })
  } else if (dailyLoss.warningLevel === 'warning') {
    alerts.push({ type: 'warning', msg: `Daily limit warning — ${formatCurrency(dailyLoss.remaining)} remaining today` })
  }

  const ddBarColor = drawdown.warningLevel === 'critical' ? 'bg-red-500' : drawdown.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
  const dlBarColor = dailyLoss.warningLevel === 'critical' ? 'bg-red-500' : dailyLoss.warningLevel === 'warning' ? 'bg-amber-400' : 'bg-blue-400'

  const pnlGain = currentBalance - Number(selectedAccount.start_balance)
  const pnlGainPct = (pnlGain / Number(selectedAccount.start_balance)) * 100

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{selectedAccount.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedAccount.drawdown_type === 'trailing_eod' ? 'Trailing EOD Drawdown' : 'Static Drawdown'}
          </p>
        </div>
        <button
          onClick={() => setShowAddTrade(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Trade</span>
          <span className="sm:hidden">Trade</span>
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <AlertBanner key={i} message={a.msg} type={a.type} />
          ))}
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current Balance */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <span className="stat-label">Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pnlGain >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {pnlGain >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                : <TrendingDown className="w-4 h-4 text-red-400" />
              }
            </div>
          </div>
          <div className={`stat-value ${pnlGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(currentBalance, 0)}
          </div>
          <div className={`text-xs mt-1 font-mono ${pnlGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {pnlGain >= 0 ? '+' : ''}{formatCurrency(pnlGain)} ({pnlGainPct >= 0 ? '+' : ''}{pnlGainPct.toFixed(2)}%)
          </div>
        </div>

        {/* Today's PnL */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <span className="stat-label">Today</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${todayPnL >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
              <Zap className={`w-4 h-4 ${todayPnL >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className={`stat-value ${pnlClass(todayPnL)}`}>
            {todayPnL === 0 ? '$0.00' : formatCurrency(todayPnL)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {trades.filter(t => t.date === new Date().toISOString().split('T')[0]).length} trades today
          </div>
        </div>

        {/* Drawdown Buffer */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <span className="stat-label">DD Buffer</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${drawdown.warningLevel === 'ok' ? 'bg-surface-700' : drawdown.warningLevel === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              <Shield className={`w-4 h-4 ${drawdown.warningLevel === 'ok' ? 'text-gray-400' : drawdown.warningLevel === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className={`stat-value ${drawdown.breached ? 'text-red-400' : drawdown.warningLevel === 'warning' ? 'text-amber-400' : 'text-white'}`}>
            {formatCurrency(Math.max(0, drawdown.buffer), 0)}
          </div>
          <div className="mt-2">
            <ProgressBar percent={drawdown.bufferPercent} colorClass={ddBarColor} />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Floor: {formatCurrency(drawdown.floor, 0)}
          </div>
        </div>

        {/* Daily Loss */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <span className="stat-label">Daily Limit</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dailyLoss.warningLevel === 'ok' ? 'bg-surface-700' : dailyLoss.warningLevel === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              <Clock className={`w-4 h-4 ${dailyLoss.warningLevel === 'ok' ? 'text-gray-400' : dailyLoss.warningLevel === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className={`stat-value ${dailyLoss.breached ? 'text-red-400' : dailyLoss.warningLevel === 'warning' ? 'text-amber-400' : 'text-white'}`}>
            {formatCurrency(dailyLoss.remaining, 0)}
          </div>
          <div className="mt-2">
            <ProgressBar percent={dailyLoss.remainingPercent} colorClass={dlBarColor} />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Limit: {formatCurrency(selectedAccount.daily_loss_limit, 0)}
          </div>
        </div>
      </div>

      {/* Equity curve + Payout progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Equity curve */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Equity Curve</h2>
            {drawdown.hwm && (
              <span className="text-xs text-gray-500">
                HWM: <span className="text-gray-300 font-mono">{formatCurrency(drawdown.hwm, 0)}</span>
              </span>
            )}
          </div>
          <div className="p-4 pb-2">
            <EquityCurveChart
              curve={equityCurve}
              startBalance={Number(selectedAccount.start_balance)}
              floor={drawdown.floor}
            />
          </div>
        </div>

        {/* Payout progress */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-white">Payout Progress</h2>
          </div>
          <div className="p-5 flex flex-col items-center gap-4">
            {/* Circle */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a26" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={payout.met ? '#34d399' : '#6366f1'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - payout.progress / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold font-mono ${payout.met ? 'text-emerald-400' : 'text-white'}`}>
                  {payout.count}
                </span>
                <span className="text-xs text-gray-500">of {payout.required}</span>
              </div>
            </div>

            <div className="text-center">
              {payout.met ? (
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <Trophy className="w-4 h-4" />
                  Payout Eligible!
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {payout.required - payout.count} more qualifying day{payout.required - payout.count !== 1 ? 's' : ''} needed
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Min ${selectedAccount.pay_min_daily}/day to qualify
              </p>
            </div>

            {/* Payout range */}
            <div className="w-full bg-surface-800 rounded-lg p-3 border border-surface-600">
              <p className="text-xs text-gray-500 mb-2 font-medium">Payout Range</p>
              <div className="flex justify-between text-sm font-mono">
                <span className="text-gray-400">{formatCurrency(selectedAccount.pay_min_request, 0)} min</span>
                <span className="text-gray-400">{formatCurrency(selectedAccount.pay_max_request, 0)} max</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent trades */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
          <a href="/trades" className="text-xs text-brand hover:text-brand-hover transition-colors">View all</a>
        </div>
        {recentTrades.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500">No trades yet</p>
            <button onClick={() => setShowAddTrade(true)} className="btn-primary mt-3 px-4 py-1.5 text-xs">
              Add your first trade
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">PnL</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Instrument</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Session</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">R</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(trade => (
                  <tr key={trade.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-300 font-mono text-xs">{formatDate(trade.date)}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${pnlClass(trade.pnl)}`}>
                      {formatCurrency(Number(trade.pnl))}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {trade.instrument ? <span className="badge badge-blue">{trade.instrument}</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {trade.session ? <span className="badge badge-gray">{trade.session}</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right hidden md:table-cell font-mono text-xs text-gray-500">
                      {trade.r_value != null ? (Number(trade.r_value) >= 0 ? '+' : '') + Number(trade.r_value).toFixed(2) + 'R' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddTrade && <AddTradeModal onClose={() => setShowAddTrade(false)} />}
    </div>
  )
}
