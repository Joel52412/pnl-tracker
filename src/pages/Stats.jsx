import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { calcTradeStats, getDailyPnLMap } from '../utils/calculations'
import { formatCurrency, pnlClass } from '../utils/formatters'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Activity, Award, Minus, Flame, Zap, AlertTriangle } from 'lucide-react'
import { subMonths, format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent || 'bg-surface-700'}`}>
            <Icon className="w-3.5 h-3.5 text-gray-400" />
          </div>
        )}
      </div>
      <div className={`text-xl font-mono ${typeof value === 'string' && value.startsWith('-') ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

const chartTooltipDefaults = {
  backgroundColor: '#111318',
  borderColor: '#2a2d36',
  borderWidth: 1,
  titleColor: '#9ca3af',
  bodyColor: '#f3f4f6',
  padding: 10,
}

const RANGE_OPTIONS = [
  { label: '1M',  months: 1 },
  { label: '3M',  months: 3 },
  { label: '6M',  months: 6 },
  { label: '9M',  months: 9 },
  { label: '1Y',  months: 12 },
  { label: 'All', months: null },
]

export default function Stats() {
  const { trades, loadingTrades } = useAccount()
  const [range, setRange] = useState(3)

  if (loadingTrades) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No trades to analyze yet</p>
          <p className="text-gray-600 text-xs mt-1">Add trades to see your statistics</p>
        </div>
      </div>
    )
  }

  const s = calcTradeStats(trades)
  if (!s) return null

  const dailyMap = getDailyPnLMap(trades)
  const allSortedDates = Object.keys(dailyMap).sort()
  const cutoff = range != null ? format(subMonths(new Date(), range), 'yyyy-MM-dd') : null
  const sortedDates = cutoff ? allSortedDates.filter(d => d >= cutoff) : allSortedDates
  const dailyPnLArray = sortedDates.map(d => dailyMap[d])

  // Bar chart - last 30 days
  const barData = {
    labels: sortedDates.map(d => {
      const [, m, day] = d.split('-')
      return `${m}/${day}`
    }),
    datasets: [{
      label: 'Daily PnL',
      data: dailyPnLArray,
      backgroundColor: dailyPnLArray.map(v => v >= 0 ? 'rgba(0,211,149,0.5)' : 'rgba(255,77,77,0.5)'),
      borderColor: dailyPnLArray.map(v => v >= 0 ? 'rgba(0,211,149,0.8)' : 'rgba(255,77,77,0.8)'),
      borderWidth: 1,
      borderRadius: 3,
    }],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltipDefaults,
        callbacks: {
          label: ctx => `PnL: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 10, maxRotation: 0 },
        border: { color: 'transparent' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#6b7280', font: { size: 10 }, callback: v => `$${v}` },
        border: { color: 'transparent' },
      },
    },
  }

  // Session doughnut
  const sessionEntries = Object.entries(s.sessionMap)
  const COLORS = ['#00d395', '#3b82f6', '#f5a623', '#ff4d4d', '#a78bfa', '#60a5fa']
  const doughnutData = sessionEntries.length > 0 ? {
    labels: sessionEntries.map(([k]) => k),
    datasets: [{
      data: sessionEntries.map(([, v]) => v.count),
      backgroundColor: sessionEntries.map((_, i) => COLORS[i % COLORS.length] + '99'),
      borderColor: sessionEntries.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1,
    }],
  } : null

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 }, padding: 12, boxWidth: 12 } },
      tooltip: { ...chartTooltipDefaults, callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} trades` } },
    },
    cutout: '68%',
  }

  // Instrument bar
  const instrEntries = Object.entries(s.instrumentMap)
  const instrBarData = instrEntries.length > 0 ? {
    labels: instrEntries.map(([k]) => k),
    datasets: [{
      label: 'PnL by Instrument',
      data: instrEntries.map(([, v]) => v.pnl),
      backgroundColor: instrEntries.map(([, v]) => v.pnl >= 0 ? 'rgba(0,211,149,0.5)' : 'rgba(255,77,77,0.5)'),
      borderColor: instrEntries.map(([, v]) => v.pnl >= 0 ? 'rgba(0,211,149,0.8)' : 'rgba(255,77,77,0.8)'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  } : null

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl text-white">Statistics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Based on {s.totalTrades} trades</p>
      </div>

      {/* ── Row 1: Core performance ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Win Rate"
          value={`${s.winRate.toFixed(1)}%`}
          sub={`${s.winners}W / ${s.losers}L${s.breakEvens > 0 ? ` / ${s.breakEvens}BE` : ''}`}
          icon={TrendingUp}
          accent={s.winRate >= 50 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
        />
        <StatCard
          label="Profit Factor"
          value={s.profitFactor === null ? (s.grossWin > 0 ? '∞' : '—') : s.profitFactor.toFixed(2)}
          sub={`${formatCurrency(s.grossWin, 0)} gross win`}
          icon={Award}
          accent={s.profitFactor !== null && s.profitFactor >= 1.5 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
        />
        <StatCard
          label="Avg Trade"
          value={`${s.avgTrade >= 0 ? '+' : ''}${formatCurrency(s.avgTrade, 0)}`}
          sub="net per trade"
          icon={s.avgTrade >= 0 ? TrendingUp : TrendingDown}
          accent={s.avgTrade >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
        />
        <StatCard
          label="Max Drawdown"
          value={s.maxDrawdown > 0 ? `-${formatCurrency(s.maxDrawdown, 0)}` : '$0'}
          sub="peak-to-trough"
          icon={AlertTriangle}
          accent="bg-amber-500/10"
        />
      </div>

      {/* ── Row 2: Trade-level vitals ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Win"
          value={formatCurrency(s.avgWin, 0)}
          sub="per winning trade"
          icon={TrendingUp}
          accent="bg-emerald-500/10"
        />
        <StatCard
          label="Avg Loss"
          value={`-${formatCurrency(s.avgLoss, 0)}`}
          sub="per losing trade"
          icon={Minus}
          accent="bg-red-500/10"
        />
        <StatCard
          label="Largest Win"
          value={formatCurrency(s.largestWin, 0)}
          sub="best single trade"
          icon={Zap}
          accent="bg-emerald-500/10"
        />
        <StatCard
          label="Largest Loss"
          value={`-${formatCurrency(s.largestLoss, 0)}`}
          sub="worst single trade"
          icon={Zap}
          accent="bg-red-500/10"
        />
      </div>

      {/* ── Row 3: Streaks + days ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Win Streak"
          value={s.maxWinStreak}
          sub="max consecutive wins"
          icon={Flame}
          accent="bg-emerald-500/10"
        />
        <StatCard
          label="Loss Streak"
          value={s.maxLossStreak}
          sub="max consecutive losses"
          icon={Flame}
          accent="bg-red-500/10"
        />
        <StatCard label="Best Day"  value={formatCurrency(s.bestDay, 0)}  sub={`${s.profitDays} profit day${s.profitDays !== 1 ? 's' : ''}`} />
        <StatCard label="Worst Day" value={formatCurrency(s.worstDay, 0)} sub={`${s.lossDays} loss day${s.lossDays !== 1 ? 's' : ''}`} />
      </div>

      {/* ── Row 4: Volume + expectancy ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Trades" value={s.totalTrades} sub={`${s.breakEvens} breakeven`} />
        <StatCard label="Gross Win"  value={formatCurrency(s.grossWin, 0)} sub="total profit" />
        <StatCard label="Gross Loss" value={`-${formatCurrency(s.grossLoss, 0)}`} sub="total loss" />
        <StatCard
          label="R Expectancy"
          value={s.rExpectancy !== null ? `${s.rExpectancy >= 0 ? '+' : ''}${s.rExpectancy.toFixed(2)}R` : '—'}
          sub={s.rExpectancy !== null ? 'avg per trade' : 'No R values logged'}
        />
      </div>

      {/* Daily PnL bar chart */}
      {sortedDates.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm text-white">Daily PnL</h2>
            <div className="flex items-center gap-1">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setRange(opt.months)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    range === opt.months
                      ? 'bg-brand/20 text-brand'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      )}

      {/* Session + Instrument breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Session distribution */}
        {doughnutData && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm text-white">Sessions</h2>
            </div>
            <div className="p-4" style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <div className="px-4 pb-4 space-y-1.5">
              {sessionEntries.map(([session, data], i) => (
                <div key={session} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-400">{session}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{data.count} trades</span>
                    <span className={`font-mono ${pnlClass(data.pnl)}`}>{formatCurrency(data.pnl, 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrument PnL */}
        {instrBarData && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm text-white">Instruments</h2>
            </div>
            <div className="p-4" style={{ height: 220 }}>
              <Bar data={instrBarData} options={{
                ...barOptions,
                plugins: { ...barOptions.plugins, tooltip: {
                  ...chartTooltipDefaults,
                  callbacks: { label: ctx => `PnL: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                }},
              }} />
            </div>
            <div className="px-4 pb-4 space-y-1.5">
              {instrEntries.map(([instr, data], i) => (
                <div key={instr} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-400">{instr}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{data.count} trades</span>
                    <span className={`font-mono ${pnlClass(data.pnl)}`}>{formatCurrency(data.pnl, 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
