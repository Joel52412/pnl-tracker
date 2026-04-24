// Normalise a date value (DATE or TIMESTAMPTZ) to YYYY-MM-DD
function dstr(d) {
  return d ? String(d).slice(0, 10) : ''
}

// Stable chronological comparator with created_at tiebreaker — safe for null/undefined
function tradeAsc(a, b) {
  const byDate = dstr(a.date).localeCompare(dstr(b.date))
  if (byDate !== 0) return byDate
  return String(a.created_at || '').localeCompare(String(b.created_at || ''))
}

function tradeDesc(a, b) {
  const byDate = dstr(b.date).localeCompare(dstr(a.date))
  if (byDate !== 0) return byDate
  return String(b.created_at || '').localeCompare(String(a.created_at || ''))
}

function safePercent(numerator, denominator) {
  const d = Number(denominator)
  if (!Number.isFinite(d) || d === 0) return 0
  return (Number(numerator) / d) * 100
}

export function getDailyPnLMap(trades) {
  const map = {}
  for (const t of trades) {
    const d = dstr(t.date)
    if (!d) continue
    map[d] = (map[d] || 0) + Number(t.pnl || 0)
  }
  return map
}

export function todayStr() {
  // Return today's date as YYYY-MM-DD in UTC to avoid timezone shifts
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function calcCurrentBalance(startBalance, trades) {
  return Number(startBalance || 0) + trades.reduce((s, t) => s + Number(t.pnl || 0), 0)
}

export function buildEquityCurve(startBalance, trades) {
  const dailyMap = getDailyPnLMap(trades)
  const dates = Object.keys(dailyMap).sort()
  const curve = []
  let running = Number(startBalance || 0)
  for (const date of dates) {
    running += dailyMap[date]
    curve.push({ date, balance: running })
  }
  return curve
}

export function calcTrailingDrawdown(startBalance, trades, maxDrawdown, lockThreshold = 0) {
  const start = Number(startBalance || 0)
  const maxDD = Number(maxDrawdown || 0)
  const lock = Number(lockThreshold || 0)
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
  let floor = hwm - maxDD
  // Lock: once HWM reaches start + lockThreshold, floor freezes at (start + lock - maxDD)
  if (lock > 0 && hwm >= start + lock) floor = start + lock - maxDD

  const buffer = currentBalance - floor
  const bufferPercent = Math.min(100, Math.max(0, safePercent(buffer, maxDD)))

  let warningLevel = 'ok'
  if (bufferPercent <= 20) warningLevel = 'critical'
  else if (bufferPercent <= 40) warningLevel = 'warning'

  return { hwm, floor, currentBalance, buffer, bufferPercent, warningLevel, breached: maxDD > 0 && currentBalance <= floor }
}

export function calcIntradayTrailingDrawdown(startBalance, trades, maxDrawdown, lockThreshold = 0) {
  const start = Number(startBalance || 0)
  const maxDD = Number(maxDrawdown || 0)
  const lock = Number(lockThreshold || 0)

  const sorted = [...trades].sort(tradeAsc)

  let hwm = start
  let running = start
  for (const t of sorted) {
    running += Number(t.pnl || 0)
    if (running > hwm) hwm = running
  }

  const currentBalance = running
  let floor = hwm - maxDD
  if (lock > 0 && hwm >= start + lock) floor = start + lock - maxDD

  const buffer = currentBalance - floor
  const bufferPercent = Math.min(100, Math.max(0, safePercent(buffer, maxDD)))

  let warningLevel = 'ok'
  if (bufferPercent <= 20) warningLevel = 'critical'
  else if (bufferPercent <= 40) warningLevel = 'warning'

  return { hwm, floor, currentBalance, buffer, bufferPercent, warningLevel, breached: maxDD > 0 && currentBalance <= floor }
}

export function calcStaticDrawdown(startBalance, trades, maxDrawdown) {
  const start = Number(startBalance || 0)
  const maxDD = Number(maxDrawdown || 0)
  const currentBalance = calcCurrentBalance(start, trades)
  const floor = start - maxDD
  const buffer = currentBalance - floor
  const bufferPercent = Math.min(100, Math.max(0, safePercent(buffer, maxDD)))

  let warningLevel = 'ok'
  if (bufferPercent <= 20) warningLevel = 'critical'
  else if (bufferPercent <= 40) warningLevel = 'warning'

  return { floor, currentBalance, buffer, bufferPercent, warningLevel, breached: maxDD > 0 && currentBalance <= floor }
}

// Builds a per-day floor series for trailing modes so the chart can draw a rising
// floor line instead of a single flat value.  Returns null for static drawdown.
export function buildFloorCurve(account, trades) {
  const start = Number(account.start_balance || 0)
  const maxDD = Number(account.max_drawdown || 0)
  const lock = Number(account.drawdown_lock_threshold || 0)
  const type = account.drawdown_type

  if (!maxDD || type === 'static') return null

  const dailyMap = getDailyPnLMap(trades)
  const dates = Object.keys(dailyMap).sort()

  let hwm = start
  let running = start
  const curve = []

  for (const date of dates) {
    running += dailyMap[date]
    if (running > hwm) hwm = running
    let floor = hwm - maxDD
    if (lock > 0 && hwm >= start + lock) floor = start + lock - maxDD
    curve.push({ date, floor })
  }

  return curve
}

export function calcDrawdown(account, trades) {
  const lock = account.drawdown_lock_threshold
  if (account.drawdown_type === 'intraday_trailing') {
    return calcIntradayTrailingDrawdown(account.start_balance, trades, account.max_drawdown, lock)
  }
  if (account.drawdown_type === 'trailing_eod') {
    return calcTrailingDrawdown(account.start_balance, trades, account.max_drawdown, lock)
  }
  return calcStaticDrawdown(account.start_balance, trades, account.max_drawdown)
}

export function calcDailyLoss(account, trades) {
  const today = todayStr()
  const todayTrades = trades.filter(t => dstr(t.date) === today)
  const todayPnL = todayTrades.reduce((s, t) => s + Number(t.pnl || 0), 0)
  const dailyLimit = Number(account.daily_loss_limit || 0)

  const usedLoss = todayPnL < 0 ? Math.abs(todayPnL) : 0
  const remaining = dailyLimit - usedLoss
  const remainingPercent = dailyLimit > 0
    ? Math.min(100, Math.max(0, (remaining / dailyLimit) * 100))
    : 100

  let warningLevel = 'ok'
  if (dailyLimit > 0) {
    if (remainingPercent <= 20) warningLevel = 'critical'
    else if (remainingPercent <= 40) warningLevel = 'warning'
  }

  return {
    todayPnL,
    usedLoss,
    remaining: Math.max(0, remaining),
    remainingPercent,
    warningLevel,
    breached: dailyLimit > 0 && usedLoss >= dailyLimit,
  }
}

// Payout qualifying days — resets after each payout.
// Trades strictly after lastPayout.date count toward the next cycle.
export function calcPayoutProgress(account, trades, payouts = []) {
  const minDaily = Number(account.pay_min_daily || 0)
  const required = Number(account.pay_days_required || 0)

  // Sort by date desc, then created_at desc as tiebreaker
  const lastPayout = payouts.length > 0
    ? [...payouts].sort((a, b) => {
        const d = dstr(b.date).localeCompare(dstr(a.date))
        return d !== 0 ? d : String(b.created_at || '').localeCompare(String(a.created_at || ''))
      })[0]
    : null

  // Normalise to YYYY-MM-DD — guards against Supabase returning DATE with time suffix
  const cutoff = lastPayout ? dstr(lastPayout.date) : null

  const filteredTrades = cutoff
    ? trades.filter(t => dstr(t.date) > cutoff)
    : trades

  const dailyMap = getDailyPnLMap(filteredTrades)
  const qualifyingDays = Object.entries(dailyMap)
    .filter(([, pnl]) => pnl >= minDaily)
    .map(([date]) => date)
    .sort()

  const rawCount = qualifyingDays.length
  const count = required > 0 ? Math.min(rawCount, required) : rawCount
  const progress = required > 0 ? Math.min(100, (rawCount / required) * 100) : 0

  return {
    count,
    required,
    progress,
    qualifyingDays,
    met: required > 0 && rawCount >= required,
    lastPayout,
    cutoff,
  }
}

// Consistency rule: best single day must not exceed X% of total profit
export function calcConsistency(limitPercent, trades) {
  const limit = Number(limitPercent || 0)
  if (limit === 0 || trades.length === 0) return null

  const totalProfit = trades.reduce((s, t) => s + Number(t.pnl || 0), 0)
  if (totalProfit <= 0) return null

  const dailyMap = getDailyPnLMap(trades)
  const dailyValues = Object.values(dailyMap)
  if (dailyValues.length === 0) return null
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
  const start = Number(account.start_balance || 0)
  const currentBalance = calcCurrentBalance(start, trades)
  const profit = currentBalance - start
  const profitTarget = Number(account.profit_target || 0)
  const profitProgress = profitTarget > 0 ? Math.min(100, Math.max(0, (profit / profitTarget) * 100)) : 0

  const tradingDays = new Set(trades.map(t => dstr(t.date)).filter(Boolean)).size
  const minDays = Number(account.min_trading_days || 0)
  const tradingDaysProgress = minDays > 0 ? Math.min(100, (tradingDays / minDays) * 100) : 100

  const drawdown = calcDrawdown(account, trades)
  const dailyLoss = calcDailyLoss(account, trades)
  const consistency = calcConsistency(account.consistency_limit, trades)

  const today = todayStr()
  const todayPnL = trades.filter(t => dstr(t.date) === today).reduce((s, t) => s + Number(t.pnl || 0), 0)

  const passed = profitTarget > 0 &&
    profit >= profitTarget &&
    (minDays === 0 || tradingDays >= minDays) &&
    (!consistency || !consistency.breached) &&
    !drawdown.breached

  return {
    currentBalance, profit, profitTarget, profitProgress,
    tradingDays, minDays, tradingDaysProgress,
    drawdown, dailyLoss, consistency, todayPnL,
    passed, failed: drawdown.breached,
    equityCurve: buildEquityCurve(start, trades),
    floorCurve: buildFloorCurve(account, trades),
    recentTrades: [...trades].sort(tradeDesc).slice(0, 8),
  }
}

// FUNDED: full metrics for funded account
export function calcFundedMetrics(account, trades, payouts = []) {
  const start = Number(account.start_balance || 0)
  const currentBalance = calcCurrentBalance(start, trades)
  const tradingProfit = currentBalance - start
  const totalWithdrawn = payouts.reduce((s, p) => s + Number(p.amount || 0), 0)

  const drawdown = calcDrawdown(account, trades)
  const dailyLoss = calcDailyLoss(account, trades)
  const payout = calcPayoutProgress(account, trades, payouts)

  const cutoff = payout.cutoff
  const tradesAfterPayout = cutoff ? trades.filter(t => dstr(t.date) > cutoff) : trades
  const consistency = calcConsistency(account.consistency_limit, tradesAfterPayout)

  const today = todayStr()
  const todayPnL = trades.filter(t => dstr(t.date) === today).reduce((s, t) => s + Number(t.pnl || 0), 0)

  const netBalance = currentBalance - totalWithdrawn

  return {
    currentBalance, netBalance, tradingProfit, totalWithdrawn,
    drawdown, dailyLoss, payout, consistency, todayPnL,
    equityCurve: buildEquityCurve(start, trades),
    floorCurve: buildFloorCurve(account, trades),
    recentTrades: [...trades].sort(tradeDesc).slice(0, 8),
  }
}

// SIMPLE: minimal metrics
export function calcSimpleMetrics(account, trades) {
  const start = Number(account.start_balance || 0)
  const currentBalance = calcCurrentBalance(start, trades)
  const totalPnL = currentBalance - start
  const today = todayStr()
  const todayPnL = trades.filter(t => dstr(t.date) === today).reduce((s, t) => s + Number(t.pnl || 0), 0)
  const tradingDays = new Set(trades.map(t => dstr(t.date)).filter(Boolean)).size

  return {
    currentBalance, totalPnL, todayPnL, tradingDays,
    equityCurve: buildEquityCurve(start, trades),
    recentTrades: [...trades].sort(tradeDesc).slice(0, 8),
  }
}

// Stats page
export function calcTradeStats(trades) {
  if (!trades.length) return null

  const winners = trades.filter(t => Number(t.pnl || 0) > 0)
  const losers = trades.filter(t => Number(t.pnl || 0) < 0)
  const breakEvens = trades.filter(t => Number(t.pnl || 0) === 0)

  const grossWin = winners.reduce((s, t) => s + Number(t.pnl || 0), 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + Number(t.pnl || 0), 0))

  const winRate = (winners.length + losers.length) > 0 ? (winners.length / (winners.length + losers.length)) * 100 : 0
  // Profit factor: null when undefined (no losses yet) — UI renders "∞" or "—" as appropriate
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null
  const avgWin = winners.length > 0 ? grossWin / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0

  const dailyMap = getDailyPnLMap(trades)
  const dailyPnLs = Object.values(dailyMap)
  const profitDays = dailyPnLs.filter(p => p > 0).length
  const lossDays = dailyPnLs.filter(p => p < 0).length
  const breakEvenDays = dailyPnLs.filter(p => p === 0).length
  const bestDay = dailyPnLs.length ? Math.max(...dailyPnLs) : 0
  const worstDay = dailyPnLs.length ? Math.min(...dailyPnLs) : 0

  const rValues = trades.filter(t => t.r_value !== null && t.r_value !== undefined && Number.isFinite(Number(t.r_value)))
  const rExpectancy = rValues.length > 0
    ? rValues.reduce((s, t) => s + Number(t.r_value), 0) / rValues.length
    : null

  // Largest single trade win/loss
  const largestWin  = winners.length > 0 ? Math.max(...winners.map(t => Number(t.pnl || 0))) : 0
  const largestLoss = losers.length  > 0 ? Math.abs(Math.min(...losers.map(t => Number(t.pnl || 0)))) : 0

  // Avg trade net PnL (all trades incl. BE)
  const avgTrade = trades.length > 0 ? (grossWin - grossLoss) / trades.length : 0

  // Win/loss streaks — sort trades chronologically
  const sorted = [...trades].sort(tradeAsc)
  let maxWinStreak = 0, maxLossStreak = 0
  let curWin = 0, curLoss = 0
  for (const t of sorted) {
    const p = Number(t.pnl || 0)
    if (p > 0) {
      curWin++; curLoss = 0
      if (curWin > maxWinStreak) maxWinStreak = curWin
    } else if (p < 0) {
      curLoss++; curWin = 0
      if (curLoss > maxLossStreak) maxLossStreak = curLoss
    }
    // BE trades don't break or extend streaks
  }

  // Max drawdown from running equity (trade-level, not day-level)
  let peak = 0, running = 0, maxDrawdown = 0
  for (const t of sorted) {
    running += Number(t.pnl || 0)
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  const sessionMap = {}
  for (const t of trades) {
    const s = t.session || 'Other'
    if (!sessionMap[s]) sessionMap[s] = { count: 0, pnl: 0 }
    sessionMap[s].count++
    sessionMap[s].pnl += Number(t.pnl || 0)
  }

  const instrumentMap = {}
  for (const t of trades) {
    const i = t.instrument || 'Other'
    if (!instrumentMap[i]) instrumentMap[i] = { count: 0, pnl: 0 }
    instrumentMap[i].count++
    instrumentMap[i].pnl += Number(t.pnl || 0)
  }

  return {
    totalTrades: trades.length,
    winners: winners.length, losers: losers.length, breakEvens: breakEvens.length,
    winRate, profitFactor, avgWin, avgLoss, grossWin, grossLoss,
    totalPnL: grossWin - grossLoss,
    profitDays, lossDays, breakEvenDays, bestDay, worstDay,
    largestWin, largestLoss, avgTrade,
    maxWinStreak, maxLossStreak, maxDrawdown,
    rExpectancy, sessionMap, instrumentMap,
  }
}
