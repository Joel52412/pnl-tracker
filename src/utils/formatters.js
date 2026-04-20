export function formatCurrency(value, decimals = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$0.00'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.0%'
  return `${n.toFixed(decimals)}%`
}

export function formatR(value) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const s = String(dateStr).slice(0, 10)
  const [year, month, day] = s.split('-')
  if (!year || !month || !day) return '—'
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const s = String(dateStr).slice(0, 10)
  const [year, month, day] = s.split('-')
  if (!year || !month || !day) return '—'
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

export function pnlClass(value) {
  if (value > 0) return 'pnl-pos'
  if (value < 0) return 'pnl-neg'
  return 'pnl-zero'
}

export function pnlBg(value) {
  if (value > 0) return 'bg-emerald-500/10 text-emerald-400'
  if (value < 0) return 'bg-red-500/10 text-red-400'
  return 'bg-gray-500/10 text-gray-400'
}
