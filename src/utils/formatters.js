export function formatCurrency(value, decimals = 2) {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`
}

export function formatR(value) {
  if (value === null || value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

export function pnlClass(value) {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-400'
}

export function pnlBg(value) {
  if (value > 0) return 'bg-emerald-500/10 text-emerald-400'
  if (value < 0) return 'bg-red-500/10 text-red-400'
  return 'bg-gray-500/10 text-gray-400'
}
