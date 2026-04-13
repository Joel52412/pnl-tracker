import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDate, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import {
  parseCSVText, detectBroker, parseTrades, isDuplicate,
} from '../utils/csvParsers'
import {
  Upload, FileText, CheckCircle2, AlertCircle, X,
  ChevronDown, Trash2, Clock, SkipForward,
} from 'lucide-react'
import { format } from 'date-fns'

const BROKERS = ['NinjaTrader', 'Tradovate', 'MT5 Toolbox', 'MT5 MQL5']

const BROKER_COLORS = {
  NinjaTrader:  'badge-blue',
  Tradovate:    'badge-green',
  'MT5 Toolbox': 'badge-amber',
  'MT5 MQL5':    'badge-amber',
}

const BROKER_DESCRIPTIONS = {
  NinjaTrader:  'NT8 Performance Export (.csv)',
  Tradovate:    'Trade History — boughtTimestamp format',
  'MT5 Toolbox': 'Toolbox History tab export (Profit/Loss col)',
  'MT5 MQL5':    'MQL5 script export (Swap + Type cols)',
}

export default function Import() {
  const { selectedAccount, trades, fetchTrades } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)   // { broker, trades } | null
  const [manualBroker, setManualBroker] = useState('')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)   // { imported, skipped } | null
  const [importError, setImportError] = useState('')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fileInputRef = useRef(null)

  const fetchHistory = useCallback(async () => {
    if (!selectedAccount) return
    setLoadingHistory(true)
    const { data } = await supabase
      .from('imports')
      .select('*')
      .eq('account_id', selectedAccount.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
    setLoadingHistory(false)
  }, [selectedAccount])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Reset result when a new file is chosen
  function reset() {
    setFile(null)
    setParsed(null)
    setManualBroker('')
    setParseError('')
    setResult(null)
    setImportError('')
  }

  function processFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setParseError('Only .csv files are supported.')
      return
    }
    reset()
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const { headers, rows } = parseCSVText(e.target.result)
        if (rows.length === 0) { setParseError('CSV appears to be empty.'); return }
        const broker = detectBroker(headers)
        const parsedTrades = broker ? parseTrades(rows, broker) : []
        setParsed({ broker, trades: parsedTrades, totalRows: rows.length })
        if (!broker) setManualBroker('')
      } catch (err) {
        setParseError(`Failed to parse CSV: ${err.message}`)
      }
    }
    reader.onerror = () => setParseError('Could not read file.')
    reader.readAsText(f)
  }

  // Re-parse with manually selected broker
  useEffect(() => {
    if (!file || !manualBroker || !parsed) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const { rows } = parseCSVText(e.target.result)
        const parsedTrades = parseTrades(rows, manualBroker)
        setParsed(p => ({ ...p, broker: manualBroker, trades: parsedTrades }))
      } catch {}
    }
    reader.readAsText(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualBroker])

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function handleFileInput(e) {
    const f = e.target.files[0]
    if (f) processFile(f)
    e.target.value = '' // allow re-selecting same file
  }

  // Deduplication preview counts
  const { toAdd, toSkip } = parsed
    ? parsed.trades.reduce(
        (acc, t) => {
          if (isDuplicate(t, trades)) acc.toSkip.push(t)
          else acc.toAdd.push(t)
          return acc
        },
        { toAdd: [], toSkip: [] }
      )
    : { toAdd: [], toSkip: [] }

  async function handleImport() {
    if (!selectedAccount || !parsed || toAdd.length === 0) return
    setImporting(true)
    setImportError('')
    try {
      const rows = toAdd.map(t => ({
        ...t,
        account_id: selectedAccount.id,
        user_id: user.id,
      }))

      const { error: insertErr } = await supabase.from('trades').insert(rows)
      if (insertErr) throw insertErr

      await supabase.from('imports').insert({
        account_id: selectedAccount.id,
        user_id: user.id,
        broker: parsed.broker,
        filename: file?.name || 'unknown.csv',
        trades_imported: toAdd.length,
        trades_skipped: toSkip.length,
      })

      await fetchTrades()
      await fetchHistory()
      setResult({ imported: toAdd.length, skipped: toSkip.length })
      setFile(null)
      setParsed(null)
    } catch (err) {
      setImportError(err.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  async function deleteHistory(id) {
    await supabase.from('imports').delete().eq('id', id)
    fetchHistory()
  }

  const previewTrades = parsed?.trades.slice(0, 10) || []
  const effectiveBroker = parsed?.broker || manualBroker || null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Import Trades</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Supports NinjaTrader 8, Tradovate, and MetaTrader 5
        </p>
      </div>

      {/* Success result banner */}
      {result && (
        <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-300">Import complete</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              <span className="text-emerald-400 font-medium">{result.imported}</span> trades imported
              {result.skipped > 0 && (
                <> · <span className="text-amber-400 font-medium">{result.skipped}</span> skipped (duplicates)</>
              )}
            </p>
          </div>
          <button onClick={() => setResult(null)} className="btn-ghost p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* No account selected */}
      {!selectedAccount && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">Select an account to import trades into.</p>
        </div>
      )}

      {selectedAccount && (
        <>
          {/* ── Dropzone ─────────────────────────────────────────────────── */}
          {!parsed && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer rounded-xl border-2 border-dashed transition-colors p-10
                  flex flex-col items-center justify-center gap-3 text-center
                  ${dragging
                    ? 'border-brand bg-brand/10'
                    : 'border-surface-600 bg-surface-800/30 hover:border-surface-500 hover:bg-surface-800/50'
                  }
                `}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                  ${dragging ? 'bg-brand/20' : 'bg-surface-700'}`}>
                  <Upload className={`w-6 h-6 transition-colors ${dragging ? 'text-brand' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {dragging ? 'Drop to upload' : 'Drag & drop your CSV here'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse files</p>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  {BROKERS.map(b => (
                    <div key={b} className="flex flex-col items-center gap-0.5">
                      <span className={`badge ${BROKER_COLORS[b]} text-xs`}>{b}</span>
                      <span className="text-xs text-gray-600">{BROKER_DESCRIPTIONS[b]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              {parseError && (
                <div className="flex items-center gap-2 mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />{parseError}
                </div>
              )}
            </div>
          )}

          {/* ── Preview ──────────────────────────────────────────────────── */}
          {parsed && (
            <div className="card">
              {/* File + broker header */}
              <div className="card-header flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-surface-700 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {parsed.totalRows} rows in file · {parsed.trades.length} trades parsed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {effectiveBroker
                    ? <span className={`badge ${BROKER_COLORS[effectiveBroker] || 'badge-gray'}`}>{effectiveBroker}</span>
                    : <span className="badge badge-amber">Unknown format</span>
                  }
                  <button onClick={reset} className="btn-ghost p-1.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Unknown broker: manual selector */}
              {!parsed.broker && (
                <div className="px-5 py-3 border-b border-surface-700 bg-amber-500/5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300 flex-1">
                      Could not detect broker format. Select manually:
                    </p>
                    <div className="relative">
                      <select
                        value={manualBroker}
                        onChange={e => setManualBroker(e.target.value)}
                        className="input text-sm w-40"
                      >
                        <option value="">— Select broker —</option>
                        {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dedup summary */}
              {parsed.trades.length > 0 && (
                <div className="px-5 py-3 border-b border-surface-700 flex items-center gap-5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">{toAdd.length}</span>
                    <span className="text-gray-500">new trades</span>
                  </div>
                  {toSkip.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <SkipForward className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-amber-400">{toSkip.length}</span>
                      <span className="text-gray-500">duplicates (will be skipped)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview table */}
              {previewTrades.length > 0 ? (
                <>
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Preview — first {previewTrades.length} of {parsed.trades.length} trades
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-700">
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Date</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">PnL</th>
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Instrument</th>
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Session</th>
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTrades.map((t, i) => {
                          const dupe = isDuplicate(t, trades)
                          return (
                            <tr key={i} className={`border-b border-surface-800 ${dupe ? 'opacity-40' : ''}`}>
                              <td className="px-5 py-2.5 text-gray-300 font-mono text-xs">{t.date}</td>
                              <td className={`px-5 py-2.5 text-right font-mono font-semibold ${pnlClass(t.pnl)}`}>
                                {t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}
                              </td>
                              <td className="px-5 py-2.5">
                                {t.instrument
                                  ? <span className="badge badge-blue">{t.instrument}</span>
                                  : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-5 py-2.5 hidden sm:table-cell">
                                {t.session
                                  ? <span className="badge badge-gray">{t.session}</span>
                                  : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-5 py-2.5 hidden sm:table-cell">
                                {dupe
                                  ? <span className="badge badge-amber text-xs">duplicate</span>
                                  : <span className="badge badge-green text-xs">new</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsed.trades.length > 10 && (
                    <p className="px-5 py-2 text-xs text-gray-600 border-t border-surface-800">
                      + {parsed.trades.length - 10} more trades not shown
                    </p>
                  )}
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500">
                    {effectiveBroker
                      ? 'No valid trades found in this file.'
                      : 'Select a broker format above to preview trades.'}
                  </p>
                </div>
              )}

              {/* Import error */}
              {importError && (
                <div className="mx-5 mb-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />{importError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-700">
                <button onClick={reset} className="btn-secondary px-4">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || toAdd.length === 0 || !effectiveBroker}
                  className="btn-primary px-5 flex items-center gap-2"
                >
                  {importing
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
                    : <><Upload className="w-4 h-4" />Import {toAdd.length} trade{toAdd.length !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Import History ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Import History</h2>
        <div className="card overflow-hidden">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No imports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Broker</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">File</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Imported</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Skipped</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-surface-800 hover:bg-surface-800/40 group">
                      <td className="px-5 py-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                        {format(new Date(h.created_at), 'MMM d, yyyy · h:mm a')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${BROKER_COLORS[h.broker] || 'badge-gray'}`}>{h.broker}</span>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-gray-500 text-xs truncate max-w-[160px]">
                        {h.filename || '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-emerald-400 font-mono font-semibold">{h.trades_imported}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-mono text-xs ${h.trades_skipped > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                          {h.trades_skipped}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => deleteHistory(h.id)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-md transition-all"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
