import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Briefcase, AlertCircle, Trash2, UserX } from 'lucide-react'
import { useAccount } from '../contexts/AccountContext'

const DEFAULTS = {
  name: 'LucidFlex 25K',
  account_type: 'eval',
  start_balance: 25000,
  drawdown_type: 'trailing_eod',
  max_drawdown: 1500,
  daily_loss_limit: 400,
  profit_target: 1500,
  min_trading_days: 5,
  consistency_limit: 50,
  pay_days_required: 5,
  pay_min_daily: 100,
  pay_min_request: 500,
  pay_max_request: 1000,
}

const ACCOUNT_TYPES = [
  { value: 'simple', label: 'Simple Tracker', desc: 'No prop firm rules — just track trades' },
  { value: 'eval', label: 'Evaluation', desc: 'Profit target, consistency & drawdown rules' },
  { value: 'funded', label: 'Funded', desc: 'Payout system, drawdown & consistency rules' },
]

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

  const type = form.account_type || 'simple'
  const isEval = type === 'eval'
  const isFunded = type === 'funded'
  const isPropFirm = isEval || isFunded

  function num(key) {
    return {
      value: form[key] ?? '',
      onChange: e => setForm(f => ({ ...f, [key]: e.target.value === '' ? '' : Number(e.target.value) })),
    }
  }
  function field(key) {
    return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }
  }

  async function handleDeleteAccount() {
    setDeleteError(''); setDeleteLoading(true)
    try { await deleteAccount(account.id); onClose() }
    catch (err) { setDeleteError(err.message || 'Failed.'); setDeleteLoading(false) }
  }

  async function handleDeleteProfile() {
    setDeleteError(''); setDeleteLoading(true)
    try { await deleteProfile(); navigate('/login') }
    catch (err) { setDeleteError(err.message || 'Failed.'); setDeleteLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name, account_type: form.account_type,
      start_balance: Number(form.start_balance),
      drawdown_type: form.drawdown_type || 'trailing_eod',
      max_drawdown: Number(form.max_drawdown) || 0,
      daily_loss_limit: Number(form.daily_loss_limit) || 0,
      profit_target: isEval ? Number(form.profit_target) || null : null,
      min_trading_days: isEval ? Number(form.min_trading_days) || 0 : 0,
      consistency_limit: isPropFirm ? Number(form.consistency_limit) || 0 : 0,
      pay_days_required: isFunded ? Number(form.pay_days_required) || 5 : 5,
      pay_min_daily: isFunded ? Number(form.pay_min_daily) || 100 : 100,
      pay_min_request: isFunded ? Number(form.pay_min_request) || 500 : 500,
      pay_max_request: isFunded ? Number(form.pay_max_request) || 1000 : 1000,
    }
    if (!payload.name.trim()) { setError('Account name is required.'); return }
    if (payload.start_balance <= 0) { setError('Starting balance must be positive.'); return }
    setLoading(true)
    try {
      if (isEdit) await updateAccount(account.id, payload)
      else await createAccount(payload)
      onSaved?.(); onClose()
    } catch (err) {
      setError(err.message || 'Failed to save account.')
    } finally { setLoading(false) }
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
              <h2 className="text-base text-white">
                {isFirstSetup ? 'Welcome — Set Up Your Account' : isEdit ? 'Edit Account' : 'Add New Account'}
              </h2>
              <p className="text-xs text-gray-500">
                {isFirstSetup ? 'Pre-filled with LucidFlex 25K defaults' : 'Configure your account rules'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Account type selector */}
          <section>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Account Type</h3>
            <div className="grid grid-cols-1 gap-2">
              {ACCOUNT_TYPES.map(at => (
                <label
                  key={at.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    type === at.value
                      ? 'border-brand/50 bg-brand/5'
                      : 'border-surface-600 bg-surface-800 hover:border-surface-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="account_type"
                    value={at.value}
                    checked={type === at.value}
                    onChange={() => setForm(f => ({ ...f, account_type: at.value }))}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-100">{at.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{at.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Account basics */}
          <section>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label">Account Name</label>
                <input {...field('name')} type="text" className="input" placeholder="e.g. LucidFlex 25K" required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="input-label">Starting Balance ($)</label>
                <input {...num('start_balance')} type="number" step="any" min="1" className="input" required />
              </div>
            </div>
          </section>

          {/* Drawdown rules — eval and funded */}
          {isPropFirm && (
            <section>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Drawdown Rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Drawdown Type</label>
                  <select value={form.drawdown_type || 'trailing_eod'} onChange={e => setForm(f => ({ ...f, drawdown_type: e.target.value }))} className="input">
                    <option value="trailing_eod">Trailing EOD</option>
                    <option value="static">Static</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Max Drawdown ($)</label>
                  <input {...num('max_drawdown')} type="number" step="any" min="1" className="input" required={isPropFirm} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="input-label">Daily Loss Limit ($)</label>
                  <input {...num('daily_loss_limit')} type="number" step="any" min="1" className="input" required={isPropFirm} />
                  <p className="text-xs text-gray-600 mt-1">Resets each day at midnight</p>
                </div>
              </div>
            </section>
          )}

          {/* Eval-specific rules */}
          {isEval && (
            <section>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Evaluation Rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Profit Target ($)</label>
                  <input {...num('profit_target')} type="number" step="any" min="1" className="input" />
                </div>
                <div>
                  <label className="input-label">Min Trading Days</label>
                  <input {...num('min_trading_days')} type="number" min="0" max="90" className="input" />
                  <p className="text-xs text-gray-600 mt-1">0 = no minimum</p>
                </div>
                <div className="col-span-2">
                  <label className="input-label">Consistency Rule % <span className="text-gray-600">(0 = disabled)</span></label>
                  <input {...num('consistency_limit')} type="number" step="any" min="0" max="100" className="input" placeholder="e.g. 50" />
                  <p className="text-xs text-gray-600 mt-1">Best single day cannot exceed this % of total profit</p>
                </div>
              </div>
            </section>
          )}

          {/* Funded-specific rules */}
          {isFunded && (
            <section>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Payout Rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Qualifying Days Needed</label>
                  <input {...num('pay_days_required')} type="number" min="1" max="90" className="input" required />
                </div>
                <div>
                  <label className="input-label">Min Daily PnL ($)</label>
                  <input {...num('pay_min_daily')} type="number" step="any" min="0" className="input" required />
                </div>
                <div>
                  <label className="input-label">Min Payout ($)</label>
                  <input {...num('pay_min_request')} type="number" step="any" min="0" className="input" required />
                </div>
                <div>
                  <label className="input-label">Max Payout ($)</label>
                  <input {...num('pay_max_request')} type="number" step="any" min="0" className="input" required />
                </div>
                <div className="col-span-2">
                  <label className="input-label">Consistency Rule % <span className="text-gray-600">(0 = disabled)</span></label>
                  <input {...num('consistency_limit')} type="number" step="any" min="0" max="100" className="input" placeholder="0 = disabled" />
                </div>
              </div>
            </section>
          )}

          {/* Floor preview for prop firm */}
          {isPropFirm && form.start_balance && form.max_drawdown && (
            <div className="bg-surface-800 border border-surface-600 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1 font-medium">Floor Preview</p>
              <div className="text-sm font-mono text-gray-300">
                {form.drawdown_type === 'trailing_eod'
                  ? <span>Floor = <span className="text-amber-400">Peak Balance</span> − <span className="text-red-400">${Number(form.max_drawdown || 0).toLocaleString()}</span></span>
                  : <span>Floor = <span className="text-emerald-400">${(Number(form.start_balance || 0) - Number(form.max_drawdown || 0)).toLocaleString()}</span></span>
                }
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        {isEdit && !isFirstSetup && (
          <div className="px-6 pb-6">
            <div className="border-t border-surface-700 pt-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Danger Zone</p>
              {deleteError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />{deleteError}
                </div>
              )}

              {!confirmDeleteAccount && !confirmDeleteProfile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-surface-800 border border-surface-600 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Delete this account</p>
                      <p className="text-xs text-gray-500 mt-0.5">Removes <span className="text-gray-300">{account.name}</span> and all its trades.</p>
                    </div>
                    <button type="button" onClick={() => setConfirmDeleteAccount(true)} className="btn-danger ml-4 shrink-0 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-800 border border-surface-600 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Close my profile</p>
                      <p className="text-xs text-gray-500 mt-0.5">Deletes all {accounts.length} account{accounts.length !== 1 ? 's' : ''}, trades, and your login.</p>
                    </div>
                    <button type="button" onClick={() => setConfirmDeleteProfile(true)} className="btn-danger ml-4 shrink-0 flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5" />Close
                    </button>
                  </div>
                </div>
              )}

              {confirmDeleteAccount && (
                <div className="p-4 bg-red-500/5 border border-red-500/30 rounded-lg space-y-3 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-red-300">Delete "{account.name}"?</p>
                      <p className="text-xs text-gray-400 mt-1">Permanently deletes this account and all its trades. <span className="text-red-400 font-medium">Cannot be undone.</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDeleteAccount(false)} disabled={deleteLoading} className="btn-secondary flex-1 text-xs py-1.5">Cancel</button>
                    <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {deleteLoading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</> : 'Yes, delete account'}
                    </button>
                  </div>
                </div>
              )}

              {confirmDeleteProfile && (
                <div className="p-4 bg-red-500/5 border border-red-500/30 rounded-lg space-y-3 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-red-300">Close your entire profile?</p>
                      <p className="text-xs text-gray-400 mt-1">Deletes your login, all {accounts.length} account{accounts.length !== 1 ? 's' : ''}, and every trade. <span className="text-red-400 font-medium">Cannot be undone.</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDeleteProfile(false)} disabled={deleteLoading} className="btn-secondary flex-1 text-xs py-1.5">Cancel</button>
                    <button type="button" onClick={handleDeleteProfile} disabled={deleteLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {deleteLoading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Closing...</> : 'Yes, close my profile'}
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
