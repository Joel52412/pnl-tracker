import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, CalendarDays, BarChart3, BookText, Upload } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAccount } from '../contexts/AccountContext'
import AccountSetup from './AccountSetup'

const BOTTOM_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trades',   icon: BookOpen,        label: 'Trades' },
  { to: '/calendar', icon: CalendarDays,    label: 'Calendar' },
  { to: '/journal',  icon: BookText,        label: 'Journal' },
  { to: '/stats',    icon: BarChart3,       label: 'Stats' },
  { to: '/import',   icon: Upload,          label: 'Import' },
]

export default function Layout() {
  const { accounts, loadingAccounts } = useAccount()
  const [showFirstSetup, setShowFirstSetup] = useState(false)

  useEffect(() => {
    if (!loadingAccounts && accounts.length === 0) {
      setShowFirstSetup(true)
    }
  }, [loadingAccounts, accounts.length])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080a0f' }}>

      {/* ── Ambient background orbs (fixed, pointer-events-none) ── */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        {/* Green orb — top right */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: 600, height: 600, borderRadius: '50%',
          background: 'rgba(0, 211, 149, 0.08)',
          filter: 'blur(150px)',
        }} />
        {/* Blue orb — bottom left */}
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-80px',
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.06)',
          filter: 'blur(120px)',
        }} />
        {/* Purple orb — center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.04)',
          filter: 'blur(100px)',
        }} />
      </div>

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex"
        style={{
          background: 'rgba(8, 10, 15, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          height: 60,
        }}
      >
        {BOTTOM_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-brand' : 'text-gray-600'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* First-time account setup */}
      {showFirstSetup && (
        <AccountSetup isFirstSetup onClose={() => setShowFirstSetup(false)} />
      )}
    </div>
  )
}
