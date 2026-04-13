// ─── CSV Text Parser ──────────────────────────────────────────────────────────

export function parseCSVText(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n')

  function parseLine(line) {
    const cells = []
    let cell = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++ }
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
//
// Keys returned (used throughout this file and Import.jsx):
//   'NinjaTrader'   — NT8 performance export
//   'Tradovate'     — Tradovate trade history (boughtTimestamp/soldTimestamp)
//   'MT5 Toolbox'   — MT5 Toolbox History tab export (Profit/Loss column)
//   'MT5 MQL5'      — MT5 MQL5 script export (Swap + Type columns)

export function detectBroker(headers) {
  const lc = new Set(headers.map(h => h.toLowerCase().trim()))

  if (lc.has('market pos.'))                      return 'NinjaTrader'
  if (lc.has('boughttimestamp') || lc.has('soldtimestamp')) return 'Tradovate'
  if (lc.has('profit/loss') && lc.has('open time')) return 'MT5 Toolbox'
  if (lc.has('swap') && lc.has('open time') && lc.has('close time')) return 'MT5 MQL5'

  return null
}

// ─── Session Detection ────────────────────────────────────────────────────────
// Mapped to the app's session values: London | Overlap | NY | Asia

function detectSession(d) {
  if (!d || isNaN(d.getTime())) return null
  const h = d.getUTCHours()
  if (h >= 7  && h < 13) return 'London'   //  7–12 UTC  (London session)
  if (h >= 13 && h < 17) return 'Overlap'  // 13–16 UTC  (London + NY overlap)
  if (h >= 17 && h < 20) return 'NY'       // 17–19 UTC  (NY afternoon)
  return 'Asia'                             //  0–6 + 20–23 UTC
}

// ─── Instrument Cleaning ─────────────────────────────────────────────────────
// Strips CME-style contract month suffixes and adds slashes to Forex/Crypto pairs.
//
// Contract month letters (CME/CBOT): F G H J K M N Q U V X Z
// Pattern: TICKER + MONTH_LETTER + YEAR_DIGITS  e.g. NQH5, MNQM6, ESH25

const MONTH_LETTERS = new Set('FGHJKMNQUVXZ'.split(''))

export function cleanInstrument(symbol) {
  if (!symbol) return symbol
  const s = symbol.trim().toUpperCase()
  if (!s) return s

  // Already contains a slash — leave as-is
  if (s.includes('/')) return s

  // --- Strip futures contract month suffix ---
  // Match trailing [month letter][1–2 digit year], e.g. H5, M25, Z4
  const stripped = s.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '')
  if (stripped && stripped !== s && stripped.length >= 2) {
    return stripped
  }

  // --- Convert 6-letter XXXYYY → XXX/YYY (Forex / Crypto) ---
  // Only apply when every character is a letter (no digits, no existing slash)
  if (/^[A-Z]{6}$/.test(s)) {
    return s.slice(0, 3) + '/' + s.slice(3)
  }

  return s
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(v, fallback = 0) {
  const n = parseFloat(String(v).replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1'))
  return isNaN(n) ? fallback : n
}

function safeNumRequired(v) {
  const n = safeNum(v, NaN)
  return isNaN(n) ? null : n
}

function round2(n) { return Math.round(n * 100) / 100 }

// Parse various datetime string formats to a Date object
function parseDateTime(str) {
  if (!str || !str.trim()) return null
  const s = str.trim()

  // MT5 dot format: "2024.01.15 14:30:45"
  if (/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}/.test(s)) {
    const iso = s.replace(/^(\d{4})\.(\d{2})\.(\d{2})\s+(.+)$/, '$1-$2-$3T$4Z')
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  }

  // ISO / RFC / most other formats
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toDateStr(d) {
  // Returns YYYY-MM-DD from a Date, always using UTC date
  return d.toISOString().split('T')[0]
}

// ─── NinjaTrader 8 ────────────────────────────────────────────────────────────
// Columns: Trade#, Instrument, Market pos., Quantity, Entry price, Exit price,
//          Entry time, Exit time, Profit, Commission, MAE, MFE, ETD, Bars in trade
// pnl = Profit − |Commission|   (NT8 shows Commission as a positive cost value)

export function parseNinjaTrader(rows) {
  const trades = []
  for (const row of rows) {
    const profitStr = row['Profit']?.trim()
    if (!profitStr) continue
    const profit = safeNumRequired(profitStr)
    if (profit === null) continue  // skip summary rows (text like "Performance")

    const commission = Math.abs(safeNum(row['Commission']))
    const pnl = round2(profit - commission)

    const d = parseDateTime(row['Entry time'])
    if (!d) continue

    trades.push({
      date: toDateStr(d),
      pnl,
      instrument: cleanInstrument(row['Instrument']?.trim() || '') || null,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── Tradovate ────────────────────────────────────────────────────────────────
// Columns: symbol, _priceFormat, _priceFormatType, _tickSize, buyFillId,
//          sellFillId, qty, buyPrice, sellPrice, pnl, boughtTimestamp,
//          soldTimestamp, duration
// pnl column may contain "$250.00" or "-$120.50" — strip $ before parsing

export function parseTradovate(rows) {
  const trades = []
  for (const row of rows) {
    const pnlStr = row['pnl']?.trim()
    if (!pnlStr) continue
    const pnl = safeNumRequired(pnlStr)
    if (pnl === null) continue

    // Use boughtTimestamp for date and session
    const d = parseDateTime(row['boughtTimestamp'])
    if (!d) continue

    const rawSymbol = row['symbol']?.trim() || ''

    trades.push({
      date: toDateStr(d),
      pnl: round2(pnl),
      instrument: rawSymbol ? cleanInstrument(rawSymbol) : null,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── MT5 Format A — Toolbox History Tab Export ────────────────────────────────
// Columns: Order, Profit/Loss, Ticket, Open Price, Close Price,
//          Open Time, Close Time, Symbol, Lots
// All rows are closed trades; no row-type filtering needed.
// date / session from Close Time

export function parseMT5Toolbox(rows) {
  const trades = []
  for (const row of rows) {
    const pnlStr = row['Profit/Loss']?.trim()
    if (!pnlStr) continue
    const pnl = safeNumRequired(pnlStr)
    if (pnl === null) continue

    const d = parseDateTime(row['Close Time'])
    if (!d) continue

    const symbol = row['Symbol']?.trim() || ''

    trades.push({
      date: toDateStr(d),
      pnl: round2(pnl),
      instrument: symbol ? cleanInstrument(symbol) : null,
      session: detectSession(d),
      r_value: null,
      notes: null,
    })
  }
  return trades
}

// ─── MT5 Format B — MQL5 Script Export ───────────────────────────────────────
// Columns: Open Time, Ticket, Symbol, Type, Volume, Open Price, S/L, T/P,
//          Close Time, Close Price, Commission, Swap, Profit
// Filter: only rows where Type contains "buy" or "sell" (skip balance/deposit rows)
// pnl = Profit + Commission + Swap   (Commission and Swap are usually negative)
// date / session from Close Time

export function parseMT5MQL5(rows) {
  const trades = []
  for (const row of rows) {
    const type = row['Type']?.trim().toLowerCase() || ''
    if (!type.includes('buy') && !type.includes('sell')) continue

    const profitStr = row['Profit']?.trim()
    if (!profitStr) continue
    const profit = safeNumRequired(profitStr)
    if (profit === null) continue

    const commission = safeNum(row['Commission'])
    const swap       = safeNum(row['Swap'])
    const pnl        = round2(profit + commission + swap)

    const d = parseDateTime(row['Close Time'])
    if (!d) continue

    const symbol = row['Symbol']?.trim() || ''

    trades.push({
      date: toDateStr(d),
      pnl,
      instrument: symbol ? cleanInstrument(symbol) : null,
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
    case 'MT5 Toolbox': return parseMT5Toolbox(rows)
    case 'MT5 MQL5':    return parseMT5MQL5(rows)
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
