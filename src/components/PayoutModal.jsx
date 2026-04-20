import { useState } from 'react'
import { X, DollarSign, AlertCircle, Trophy } from 'lucide-react'
import { useAccount } from '../contexts/AccountContext'
import { formatCurrency } from '../utils/formatters'
import { format } from 'date-fns'

export default function PayoutModal({ account, onClose }) {
  const { addPayout } = useAccount()
  const [amount, setAmount] = useState(account.pay_min_request || '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const min = Number(account.pay_min_request) || 0
  const max = Number(account.pay_max_request) || 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const val = Number(amount)
    if (!Number.isFinite(val) || val <= 0) { setError('Enter a valid amount.'); return }
    if (min > 0 && val < min) { setError(`Minimum payout is ${formatCurrency(min)}.`); return }
    if (max > 0 && val > max) { setError(`Maximum payout is ${formatCurrency(max)}.`); return }

    setLoading(true)
    try {
      await addPayout({ amount: val, date: format(new Date(), 'yyyy-MM-dd'), notes: notes.trim() || null })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record payout.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm text-white">Request Payout</h2>
              <p className="text-xs text-gray-500">{formatCurrency(min)} – {formatCurrency(max)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="input-label">Payout Amount ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                step="any"
                min={min}
                max={max}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input pl-9 font-mono text-emerald-400"
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Range: {formatCurrency(min)} – {formatCurrency(max)}
            </p>
          </div>

          <div>
            <label className="input-label">Notes <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. First payout, week 3"
              className="input"
            />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-400">
              Recording this payout will reset your qualifying day counter to 0.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Confirm Payout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
