import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { calcEvalMetrics, calcFundedMetrics, calcSimpleMetrics } from '../utils/calculations'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import EquityCurveChart from '../components/EquityCurveChart'
import AddTradeModal from '../components/AddTradeModal'
import { Plus, Shield, Clock, Trophy, DollarSign, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { selectedAccount, trades, payouts } = useAccount()
  const fmt = useMoney()
  const [showAdd, setShowAdd] = useState(false)

  if (!selectedAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-sm" style={{ color: '#8b949e' }}>Select an account to view dashboard</p>
        </div>
      </div>
    )
  }

  let m
  if (selectedAccount.type === 'eval') m = calcEvalMetrics(selectedAccount, trades)
  else if (selectedAccount.type === 'funded') m = calcFundedMetrics(selectedAccount, trades, payouts || [])
  else m = calcSimpleMetrics(selectedAccount, trades)

  // Calculate TradeScore: (win_rate * 50) + (profit_factor * 15) + (payout_eligible ? 10 : 0), capped at 100
  const winRate = trades.length > 0 
    ? (trades.filter(t => Number(t.pnl) > 0).length / trades.length) 
    : 0
  const grossWin = trades.filter(t => Number(t.pnl) > 0).reduce((s, t) => s + Number(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => Number(t.pnl) < 0).reduce((s, t) => s + Number(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 10 : 0
  const payoutEligible = m?.payout?.met ? 1 : 0
  let tradeScore = Math.min(100, Math.round((winRate * 50) + (profitFactor * 15) + (payoutEligible * 10)))
  if (tradeScore > 100) tradeScore = 100
  const avgWinRate = 0.52 // assume 52% as average
  const scoreAboveAvg = winRate >= avgWinRate

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      
      {/* Top section — two column grid */}
      <div className="grid" style={{ gridTemplateColumns: '130px 1fr', gap: 16 }}>
        
        {/* LEFT: TradeScore card */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <span className="section-label">TRADESCORE</span>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#3fb950', lineHeight: 1 }}>
            {tradeScore}
          </div>
          <div style={{ fontSize: 10, color: '#484f58', marginTop: 4 }}>
            {scoreAboveAvg ? 'Above avg' : 'Below avg'}
          </div>
        </div>

        {/* RIGHT: 2x2 metric cards */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {/* Balance */}
          <div className="metric-card">
            <span className="section-label">Balance</span>
            <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>{fmt(m.currentBalance, 0)}</div>
          </div>
          
          {/* Today PnL */}
          <div className="metric-card">
            <span className="section-label">Today</span>
            <div className={`stat-value ${pnlClass(m.todayPnL || 0)}`} style={{ fontSize: 24, marginTop: 4 }}>
              {(m.todayPnL || 0) >= 0 ? '+' : ''}{fmt(m.todayPnL || 0)}
            </div>
          </div>
          
          {/* DD Buffer */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="section-label" style={{ marginBottom: 0 }}>DD Buffer</span>
              <Shield style={{ width: 14, height: 14, color: '#484f58' }} />
            </div>
            <div className={`stat-value ${m.drawdown?.breached ? 'pnl-neg' : 'text-white'}`} style={{ fontSize: 20 }}>
              {fmt(Math.max(0, m.drawdown?.buffer || 0), 0)}
            </div>
            <div className="progress-bar-track" style={{ marginTop: 8 }}>
              <div style={{
                height: '100%',
                width: `${Math.max(2, m.drawdown?.bufferPercent || 0)}%`,
                background: m.drawdown?.warningLevel === 'critical' ? '#f85149' : m.drawdown?.warningLevel === 'warning' ? '#d29922' : '#3fb950',
                borderRadius: 2,
                transition: 'width 0.12s ease',
              }} />
            </div>
          </div>
          
          {/* Daily Limit */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="section-label" style={{ marginBottom: 0 }}>Daily Limit</span>
              <Clock style={{ width: 14, height: 14, color: '#484f58' }} />
            </div>
            <div className={`stat-value ${m.dailyLoss?.breached ? 'pnl-neg' : 'text-white'}`} style={{ fontSize: 20 }}>
              {fmt(m.dailyLoss?.remaining || 0, 0)}
            </div>
            <div className="progress-bar-track" style={{ marginTop: 8 }}>
              <div style={{
                height: '100%',
                width: `${Math.max(2, m.dailyLoss?.remainingPercent || 0)}%`,
                background: m.dailyLoss?.warningLevel === 'critical' ? '#f85149' : m.dailyLoss?.warningLevel === 'warning' ? '#d29922' : '#3fb950',
                borderRadius: 2,
                transition: 'width 0.12s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Equity curve card */}
      <div className="card">
        <span className="section-label">Equity Curve</span>
        <EquityCurveChart curve={m.equityCurve} startBalance={Number(selectedAccount.start_balance)} floor={m.drawdown?.floor} />
      </div>

      {/* Two column row: Payout Progress + Recent Trades */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        
        {/* Payout Progress */}
        {m.payout && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Trophy style={{ width: 16, height: 16, color: '#3fb950' }} />
              <span className="section-label" style={{ margin: 0 }}>Payout Progress</span>
              {m.payout.met && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Eligible!</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {Array.from({ length: m.payout.required }).map((_, i) => {
                const done = i < m.payout.count
                return (
                  <div key={i} style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: done ? '#1a2e1f' : '#161b22',
                    border: `1px solid ${done ? '#3fb950' : '#21262d'}`,
                    color: done ? '#3fb950' : '#484f58',
                  }}>
                    {i + 1}
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: '#8b949e', marginTop: 12 }}>
              {m.payout.met 
                ? 'Requirements met — eligible for payout' 
                : `${m.payout.required - m.payout.count} more qualifying day${m.payout.required - m.payout.count !== 1 ? 's' : ''} needed`}
            </p>
          </div>
        )}

        {/* Recent Trades */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label" style={{ margin: 0 }}>Recent Trades</span>
            <a href="/trades" style={{ fontSize: 12, color: '#3fb950', textDecoration: 'none' }}>View all →</a>
          </div>
          {m.recentTrades.length === 0 ? (
            <div className="py-8 text-center">
              <p style={{ fontSize: 12, color: '#484f58' }}>No trades yet</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ marginTop: 8, padding: '5px 12px', fontSize: 11 }}>Log first trade</button>
            </div>
          ) : (
            <div className="space-y-2">
              {m.recentTrades.map(t => (
                <div key={t.id} className="flex items-center gap-3" style={{ padding: '6px 0', borderBottom: '1px solid #161b22' }}>
                  <span className={`badge ${Number(t.pnl) >= 0 ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                    {Number(t.pnl) >= 0 ? 'W' : 'L'}
                  </span>
                  <span style={{ fontSize: 11, color: '#484f58', minWidth: 50 }}>{formatDate(t.date)}</span>
                  {t.instrument && <span className="badge badge-blue" style={{ fontSize: 10, padding: '1px 6px' }}>{t.instrument}</span>}
                  {t.session && <span className="badge badge-purple" style={{ fontSize: 10, padding: '1px 6px' }}>{t.session}</span>}
                  <span className={`font-mono text-sm ${pnlClass(t.pnl)}`} style={{ marginLeft: 'auto', fontWeight: 600 }}>
                    {(Number(t.pnl) >= 0 ? '+' : '') + fmt(Number(t.pnl))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
