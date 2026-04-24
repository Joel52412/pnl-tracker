import { AlertTriangle } from 'lucide-react'

export const GRADIENTS = {
  ok:       'linear-gradient(90deg, #00d395, #00b8a9)',
  warning:  'linear-gradient(90deg, #f5a623, #f79433)',
  critical: 'linear-gradient(90deg, #ff4757, #ff6b7a)',
}

export function ProgressBar({ percent, warningLevel = 'ok' }) {
  return (
    <div className="progress-bar-track">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(2, Math.min(100, percent))}%`, background: GRADIENTS[warningLevel] || GRADIENTS.ok }}
      />
    </div>
  )
}

export function WarnBanner({ message, type }) {
  const styles = {
    warning:  { background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', color: '#f5a623' },
    critical: { background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757' },
    breach:   { background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.4)',   color: '#ff4757' },
  }
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={styles[type]}>
      <AlertTriangle className="w-4 h-4 shrink-0" />{message}
    </div>
  )
}
