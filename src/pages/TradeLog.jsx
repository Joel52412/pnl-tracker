import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { formatCurrency, formatDate, pnlClass, pnlBg } from '../utils/formatters'
import AddTradeModal from '../components/AddTradeModal'
import {
  Plus, Trash2, Search, Filter, ChevronUp, ChevronDown, AlertTriangle,
} from 'lucide-react'

const SESSIONS = ['All', 'London', 'NY', 'Asia', 'Overlap', 'Other']

export default function TradeLog() {
  const { trades, deleteTrade, loadingTrades } = useAccount()
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('All')
  const [instrumentSearch, setInstrumentSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = trades
    .filter(t => {
      if (sessionFilter !== 'All' && t.session !== sessionFilter) return false
      if (instrumentSearch && !t.instrument?.toLowerCase().includes(instrumentSearch.toLowerCase())) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !t.date.includes(q) &&
          !t.instrument?.toLowerCase().includes(q) &&
          !t.notes?.toLowerCase().includes(q) &&
          !String(t.pnl).includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'pnl') { va = Number(va); vb = Number(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPnL = filtered.reduce((s, t) => s + Number(t.pnl), 0)
  const winners = filtered.filter(t => Number(t.pnl) > 0).length
  const winRate = filtered.length > 0 ? (winners / filtered.length * 100).toFixed(0) : 0

  async function confirmDelete(id) {
    try {
      await deleteTrade(id)
    } finally {
      setDeleteId(null)
    }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-600" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-brand" />
      : <ChevronDown className="w-3 h-3 text-brand" />
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Trade Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{trades.length} total trades</p>
        </div>
        <button onClick={() => setShowAddTrade(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Trade</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <div className={`text-lg font-bold font-mono ${pnlClass(totalPnL)}`}>{formatCurrency(totalPnL)}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total PnL</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-white">{filtered.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Trades</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`text-lg font-bold ${Number(winRate) >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{winRate}%</div>
            <div className="text-xs text-gray-500 mt-0.5">Win Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trades..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 shrink-0" />
            <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)} className="input w-auto">
              {SESSIONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sessions' : s}</option>)}
            </select>
            <input
              type="text"
              value={instrumentSearch}
              onChange={e => setInstrumentSearch(e.target.value)}
              placeholder="Instrument..."
              className="input w-32"
            />
          </div>
        </div>
      </div>

      {/* Trade table */}
      <div className="card overflow-hidden">
        {loadingTrades ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">
              {trades.length === 0 ? 'No trades yet — log your first trade above' : 'No trades match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-800/50">
                  {[
                    { key: 'date', label: 'Date' },
                    { key: 'pnl', label: 'PnL', right: true },
                    { key: 'instrument', label: 'Instrument' },
                    { key: 'session', label: 'Session' },
                    { key: 'r_value', label: 'R', right: true },
                    { key: 'notes', label: 'Notes' },
                  ].map(({ key, label, right }) => (
                    <th
                      key={key}
                      className={`px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-300 transition-colors ${right ? 'text-right' : 'text-left'} ${key === 'notes' ? 'hidden md:table-cell' : ''} ${key === 'r_value' ? 'hidden md:table-cell' : ''} ${key === 'session' ? 'hidden sm:table-cell' : ''}`}
                      onClick={() => toggleSort(key)}
                    >
                      <span className="flex items-center gap-1 justify-end" style={right ? {} : { justifyContent: 'flex-start' }}>
                        {label} <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(trade => (
                  <tr key={trade.id} className="border-b border-surface-800 hover:bg-surface-800/40 transition-colors group">
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                      {formatDate(trade.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-semibold ${pnlClass(trade.pnl)}`}>
                        {formatCurrency(Number(trade.pnl))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {trade.instrument
                        ? <span className="badge badge-blue">{trade.instrument}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {trade.session
                        ? <span className="badge badge-gray">{trade.session}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell font-mono text-xs">
                      {trade.r_value != null
                        ? <span className={pnlClass(trade.r_value)}>{(Number(trade.r_value) >= 0 ? '+' : '')}{Number(trade.r_value).toFixed(2)}R</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                      {trade.notes
                        ? <span className="text-gray-400 text-xs truncate block">{trade.notes}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 w-10">
                      <button
                        onClick={() => setDeleteId(trade.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-md transition-all"
                        title="Delete trade"
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

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 max-w-sm w-full animate-slide-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Delete trade?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => confirmDelete(deleteId)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showAddTrade && <AddTradeModal onClose={() => setShowAddTrade(false)} />}
    </div>
  )
}
