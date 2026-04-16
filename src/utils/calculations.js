import { format } from 'date-fns'

export function getDailyPnLMap(trades) {
  const map = {}
  for (const t of trades) {
    const d = t.date
    map[d] = (map[d] || 0) + Number(t.pnl)
  }
  return map
}

export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function calcCurrentBalance(startBalance, trades) {
  return Number(startBalance) + trades.reduce((s, t) => s + Number(t.pnl), 0)
}

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

export function calcTrailingDrawdown(startBalance, trades, maxDrawdown) {
  const start = Number(startBalance)
  const maxDD = Number(maxDrawdown)
  const today = todayStr()
  const dailyMap = getDailyPnLMap(trades)
  const sortedDates = Object.keys(dailyMap).sort()

  let hwm = start
  let prevEodBalance = start

  for (const date of sortedDates) {
    if (date >= today) continue
    prevEodBalance += dailyMap[date]
    if (prevEodBalance > hwm) hwm = prevEodBalance
  }

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

export function calcDrawdown(account, trades) {
  if (account.drawdown_type === 'trailing_eod') {
    return calcTrailingDrawdown(account.start_balance, trades, account.max_drawdown)
  }
  return calcStaticDrawdown(account.start_balance, trades, account.max_drawdown)
}

export function calcDailyLoss(account, trades) {
  const today = todayStr()
  const todayTrades = trades.filter(t => t.date === today)
  const todayPnL = todayTrades.reduce((s, t) => s + Number(t.pnl), 0)
  const dailyLimit = Number(account.daily_loss_limit)

  const usedLoss = todayPnL < 0 ? Math.abs(todayPnL) : 0
  const remaining = dailyLimit - usedLoss
  const remainingPercent = Math.min(100, Math.max(0, (remaining / dailyLimit) * 100))

  let warningLevel = 'ok'
  if (remainingPercent <= 20) warningLevel = 'critical'
  else if (remainingPercent <= 40) warningLevel = 'warning'

  return { todayPnL, usedLoss, remaining: Math.max(0, remaining), remainingPercent, warningLevel, breached: usedLoss >= dailyLimit }
}

// Payout qualifying days — resets after last payout date
export function calcPayoutProgress(account, trades, payouts = []) {
  const minDaily = Number(account.pay_min_daily)
  const required = Number(account.pay_days_required)

  const lastPayout = payouts.length > 0
    ? [...payouts].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  const filteredTrades = lastPayout
    ? trades.filter(t => t.date > lastPayout.date)
    : trades

  const dailyMap = getDailyPnLMap(filteredTrades)
  const qualifyingDays = Object.entries(dailyMap)
    .filter(([, pnl]) => pnl >= minDaily)
    .map(([date]) => date)
    .sort()

  const count = qualifyingDays.length
  const progress = required > 0 ? Math.min(100, (count / required) * 100) : 0

  return { count, required, progress, qualifyingDays, met: count >= required, lastPayout }
}

// Consistency rule: best single day must not exceed X% of total profit
export function calcConsistency(limitPercent, trades) {
  const limit = Number(limitPercent || 0)
  if (limit === 0 || trades.length === 0) return null

  const totalProfit = trades.reduce((s, t) => s + Number(t.pnl), 0)
  if (totalProfit <= 0) return null

  const dailyMap = getDailyPnLMap(trades)
  const dailyValues = Object.values(dailyMap)
  const bestDay = Math.max(...dailyValues)
  if (bestDay <= 0) return null

  const bestDayPct = (bestDay / totalProfit) * 100
  const breached = bestDayPct > limit
  // Need totalProfit such that bestDay/totalProfit = limit/100
  const neededTotal = bestDay / (limit / 100)
  const needed = breached ? Math.ceil(neededTotal - totalProfit) : 0

  let warningLevel = 'ok'
  if (breached) warningLevel = 'critical'
  else if (bestDayPct >= limit * 0.9) warningLevel = 'warning' // within 10% of limit

  return { bestDay, totalProfit, bestDayPct, limit, breached, needed, warningLevel }
}

// EVAL: full metrics for evaluation account
export function calcEvalMetrics(account, trades) {
  const start = Number(account.start_balance)
  const currentBalance = calcCurrentBalance(start, trades)
  const profit = currentBalance - start
  const profitTarget = Number(account.profit_target || 0)
  const profitProgress = profitTarget > 0 ? Math.min(100, Math.max(0, (profit / profitTarget) * 100)) : 0

  const tradingDays = new Set(trades.map(t => t.date)).size
  const minDays = Number(account.min_trading_days || 0)
  const tradingDaysProgress = minDays > 0 ? Math.min(100, (tradingDays / minDays) * 100) : 100

  const drawdown = calcDrawdown(account, trades)
  const dailyLoss = calcDailyLoss(account, trades)
  const consistency = calcConsistency(account.consistency_limit, trades)

  const today = todayStr()
  const todayPnL = trades.filter(t => t.date === today).reduce((s, t) => s + Number(t.pnl), 0)

  const passed = profit >= profitTarget &&
    (minDays === 0 || tradingDays >= minDays) &&
    (!consistency || !consistency.breached) &&
    !drawdown.breached

  return {
    currentBalance, profit, profitTarget, profitProgress,
    tradingDays, minDays, tradingDaysProgress,
    drawdown, dailyLoss, consistency, todayPnL,
    passed, failed: drawdown.breached,
    equityCurve: buildEquityCurve(start, trades),
    recentTrades: [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at)).slice(0, 8),
  }
}

// FUNDED: full metrics for funded account
export function calcFundedMetrics(account, trades, payouts = []) {
  const start = Number(account.start_balance)
  const currentBalance = calcCurrentBalance(start, trades)
  const tradingProfit = currentBalance - start
  const totalWithdrawn = payouts.reduce((s, p) => s + Number(p.amount), 0)

  const drawdown = calcDrawdown(account, trades)
  const dailyLoss = calcDailyLoss(account, trades)
  const payout = calcPayoutProgress(account, trades, payouts)

  const lastPayout = payout.lastPayout
  const tradesAfterPayout = lastPayout ? trades.filter(t => t.date > lastPayout.date) : trades
  const consistency = calcConsistency(account.consistency_limit, tradesAfterPayout)

  const today = todayStr()
  const todayPnL = trades.filter(t => t.date === today).reduce((s, t) => s + Number(t.pnl), 0)

  return {
    currentBalance, tradingProfit, totalWithdrawn,
    drawdown, dailyLoss, payout, consistency, todayPnL,
    equityCurve: buildEquityCurve(start, trades),
    recentTrades: [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at)).slice(0, 8),
  }
}

// SIMPLE: minimal metrics
export function calcSimpleMetrics(account, trades) {
  const start = Number(account.start_balance)
  const currentBalance = calcCurrentBalance(start, trades)
  const totalPnL = currentBalance - start
  const today = todayStr()
  const todayPnL = trades.filter(t => t.date === today).reduce((s, t) => s + Number(t.pnl), 0)
  const tradingDays = new Set(trades.map(t => t.date)).size

  return {
    currentBalance, totalPnL, todayPnL, tradingDays,
    equityCurve: buildEquityCurve(start, trades),
    recentTrades: [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at)).slice(0, 8),
  }
}

// Stats page
export function calcTradeStats(trades) {
  if (!trades.length) return null

  const winners = trades.filter(t => Number(t.pnl) > 0)
  const losers = trades.filter(t => Number(t.pnl) < 0)
  const breakEvens = trades.filter(t => Number(t.pnl) === 0)

  const grossWin = winners.reduce((s, t) => s + Number(t.pnl), 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + Number(t.pnl), 0))

  const winRate = (winners.length + losers.length) > 0 ? (winners.length / (winners.length + losers.length)) * 100 : 0
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const avgWin = winners.length > 0 ? grossWin / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0

  const dailyMap = getDailyPnLMap(trades)
  const dailyPnLs = Object.values(dailyMap)
  const profitDays = dailyPnLs.filter(p => p > 0).length
  const lossDays = dailyPnLs.filter(p => p < 0).length
  const breakEvenDays = dailyPnLs.filter(p => p === 0).length
  const bestDay = dailyPnLs.length ? Math.max(...dailyPnLs) : 0
  const worstDay = dailyPnLs.length ? Math.min(...dailyPnLs) : 0

  const rValues = trades.filter(t => t.r_value !== null && t.r_value !== undefined)
  const rExpectancy = rValues.length > 0
    ? rValues.reduce((s, t) => s + Number(t.r_value), 0) / rValues.length
    : null

  const sessionMap = {}
  for (const t of trades) {
    const s = t.session || 'Other'
    if (!sessionMap[s]) sessionMap[s] = { count: 0, pnl: 0 }
    sessionMap[s].count++
    sessionMap[s].pnl += Number(t.pnl)
  }

  const instrumentMap = {}
  for (const t of trades) {
    const i = t.instrument || 'Other'
    if (!instrumentMap[i]) instrumentMap[i] = { count: 0, pnl: 0 }
    instrumentMap[i].count++
    instrumentMap[i].pnl += Number(t.pnl)
  }

  return {
    totalTrades: trades.length,
    winners: winners.length, losers: losers.length, breakEvens: breakEvens.length,
    winRate, profitFactor, avgWin, avgLoss, grossWin, grossLoss,
    totalPnL: grossWin - grossLoss,
    profitDays, lossDays, breakEvenDays, bestDay, worstDay,
    rExpectancy, sessionMap, instrumentMap,
  }
}
