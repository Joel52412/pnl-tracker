// ─── CSV Text Parser ──────────────────────────────────────────────────────────

export function parseCSVText(text) {
  // Strip BOM, normalise line endings
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n')

  function parseLine(line) {
    const cells = []
    let cell = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++ } // escaped quote
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        cells.push(cell.trim()); cell = ''
      } else {
        cell += c
      }
    }
    cells.push(cell.trim())
    return cells
  }

  // Find first non-empty line as the header row
  let hi = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { hi = i; break }
  }
  if (hi === -1) return { headers: [], rows: [] }

  const headers = parseLine(lines[hi])
  const rows = []
  for (let i = hi + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = parseLine(lines[i])
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j] ?? '' })
    rows.push(row)
  }
  return { headers, rows }
}

// ─── Broker Auto-detection ────────────────────────────────────────────────────

export function detectBroker(headers) {
  const lc = headers.map(h => h.toLowerCase().trim())
  if (lc.includes('market pos.')) return 'NinjaTrader'
  if (lc.includes('realizedpnl')) return 'Tradovate'
  if (lc.includes('position') && lc.includes('swap')) return 'MT5'
  return null
}

// ─── Session Detection ────────────────────────────────────────────────────────

function detectSession(d) {
  if (!d || isNaN(d.getTime())) return null
  const h = d.getUTCHours()
  if (h < 12) return 'London'
  if (h < 16) return 'Overlap'
  return 'NY'
}

function safeNum(v, fallback = 0) {
  const n = parseFloat(v)
  return isNaN(n) ? fallback : n
}

function toDate(d) {
  return d.toISOString().split('T')[0]
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// ─── NinjaTrader 8 ────────────────────────────────────────────────────────────
// Columns: Trade#, Instrument, Market pos., Quantity, Entry price, Exit price,
//          Entry time, Exit time, Profit, Commission, MAE, MFE, ETD, Bars in trade
// pnl = Profit - Commission (Commission is a positive cost in NT8 exports)

export function parseNinjaTrader(rows) {
  const trades = []
  for (const row of rows) {
    const profitStr = row['Profit']?.trim()
    if (!profitStr || profitStr === '') continue

    const profit = safeNum(profitStr, NaN)
    if (isNaN(profit)) continue // skip summary/empty rows

    const commission = safeNum(row['Commission'])
    const pnl = round2(profit - Math.abs(commission)) // commission is a cost

    const entryTime = row['Entry time']?.trim()
    if (!entryTime) continue

    const d = new Date(entryTime)
    if (isNaN(d.getTime())) continue

    trades.push({
      date: toDate(d),
      pnl,
      instrument: row['Instrument']?.trim() || null,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── Tradovate ────────────────────────────────────────────────────────────────
// Columns: id, accountId, timestamp, action, quantity, symbol, price, fees, realizedPnl
// pnl = realizedPnl - fees
// Strip contract month from symbol: NQH5 → NQ, MNQH5 → MNQ

const CONTRACT_MONTH_RE = /[FGHJKMNQUVXZ]\d{1,4}$/

function stripContractMonth(symbol) {
  const stripped = symbol.replace(CONTRACT_MONTH_RE, '')
  return stripped || symbol // fallback to original if strip removes everything
}

export function parseTradovate(rows) {
  const trades = []
  for (const row of rows) {
    const realizedStr = row['realizedPnl']?.trim()
    if (!realizedStr || realizedStr === '') continue
    const realizedPnl = parseFloat(realizedStr)
    if (isNaN(realizedPnl)) continue

    const fees = safeNum(row['fees'])
    const pnl = round2(realizedPnl - Math.abs(fees))

    const ts = row['timestamp']?.trim()
    if (!ts) continue
    const d = new Date(ts)
    if (isNaN(d.getTime())) continue

    const rawSymbol = row['symbol']?.trim() || ''
    const instrument = rawSymbol ? stripContractMonth(rawSymbol) : null

    trades.push({
      date: toDate(d),
      pnl,
      instrument,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── MT5 ─────────────────────────────────────────────────────────────────────
// Columns: Position, Symbol, Action, Time, Price, SL, TP, Volume,
//          Commission, Swap, Profit, Balance, Comment
// Filter: Action = "buy" or "sell"
// pnl = Profit + Commission + Swap
// Time format: "2024.01.15 14:30:45"

function parseMT5Date(str) {
  // "2024.01.15 14:30:45" → ISO 8601
  return str.replace(
    /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2}:\d{2})$/,
    '$1-$2-$3T$4Z'
  )
}

export function parseMT5(rows) {
  const trades = []
  for (const row of rows) {
    const action = row['Action']?.trim().toLowerCase()
    if (action !== 'buy' && action !== 'sell') continue

    const profitStr = row['Profit']?.trim()
    if (!profitStr || profitStr === '') continue
    const profit = parseFloat(profitStr)
    if (isNaN(profit)) continue

    const commission = safeNum(row['Commission'])
    const swap = safeNum(row['Swap'])
    const pnl = round2(profit + commission + swap)

    const timeStr = row['Time']?.trim()
    if (!timeStr) continue

    const isoStr = parseMT5Date(timeStr)
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) continue

    trades.push({
      date: isoStr.split('T')[0],
      pnl,
      instrument: row['Symbol']?.trim() || null,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export function parseTrades(rows, broker) {
  switch (broker) {
    case 'NinjaTrader': return parseNinjaTrader(rows)
    case 'Tradovate':   return parseTradovate(rows)
    case 'MT5':         return parseMT5(rows)
    default:            return []
  }
}

// ─── Duplicate Check ──────────────────────────────────────────────────────────

export function isDuplicate(trade, existingTrades) {
  return existingTrades.some(e =>
    e.date === trade.date &&
    Math.abs(Number(e.pnl) - Number(trade.pnl)) < 0.01 &&
    (e.instrument || '') === (trade.instrument || '')
  )
}
