import { useState } from 'react'
import { TrendingUp, TrendingDown, Zap, Eye, EyeOff, Plus } from 'lucide-react'
import { calcSimpleMetrics } from '../utils/calculations'
import { formatCurrency, pnlClass } from '../utils/formatters'
import { useMoney, useHide } from '../contexts/HideContext'
import EquityCurveChart from './EquityCurveChart'
import AddTradeModal from './AddTradeModal'
import { formatDate } from '../utils/formatters'

export default function DashSimple({ account, trades }) {
  const [showAdd, setShowAdd] = useState(false)
  const { hidden, toggle } = useHide()
  const fmt = useMoney()
  const m = calcSimpleMetrics(account, trades)

  const gainPct = account.start_balance > 0
    ? ((m.currentBalance - Number(account.start_balance)) / Number(account.start_balance) * 100).toFixed(2)
    : '0.00'

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{account.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Simple Tracker</p>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 col-span-3 sm:col-span-1">
          <div className="flex items-start justify-between mb-2">
            <span className="stat-label">Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.totalPnL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {m.totalPnL >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
          </div>
          <div className={`stat-value ${m.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(m.currentBalance, 0)}</div>
          <div className="text-xs text-gray-600 mt-1 font-mono">{m.totalPnL >= 0 ? '+' : ''}{fmt(m.totalPnL)} ({m.totalPnL >= 0 ? '+' : ''}{gainPct}%)</div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="stat-label">Today</span>
            <Zap className={`w-4 h-4 ${m.todayPnL >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
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
        <div className="card-header"><h2 className="text-sm font-semibold text-white">Equity Curve</h2></div>
        <div className="p-4 pb-2">
          <EquityCurveChart curve={m.equityCurve} startBalance={Number(account.start_balance)} />
        </div>
      </div>

      {/* Recent trades */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
          <a href="/trades" className="text-xs text-brand hover:text-brand-hover">View all</a>
        </div>
        {m.recentTrades.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No trades yet</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 px-4 py-1.5 text-xs">Log first trade</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-700">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">PnL</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Instrument</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Session</th>
              </tr></thead>
              <tbody>
                {m.recentTrades.map(t => (
                  <tr key={t.id} className="border-b border-surface-800 hover:bg-surface-800/50">
                    <td className="px-5 py-3 text-gray-300 font-mono text-xs">{formatDate(t.date)}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${pnlClass(t.pnl)}`}>{fmt(Number(t.pnl))}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">{t.instrument ? <span className="badge badge-blue">{t.instrument}</span> : <span className="text-gray-600">—</span>}</td>
                    <td className="px-5 py-3 hidden md:table-cell">{t.session ? <span className="badge badge-gray">{t.session}</span> : <span className="text-gray-600">—</span>}</td>
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
