import { format } from 'date-fns'

// Group trades by date, return { 'YYYY-MM-DD': totalPnL }
export function getDailyPnLMap(trades) {
  const map = {}
  for (const t of trades) {
    const d = t.date
    map[d] = (map[d] || 0) + Number(t.pnl)
  }
  return map
}

// Today's date string YYYY-MM-DD
export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

// Current balance = start_balance + sum of all PnLs
export function calcCurrentBalance(startBalance, trades) {
  return Number(startBalance) + trades.reduce((s, t) => s + Number(t.pnl), 0)
}

// Build equity curve [{date, balance}] sorted by date
export function buildEquityCurve(startBalance, trades) {
  const dailyMap = getDailyPnLMap(trades)
  const dates = Object.keys(dailyMap).sort()
  const curve = []
  let running = Number(startBalance)
  for (const date of dates) {
    running += dailyMap[date]
    curve.push({ date, balance: running })
  }
  return curve
}

/*
  Trailing EOD Drawdown:
  - HWM starts at startBalance
  - After each COMPLETED trading day, if EOD balance > HWM → update HWM
  - Floor = HWM - maxDrawdown
  - Today's trades move the balance but NOT the HWM until day ends
  - Breached when currentBalance <= floor
*/
export function calcTrailingDrawdown(startBalance, trades, maxDrawdown) {
  const start = Number(startBalance)
  const maxDD = Number(maxDrawdown)
  const today = todayStr()
  const dailyMap = getDailyPnLMap(trades)
  const sortedDates = Object.keys(dailyMap).sort()

  let hwm = start
  let prevEodBalance = start

  // Build HWM from all COMPLETED days (not today)
  for (const date of sortedDates) {
    if (date >= today) continue // skip today — HWM only locks in at EOD
    prevEodBalance += dailyMap[date]
    if (prevEodBalance > hwm) hwm = prevEodBalance
  }

  // Today's PnL moves balance but not HWM
  const todayPnL = dailyMap[today] || 0
  const currentBalance = prevEodBalance + todayPnL
  const floor = hwm - maxDD
  const buffer = currentBalance - floor
  const bufferPercent = Math.min(100, Math.max(0, (buffer / maxDD) * 100))

  let warningLevel = 'ok'
  if (bufferPercent <= 20) warningLevel = 'critical'
  else if (bufferPercent <= 40) warningLevel = 'warning'

  return { hwm, floor, currentBalance, buffer, bufferPercent, warningLevel, breached: currentBalance <= floor }
}

/*
  Static Drawdown:
  - Floor = startBalance - maxDrawdown (fixed, never moves)
  - Buffer = currentBalance - floor
*/
export function calcStaticDrawdown(startBalance, trades, maxDrawdown) {
  const start = Number(startBalance)
  const maxDD = Number(maxDrawdown)
  const currentBalance = calcCurrentBalance(start, trades)
  const floor = start - maxDD
  const buffer = currentBalance - floor
  const bufferPercent = Math.min(100, Math.max(0, (buffer / maxDD) * 100))

  let warningLevel = 'ok'
  if (bufferPercent <= 20) warningLevel = 'critical'
  else if (bufferPercent <= 40) warningLevel = 'warning'

  return { floor, currentBalance, buffer, bufferPercent, warningLevel, breached: currentBalance <= floor }
}

// Unified drawdown calc
export function calcDrawdown(account, trades) {
  if (account.drawdown_type === 'trailing_eod') {
    return calcTrailingDrawdown(account.start_balance, trades, account.max_drawdown)
  }
  return calcStaticDrawdown(account.start_balance, trades, account.max_drawdown)
}

// Daily loss remaining for today
export function calcDailyLoss(account, trades) {
  const today = todayStr()
  const todayTrades = trades.filter(t => t.date === today)
  const todayPnL = todayTrades.reduce((s, t) => s + Number(t.pnl), 0)
  const dailyLimit = Number(account.daily_loss_limit)

  // Only counts if today is a losing day
  const usedLoss = todayPnL < 0 ? Math.abs(todayPnL) : 0
  const remaining = dailyLimit - usedLoss
  const remainingPercent = Math.min(100, Math.max(0, (remaining / dailyLimit) * 100))

  let warningLevel = 'ok'
  if (remainingPercent <= 20) warningLevel = 'critical'
  else if (remainingPercent <= 40) warningLevel = 'warning'

  return {
    todayPnL,
    usedLoss,
    remaining: Math.max(0, remaining),
    remainingPercent,
    warningLevel,
    breached: usedLoss >= dailyLimit,
  }
}

// Count qualifying payout days (daily PnL >= pay_min_daily)
export function calcPayoutProgress(account, trades) {
  const minDaily = Number(account.pay_min_daily)
  const required = Number(account.pay_days_required)
  const dailyMap = getDailyPnLMap(trades)

  const qualifyingDays = Object.entries(dailyMap)
    .filter(([, pnl]) => pnl >= minDaily)
    .map(([date]) => date)
    .sort()

  const count = qualifyingDays.length
  const progress = Math.min(100, (count / required) * 100)

  return {
    count,
    required,
    progress,
    qualifyingDays,
    met: count >= required,
  }
}

// Full stats for Stats page
export function calcTradeStats(trades) {
  if (!trades.length) return null

  const winners = trades.filter(t => Number(t.pnl) > 0)
  const losers = trades.filter(t => Number(t.pnl) < 0)
  const breakEvens = trades.filter(t => Number(t.pnl) === 0)

  const grossWin = winners.reduce((s, t) => s + Number(t.pnl), 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + Number(t.pnl), 0))

  const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const avgWin = winners.length > 0 ? grossWin / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0

  // Daily stats
  const dailyMap = getDailyPnLMap(trades)
  const dailyPnLs = Object.values(dailyMap)
  const profitDays = dailyPnLs.filter(p => p > 0).length
  const lossDays = dailyPnLs.filter(p => p < 0).length
  const breakEvenDays = dailyPnLs.filter(p => p === 0).length
  const bestDay = Math.max(...dailyPnLs, 0)
  const worstDay = Math.min(...dailyPnLs, 0)

  // R expectancy
  const rValues = trades.filter(t => t.r_value !== null && t.r_value !== undefined)
  const rExpectancy = rValues.length > 0
    ? rValues.reduce((s, t) => s + Number(t.r_value), 0) / rValues.length
    : null

  // Session breakdown
  const sessionMap = {}
  for (const t of trades) {
    const s = t.session || 'Other'
    if (!sessionMap[s]) sessionMap[s] = { count: 0, pnl: 0 }
    sessionMap[s].count++
    sessionMap[s].pnl += Number(t.pnl)
  }

  // Instrument breakdown
  const instrumentMap = {}
  for (const t of trades) {
    const i = t.instrument || 'Other'
    if (!instrumentMap[i]) instrumentMap[i] = { count: 0, pnl: 0 }
    instrumentMap[i].count++
    instrumentMap[i].pnl += Number(t.pnl)
  }

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    breakEvens: breakEvens.length,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    grossWin,
    grossLoss,
    totalPnL: grossWin - grossLoss,
    profitDays,
    lossDays,
    breakEvenDays,
    bestDay,
    worstDay,
    rExpectancy,
    sessionMap,
    instrumentMap,
  }
}

// Get all account metrics in one call
export function getAccountMetrics(account, trades) {
  const today = todayStr()
  const todayTrades = trades.filter(t => t.date === today)
  const todayPnL = todayTrades.reduce((s, t) => s + Number(t.pnl), 0)

  return {
    currentBalance: calcCurrentBalance(account.start_balance, trades),
    todayPnL,
    drawdown: calcDrawdown(account, trades),
    dailyLoss: calcDailyLoss(account, trades),
    payout: calcPayoutProgress(account, trades),
    equityCurve: buildEquityCurve(account.start_balance, trades),
    recentTrades: [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at)).slice(0, 10),
  }
}
