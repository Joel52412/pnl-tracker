import { useState, useEffect, useCallback } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDate, pnlClass } from '../utils/formatters'
import { useMoney } from '../contexts/HideContext'
import { getDailyPnLMap } from '../utils/calculations'
import { format } from 'date-fns'
import { BookText, Plus, X, Save, Search, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react'

const MARKET_CONDITIONS = ['Trending', 'Ranging', 'Choppy', 'News-driven', 'Low Volume', 'High Volatility']

function MindsetRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`w-7 h-7 rounded-full border-2 transition-all text-xs font-bold
            ${n <= (value || 0)
              ? 'bg-brand border-brand text-white'
              : 'bg-transparent border-surface-600 text-gray-600 hover:border-brand/50'}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function JournalForm({ entry, dateStr, accountId, userId, onSaved, onClose, dayPnL }) {
  const fmt = useMoney()
  const [form, setForm] = useState({
    premarket: entry?.premarket || '',
    postmarket: entry?.postmarket || '',
    mindset: entry?.mindset || '',
    mindset_rating: entry?.mindset_rating || null,
    market_condition: entry?.market_condition || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        account_id: accountId,
        user_id: userId,
        date: dateStr,
        premarket: form.premarket?.trim() || null,
        postmarket: form.postmarket?.trim() || null,
        mindset: form.mindset?.trim() || null,
        mindset_rating: form.mindset_rating || null,
        market_condition: form.market_condition || null,
      }
      if (entry?.id) {
        const { error: err } = await supabase.from('journals').update(payload).eq('id', entry.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('journals').insert(payload)
        if (err) throw err
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700 sticky top-0 bg-surface-900">
          <div>
            <div className="flex items-center gap-2">
              <BookText className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-semibold text-white">
                {format(new Date(dateStr + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
              </h2>
            </div>
            {dayPnL !== undefined && (
              <span className={`text-xs font-mono font-semibold ml-6 ${pnlClass(dayPnL)}`}>
                {dayPnL >= 0 ? '+' : ''}{fmt(dayPnL)} on this day
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Market Condition</label>
              <select value={form.market_condition} onChange={e => set('market_condition', e.target.value)} className="input">
                <option value="">— Select —</option>
                {MARKET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Mindset Rating</label>
              <MindsetRating value={form.mindset_rating} onChange={v => set('mindset_rating', v)} />
            </div>
          </div>

          <div>
            <label className="input-label">Pre-market Plan</label>
            <textarea
              value={form.premarket}
              onChange={e => set('premarket', e.target.value)}
              placeholder="Bias, key levels, what to watch for..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="input-label">Post-market Review</label>
            <textarea
              value={form.postmarket}
              onChange={e => set('postmarket', e.target.value)}
              placeholder="What happened, what you did well, mistakes..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="input-label">Mindset Notes <span className="text-gray-600">(optional)</span></label>
            <textarea
              value={form.mindset}
              onChange={e => set('mindset', e.target.value)}
              placeholder="Mental state, emotions, focus level..."
              rows={2}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : <><Save className="w-4 h-4" />Save Entry</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Journal() {
  const { selectedAccount, trades } = useAccount()
  const { user } = useAuth()
  const fmt = useMoney()
  const [journals, setJournals] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editEntry, setEditEntry] = useState(null) // null = closed, {} = new, {id,...} = editing
  const [editDate, setEditDate] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const dailyMap = getDailyPnLMap(trades)

  const fetchJournals = useCallback(async () => {
    if (!selectedAccount) return
    setLoading(true)
    const { data } = await supabase
      .from('journals')
      .select('*')
      .eq('account_id', selectedAccount.id)
      .order('date', { ascending: false })
    setJournals(data || [])
    setLoading(false)
  }, [selectedAccount])

  useEffect(() => { fetchJournals() }, [fetchJournals])

  // Handle ?date= param from calendar links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('date')
    if (d) {
      const existing = journals.find(j => j.date === d)
      setEditEntry(existing || {})
      setEditDate(d)
      // Clean URL without reload
      window.history.replaceState({}, '', '/journal')
    }
  }, [journals])

  const filtered = journals.filter(j => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      j.date.includes(q) ||
      j.premarket?.toLowerCase().includes(q) ||
      j.postmarket?.toLowerCase().includes(q) ||
      j.mindset?.toLowerCase().includes(q) ||
      j.market_condition?.toLowerCase().includes(q)
    )
  })

  async function handleDelete(id) {
    await supabase.from('journals').delete().eq('id', id)
    setDeleteId(null)
    fetchJournals()
  }

  function openNew() {
    setEditEntry({})
    setEditDate(format(new Date(), 'yyyy-MM-dd'))
  }

  function openEdit(j) {
    setEditEntry(j)
    setEditDate(j.date)
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayJournal = journals.find(j => j.date === today)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-white">Journal</h1>
          <p className="text-sm text-gray-500 mt-0.5">{journals.length} entries</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Entry</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Today CTA */}
      {!todayJournal && (
        <div
          onClick={openNew}
          className="card p-4 border-brand/20 bg-brand/5 cursor-pointer hover:bg-brand/10 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-brand/10 rounded-lg flex items-center justify-center shrink-0">
            <BookText className="w-4 h-4 text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Write today's journal</p>
            <p className="text-xs text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <Plus className="w-4 h-4 text-brand shrink-0" />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search journal entries..."
          className="input pl-9 w-full"
        />
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <BookText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {journals.length === 0 ? 'No journal entries yet — write your first one above' : 'No entries match your search'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => {
            const dayPnL = dailyMap[j.date]
            return (
              <div key={j.id} className="card p-4 hover:bg-surface-800/50 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-surface-800 border border-surface-700 rounded-lg flex items-center justify-center shrink-0">
                      <BookText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {format(new Date(j.date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
                        </span>
                        {dayPnL !== undefined && (
                          <span className={`text-xs font-mono font-semibold ${pnlClass(dayPnL)}`}>
                            {dayPnL >= 0 ? '+' : ''}{fmt(dayPnL)}
                          </span>
                        )}
                        {j.market_condition && (
                          <span className="badge badge-blue text-xs">{j.market_condition}</span>
                        )}
                        {j.mindset_rating && (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className={`w-2 h-2 rounded-full ${n <= j.mindset_rating ? 'bg-brand' : 'bg-surface-700'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      {j.premarket && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          <span className="text-gray-600">Pre: </span>{j.premarket}
                        </p>
                      )}
                      {j.postmarket && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          <span className="text-gray-600">Post: </span>{j.postmarket}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(j)}
                      className="btn-ghost px-2.5 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(j.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-md transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Journal form modal */}
      {editEntry !== null && editDate && (
        <JournalForm
          entry={editEntry?.id ? editEntry : null}
          dateStr={editDate}
          accountId={selectedAccount?.id}
          userId={user?.id}
          dayPnL={dailyMap[editDate]}
          onSaved={() => { setEditEntry(null); setEditDate(null); fetchJournals() }}
          onClose={() => { setEditEntry(null); setEditDate(null) }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 max-w-sm w-full animate-slide-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Delete journal entry?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
