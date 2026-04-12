import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Briefcase, AlertCircle, Trash2, UserX } from 'lucide-react'
import { useAccount } from '../contexts/AccountContext'

const DEFAULTS = {
  name: 'LucidFlex 25K',
  start_balance: 25000,
  drawdown_type: 'trailing_eod',
  max_drawdown: 1500,
  daily_loss_limit: 400,
  pay_days_required: 5,
  pay_min_daily: 100,
  pay_min_request: 500,
  pay_max_request: 1000,
}

export default function AccountSetup({ account = null, onClose, onSaved, isFirstSetup = false }) {
  const { createAccount, updateAccount, deleteAccount, deleteProfile, accounts } = useAccount()
  const navigate = useNavigate()
  const isEdit = !!account
  const [form, setForm] = useState(account || DEFAULTS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function field(key) {
    return {
      value: form[key] ?? '',
      onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
    }
  }

  function numField(key) {
    return {
      value: form[key] ?? '',
      onChange: e => setForm(f => ({ ...f, [key]: e.target.value === '' ? '' : Number(e.target.value) })),
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAccount(account.id)
      onClose()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.')
      setDeleteLoading(false)
    }
  }

  async function handleDeleteProfile() {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteProfile()
      navigate('/login')
    } catch (err) {
      setDeleteError(err.message || 'Failed to close account.')
      setDeleteLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      name: form.name,
      start_balance: Number(form.start_balance),
      drawdown_type: form.drawdown_type,
      max_drawdown: Number(form.max_drawdown),
      daily_loss_limit: Number(form.daily_loss_limit),
      pay_days_required: Number(form.pay_days_required),
      pay_min_daily: Number(form.pay_min_daily),
      pay_min_request: Number(form.pay_min_request),
      pay_max_request: Number(form.pay_max_request),
    }

    if (!payload.name.trim()) { setError('Account name is required.'); return }
    if (payload.start_balance <= 0) { setError('Starting balance must be positive.'); return }
    if (payload.max_drawdown <= 0) { setError('Max drawdown must be positive.'); return }

    setLoading(true)
    try {
      if (isEdit) {
        await updateAccount(account.id, payload)
      } else {
        await createAccount(payload)
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isFirstSetup ? 'Welcome — Set Up Your Account' : isEdit ? 'Edit Account' : 'Add New Account'}
              </h2>
              <p className="text-xs text-gray-500">
                {isFirstSetup ? 'Pre-filled with LucidFlex 25K defaults' : 'Configure your prop firm rules'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account basics */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label">Account Name</label>
                <input {...field('name')} type="text" className="input" placeholder="e.g. LucidFlex 25K" required />
              </div>
              <div>
                <label className="input-label">Starting Balance ($)</label>
                <input {...numField('start_balance')} type="number" step="any" min="1" className="input" required />
              </div>
              <div>
                <label className="input-label">Drawdown Type</label>
                <select
                  value={form.drawdown_type}
                  onChange={e => setForm(f => ({ ...f, drawdown_type: e.target.value }))}
                  className="input"
                >
                  <option value="trailing_eod">Trailing EOD</option>
                  <option value="static">Static</option>
                </select>
              </div>
            </div>
          </section>

          {/* Drawdown rules */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Drawdown Rules</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Max Drawdown ($)</label>
                <input {...numField('max_drawdown')} type="number" step="any" min="1" className="input" required />
                <p className="text-xs text-gray-600 mt-1">
                  {form.drawdown_type === 'trailing_eod' ? 'Trails from EOD high-water mark' : 'Fixed from starting balance'}
                </p>
              </div>
              <div>
                <label className="input-label">Daily Loss Limit ($)</label>
                <input {...numField('daily_loss_limit')} type="number" step="any" min="1" className="input" required />
                <p className="text-xs text-gray-600 mt-1">Resets each day at midnight</p>
              </div>
            </div>
          </section>

          {/* Payout rules */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payout Rules</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Qualifying Days Needed</label>
                <input {...numField('pay_days_required')} type="number" min="1" max="90" className="input" required />
              </div>
              <div>
                <label className="input-label">Min Daily PnL to Qualify ($)</label>
                <input {...numField('pay_min_daily')} type="number" step="any" min="0" className="input" required />
              </div>
              <div>
                <label className="input-label">Min Payout Request ($)</label>
                <input {...numField('pay_min_request')} type="number" step="any" min="0" className="input" required />
              </div>
              <div>
                <label className="input-label">Max Payout Request ($)</label>
                <input {...numField('pay_max_request')} type="number" step="any" min="0" className="input" required />
              </div>
            </div>
          </section>

          {/* Preview */}
          <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Floor Calculation Preview</p>
            <div className="text-sm font-mono text-gray-300">
              {form.drawdown_type === 'trailing_eod' ? (
                <span>Floor = <span className="text-amber-400">Peak Balance</span> − <span className="text-red-400">${Number(form.max_drawdown || 0).toLocaleString()}</span></span>
              ) : (
                <span>Floor = <span className="text-blue-400">${Number(form.start_balance || 0).toLocaleString()}</span> − <span className="text-red-400">${Number(form.max_drawdown || 0).toLocaleString()}</span> = <span className="text-emerald-400">${(Number(form.start_balance || 0) - Number(form.max_drawdown || 0)).toLocaleString()}</span></span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Danger Zone — only shown when editing an existing account */}
        {isEdit && !isFirstSetup && (
          <div className="px-6 pb-6 space-y-3">
            <div className="border-t border-surface-700 pt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Danger Zone</p>

              {deleteError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {deleteError}
                </div>
              )}

              {/* Delete Account */}
              {!confirmDeleteAccount && !confirmDeleteProfile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-surface-800 border border-surface-600 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Delete this account</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Permanently removes <span className="text-gray-300">{account.name}</span> and all its trades.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(true)}
                      className="btn-danger ml-4 shrink-0 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-800 border border-surface-600 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Close my profile</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Deletes all {accounts.length} account{accounts.length !== 1 ? 's' : ''}, all trades, and your login. Cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProfile(true)}
                      className="btn-danger ml-4 shrink-0 flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm: Delete Account */}
              {confirmDeleteAccount && (
                <div className="p-4 bg-red-500/5 border border-red-500/30 rounded-lg space-y-3 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300">Delete "{account.name}"?</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This will permanently delete this account and every trade logged under it.
                        This action <span className="text-red-400 font-medium">cannot be undone</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(false)}
                      disabled={deleteLoading}
                      className="btn-secondary flex-1 text-xs py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleteLoading
                        ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                        : 'Yes, delete account'}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm: Close Profile */}
              {confirmDeleteProfile && (
                <div className="p-4 bg-red-500/5 border border-red-500/30 rounded-lg space-y-3 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300">Close your entire profile?</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This will permanently delete your login, all {accounts.length} prop firm account{accounts.length !== 1 ? 's' : ''},
                        and every trade you have ever logged. You will be signed out immediately.
                        This action <span className="text-red-400 font-medium">cannot be undone</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProfile(false)}
                      disabled={deleteLoading}
                      className="btn-secondary flex-1 text-xs py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      disabled={deleteLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleteLoading
                        ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Closing...</>
                        : 'Yes, close my profile'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
