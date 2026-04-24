import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Eye, EyeOff, Plus, Maximize2, Minimize2 } from 'lucide-react'
import { calcSimpleMetrics } from '../utils/calculations'
import { formatDate, formatCurrency, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import { useAccount } from '../contexts/AccountContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'

export default function DashSimple() {
  const [showAdd, setShowAdd] = useState(false)
  const [chartExpanded, setChartExpanded] = useState(false)
  const { hidden, toggle } = useHide()
  const { selectedAccount: account, trades } = useAccount()
  const fmt = useMoney()
  const m = useMemo(() => calcSimpleMetrics(account, trades), [account, trades])

  const gainPct = account.start_balance > 0
    ? ((m.currentBalance - Number(account.start_balance)) / Number(account.start_balance) * 100).toFixed(2)
    : '0.00'

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-white">{account.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Simple Tracker</p>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 col-span-3 sm:col-span-1">
          <div className="flex items-start justify-between mb-2">
            <span className="stat-label">Balance</span>
            <div style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: m.totalPnL >= 0 ? 'rgba(0,211,149,0.1)' : 'rgba(255,71,87,0.1)',
            }}>
              {m.totalPnL >= 0
                ? <TrendingUp style={{ width: 16, height: 16, color: '#00d395' }} />
                : <TrendingDown style={{ width: 16, height: 16, color: '#ff4757' }} />}
            </div>
          </div>
          <div className={`stat-value ${pnlClass(m.totalPnL)}`}>{fmt(m.currentBalance, 0)}</div>
          <div className="text-xs font-mono mt-1" style={{ color: m.totalPnL >= 0 ? 'rgba(0,211,149,0.6)' : 'rgba(255,71,87,0.6)' }}>
            {m.totalPnL >= 0 ? '+' : ''}{fmt(m.totalPnL)} ({m.totalPnL >= 0 ? '+' : ''}{gainPct}%)
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="stat-label">Today</span>
            <div style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: m.todayPnL >= 0 ? 'rgba(0,211,149,0.1)' : 'rgba(255,71,87,0.1)',
            }}>
              {m.todayPnL >= 0
                ? <TrendingUp style={{ width: 16, height: 16, color: '#00d395' }} />
                : <TrendingDown style={{ width: 16, height: 16, color: '#ff4757' }} />}
            </div>
          </div>
          <div className={`stat-value ${pnlClass(m.todayPnL)}`}>{fmt(m.todayPnL)}</div>
        </div>

        <div className="card p-4">
          <span className="stat-label">Trading Days</span>
          <div className="stat-value text-white mt-2">{m.tradingDays}</div>
        </div>
      </div>

      {/* Equity curve */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm text-white">Equity Curve</h2>
          <button onClick={() => setChartExpanded(e => !e)} className="btn-ghost p-1.5" title={chartExpanded ? 'Collapse' : 'Expand'}>
            {chartExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="p-4 pb-2">
          <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} height={chartExpanded ? 340 : 180} />
        </div>
      </div>

      {/* Recent trades */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm text-white">Recent Trades</h2>
          <a href="/trades" style={{ fontSize: 12, color: '#00d395' }}>View all →</a>
        </div>
        {m.recentTrades.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No trades yet</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-3" style={{ padding: '6px 16px', fontSize: 12 }}>Log first trade</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-5 py-3 stat-label">Date</th>
                <th className="text-right px-5 py-3 stat-label">PnL</th>
                <th className="text-left px-5 py-3 stat-label hidden sm:table-cell">Instrument</th>
                <th className="text-left px-5 py-3 stat-label hidden md:table-cell">Session</th>
              </tr></thead>
              <tbody>
                {m.recentTrades.map(t => (
                  <tr key={t.id}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(t.date)}</td>
                    <td className={`px-5 py-3 text-right font-mono ${pnlClass(t.pnl)}`}>{fmt(Number(t.pnl))}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">{t.instrument ? <span className="badge badge-blue">{t.instrument}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</td>
                    <td className="px-5 py-3 hidden md:table-cell">{t.session ? <span className="badge badge-gray">{t.session}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
