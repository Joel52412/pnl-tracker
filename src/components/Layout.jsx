import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, CalendarDays, BarChart3, BookText, Upload } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAccount } from '../contexts/AccountContext'
import AccountSetup from './AccountSetup'

const BOTTOM_NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trades',  icon: BookOpen,        label: 'Trades' },
  { to: '/calendar',icon: CalendarDays,    label: 'Calendar' },
  { to: '/journal', icon: BookText,        label: 'Journal' },
  { to: '/stats',   icon: BarChart3,       label: 'Stats' },
  { to: '/import',  icon: Upload,          label: 'Import' },
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
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-900 border-t border-surface-700 flex">
        {BOTTOM_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand' : 'text-gray-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* First-time account setup */}
      {showFirstSetup && (
        <AccountSetup
          isFirstSetup
          onClose={() => setShowFirstSetup(false)}
        />
      )}
    </div>
  )
}
