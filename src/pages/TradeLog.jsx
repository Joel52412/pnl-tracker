import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { formatCurrency, formatDate, pnlClass } from '../utils/formatters'
import AddTradeModal from '../components/AddTradeModal'
import { Plus, Trash2, Search, Filter, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'

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
    if (sortKey !== col) return <ChevronUp className="w-3 h-3" style={{ color: '#484f58' }} />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3" style={{ color: '#3fb950' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: '#3fb950' }} />
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Trade Log</h1>
          <p className="text-sm" style={{ color: '#8b949e', marginTop: 2 }}>{trades.length} total trades</p>
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
            <div className={`text-lg font-bold font-mono ${totalPnL >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>{formatCurrency(totalPnL)}</div>
            <div className="text-xs" style={{ color: '#8b949e', marginTop: 2 }}>Total PnL</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-white">{filtered.length}</div>
            <div className="text-xs" style={{ color: '#8b949e', marginTop: 2 }}>Trades</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`text-lg font-bold ${Number(winRate) >= 50 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>{winRate}%</div>
            <div className="text-xs" style={{ color: '#8b949e', marginTop: 2 }}>Win Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#484f58' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trades..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: '#484f58', flexShrink: 0 }} />
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
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {loadingTrades ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#3fb950] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: '#8b949e' }}>
              {trades.length === 0 ? 'No trades yet — log your first trade above' : 'No trades match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0d0f14', borderBottom: '1px solid #21262d' }}>
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
                      className={`px-4 py-3 text-[9px] font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${right ? 'text-right' : 'text-left'} ${key === 'notes' ? 'hidden md:table-cell' : ''} ${key === 'r_value' ? 'hidden md:table-cell' : ''} ${key === 'session' ? 'hidden sm:table-cell' : ''}`}
                      style={{ color: '#8b949e' }}
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
                  <tr key={trade.id} className="group" style={{ borderBottom: '1px solid #161b22' }}>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: '#c9d1d9' }}>
                      {formatDate(trade.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-semibold ${trade.pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                        {formatCurrency(Number(trade.pnl))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {trade.instrument
                        ? <span className="badge badge-blue">{trade.instrument}</span>
                        : <span style={{ color: '#484f58' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {trade.session
                        ? <span className="badge badge-purple">{trade.session}</span>
                        : <span style={{ color: '#484f58' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell font-mono text-xs">
                      {trade.r_value != null
                        ? <span className={trade.r_value >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>{(Number(trade.r_value) >= 0 ? '+' : '')}{Number(trade.r_value).toFixed(2)}R</span>
                        : <span style={{ color: '#484f58' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                      {trade.notes
                        ? <span className="text-xs truncate block" style={{ color: '#8b949e' }}>{trade.notes}</span>
                        : <span style={{ color: '#484f58' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 w-10">
                      <button
                        onClick={() => setDeleteId(trade.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-md transition-all"
                        title="Delete trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#f85149' }} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(13,15,20,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-6 max-w-sm w-full animate-slide-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#f85149' }} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Delete trade?</h3>
                <p className="text-xs" style={{ color: '#8b949e', marginTop: 2 }}>This cannot be undone.</p>
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
