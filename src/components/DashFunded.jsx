import { useState } from 'react'
import { Eye, EyeOff, Plus, Shield, Clock, Trophy, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle, DollarSign } from 'lucide-react'
import { calcFundedMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'
import PayoutModal from './PayoutModal'

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
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={styles[type]}>
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
          <h1 className="text-xl text-white">{account.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Funded Account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost p-2" title={hidden ? 'Show balances' : 'Hide balances'}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {m.payout.met && !m.drawdown.breached && (
            <button onClick={() => setShowPayout(true)} className="btn-primary" style={{ background: 'linear-gradient(135deg, #00d395, #00b37d)' }}>
              <DollarSign className="w-4 h-4" /><span className="hidden sm:inline">Request Payout</span><span className="sm:hidden">Payout</span>
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Trade</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && <div className="space-y-2">{alerts.map((a, i) => <WarnBanner key={i} message={a.msg} type={a.type} />)}</div>}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <span className="stat-label">Balance</span>
          <div className={`stat-value mt-2 ${pnlClass(m.tradingProfit)}`}>{fmt(m.currentBalance, 0)}</div>
          <div className="text-xs font-mono mt-1" style={{ color: m.tradingProfit >= 0 ? 'rgba(0,211,149,0.5)' : 'rgba(255,71,87,0.5)' }}>
            {m.tradingProfit >= 0 ? '+' : ''}{fmt(m.tradingProfit)}
          </div>
        </div>

        <div className="card p-4">
          <span className="stat-label">Today</span>
          <div className={`stat-value mt-2 ${pnlClass(m.todayPnL)}`}>{fmt(m.todayPnL)}</div>
          {m.totalWithdrawn > 0 && <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Taken: {fmt(m.totalWithdrawn)}</div>}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">DD Buffer</span>
            <Shield style={{ width: 14, height: 14, color: m.drawdown.warningLevel === 'ok' ? 'rgba(255,255,255,0.3)' : m.drawdown.warningLevel === 'warning' ? '#f5a623' : '#ff4757' }} />
          </div>
          <div className={`stat-value ${m.drawdown.breached ? 'pnl-neg' : 'text-white'}`}>
            {fmt(Math.max(0, m.drawdown.buffer), 0)}
          </div>
          <div className="mt-2"><ProgressBar percent={m.drawdown.bufferPercent} warningLevel={m.drawdown.warningLevel} /></div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Floor: {fmt(m.drawdown.floor, 0)}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Daily Limit</span>
            <Clock style={{ width: 14, height: 14, color: m.dailyLoss.warningLevel === 'ok' ? 'rgba(255,255,255,0.3)' : m.dailyLoss.warningLevel === 'warning' ? '#f5a623' : '#ff4757' }} />
          </div>
          <div className={`stat-value ${m.dailyLoss.breached ? 'pnl-neg' : 'text-white'}`}>
            {fmt(m.dailyLoss.remaining, 0)}
          </div>
          <div className="mt-2"><ProgressBar percent={m.dailyLoss.remainingPercent} warningLevel={m.dailyLoss.warningLevel} /></div>
        </div>
      </div>

      {/* Payout progress + consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Payout progress */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Trophy style={{ width: 16, height: 16, color: '#00d395' }} />
            <span className="text-sm text-white">Payout Progress</span>
            {m.payout.met && <span className="badge badge-green ml-auto">Eligible!</span>}
          </div>
          <div className="flex items-center gap-5">
            {/* Circular progress */}
            <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={m.payout.met ? '#00d395' : '#3b82f6'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - m.payout.progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.7s ease', filter: m.payout.met ? 'drop-shadow(0 0 6px rgba(0,211,149,0.5))' : 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-mono ${m.payout.met ? 'pnl-pos' : 'text-white'}`}>{m.payout.count}</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>of {m.payout.required}</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {m.payout.met
                  ? 'Requirements met — click Request Payout above'
                  : `${m.payout.required - m.payout.count} more qualifying day${m.payout.required - m.payout.count !== 1 ? 's' : ''} needed`}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Min ${account.pay_min_daily}/day to qualify</p>
              {m.payout.lastPayout && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Last payout: {formatDate(m.payout.lastPayout.date)}</p>
              )}
              <div className="rounded-lg px-2 py-1.5 text-xs font-mono" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                {fmt(Number(account.pay_min_request), 0)} – {fmt(Number(account.pay_max_request), 0)} range
              </div>
            </div>
          </div>
        </div>

        {/* Consistency rule or equity curve */}
        {m.consistency ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {m.consistency.breached ? <XCircle style={{ width: 16, height: 16, color: '#ff4757' }} /> : <CheckCircle2 style={{ width: 16, height: 16, color: '#00d395' }} />}
              <span className="text-sm text-white">Consistency Rule</span>
              <span className={`badge ml-auto text-xs ${m.consistency.breached ? 'badge-red' : m.consistency.warningLevel === 'warning' ? 'badge-amber' : 'badge-green'}`}>
                {m.consistency.limit}% limit
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <div className="flex justify-between"><span>Best day</span><span className="pnl-pos">{fmt(m.consistency.bestDay)}</span></div>
              <div className="flex justify-between"><span>Total profit</span><span className={pnlClass(m.consistency.totalProfit)}>{fmt(m.consistency.totalProfit)}</span></div>
              <div className={`flex justify-between ${m.consistency.breached ? 'pnl-neg' : m.consistency.warningLevel === 'warning' ? 'text-amber-400' : 'pnl-pos'}`}>
                <span>Best day %</span><span>{m.consistency.bestDayPct.toFixed(1)}% / {m.consistency.limit}%</span>
              </div>
            </div>
            {m.consistency.breached && (
              <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)' }}>
                <p className="text-xs" style={{ color: '#ff4757' }}>Need <span className="font-semibold">{fmt(m.consistency.needed)}</span> more profit to comply</p>
              </div>
            )}
            {m.payout.lastPayout && <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Since last payout ({formatDate(m.payout.lastPayout.date)})</p>}
          </div>
        ) : (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-sm text-white">Equity Curve</h2>
              {m.drawdown.hwm && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>HWM: <span className="font-mono text-white">{fmt(m.drawdown.hwm, 0)}</span></span>}
            </div>
            <div className="p-4 pb-2">
              <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
            </div>
          </div>
        )}
      </div>

      {/* Equity curve (shown when consistency card occupies slot above) */}
      {m.consistency && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm text-white">Equity Curve</h2>
            {m.drawdown.hwm && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>HWM: <span className="font-mono text-white">{fmt(m.drawdown.hwm, 0)}</span></span>}
          </div>
          <div className="p-4 pb-2">
            <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} floor={m.drawdown.floor} />
          </div>
        </div>
      )}

      {/* Payout history + recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm text-white">Payout History</h2>
          </div>
          {payouts.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No payouts yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-4 py-2.5 stat-label">Date</th>
                  <th className="text-right px-4 py-2.5 stat-label">Amount</th>
                  <th className="text-left px-4 py-2.5 stat-label hidden sm:table-cell">Notes</th>
                </tr></thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(p.date)}</td>
                      <td className="px-4 py-2.5 text-right font-mono pnl-pos">{fmt(Number(p.amount))}</td>
                      <td className="px-4 py-2.5 text-xs hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Total</td>
                  <td className="px-4 py-2.5 text-right font-mono pnl-pos">{fmt(m.totalWithdrawn)}</td>
                  <td className="hidden sm:table-cell" />
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm text-white">Recent Trades</h2>
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
                      <td className={`px-4 py-2.5 text-right font-mono ${pnlClass(t.pnl)}`}>{fmt(Number(t.pnl))}</td>
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
      {showPayout && <PayoutModal account={account} onClose={() => setShowPayout(false)} />}
    </div>
  )
}
