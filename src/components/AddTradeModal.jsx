import { useState } from 'react'
import { X, Plus, AlertCircle } from 'lucide-react'
import { useAccount } from '../contexts/AccountContext'
import { format } from 'date-fns'
import InstrumentSelector from './InstrumentSelector'

const SESSIONS = ['London', 'NY', 'Asia', 'Overlap', 'Other']

export default function AddTradeModal({ onClose, prefillDate }) {
  const { addTrade } = useAccount()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    date: prefillDate || today,
    pnl: '',
    r_value: '',
    session: 'NY',
    instrument: 'MNQ',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const pnl = parseFloat(form.pnl)
    if (isNaN(pnl)) { setError('PnL must be a valid number.'); return }
    if (!form.date) { setError('Date is required.'); return }

    setLoading(true)
    try {
      await addTrade({
        date: form.date,
        pnl,
        r_value: form.r_value !== '' ? parseFloat(form.r_value) : null,
        session: form.session || null,
        instrument: form.instrument || null,
        notes: form.notes?.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add trade.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            <h2 className="text-base text-white">Log Trade</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="input-label">PnL ($) *</label>
              <input
                type="number" step="0.01" value={form.pnl} onChange={e => set('pnl', e.target.value)}
                placeholder="e.g. 250 or -120" autoFocus required
                className={`input font-mono ${form.pnl !== '' && !isNaN(form.pnl) ? Number(form.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Instrument</label>
              <InstrumentSelector value={form.instrument} onChange={v => set('instrument', v)} />
            </div>
            <div>
              <label className="input-label">Session</label>
              <select value={form.session} onChange={e => set('session', e.target.value)} className="input">
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">R Value <span className="text-gray-600">(optional)</span></label>
            <input type="number" step="0.01" value={form.r_value} onChange={e => set('r_value', e.target.value)} placeholder="e.g. 2.5 or -1" className="input font-mono" />
          </div>

          <div>
            <label className="input-label">Notes <span className="text-gray-600">(optional)</span></label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Setup, mistakes, lessons..." rows={2} className="input resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : 'Log Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
