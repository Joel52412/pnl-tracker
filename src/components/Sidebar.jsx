import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, CalendarDays, BarChart3, TrendingUp, LogOut, Plus, ChevronDown, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { useState } from 'react'
import AccountSetup from './AccountSetup'
import { formatCurrency } from '../utils/formatters'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trades', icon: BookOpen, label: 'Trade Log' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/stats', icon: BarChart3, label: 'Statistics' },
]

export default function Sidebar({ onClose }) {
  const { signOut, user } = useAuth()
  const { accounts, selectedAccount, setSelectedAccount } = useAccount()
  const navigate = useNavigate()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <aside className="flex flex-col h-full bg-surface-900 border-r border-surface-700 w-64">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-surface-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand" />
            </div>
            <span className="font-semibold text-white text-sm">PnL Tracker</span>
          </div>
        </div>

        {/* Account selector */}
        <div className="px-3 py-3 border-b border-surface-700">
          <button
            onClick={() => setShowAccountMenu(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-brand/20 rounded-md flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand">
                  {selectedAccount?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium text-gray-100 truncate">
                  {selectedAccount?.name || 'Select Account'}
                </p>
                {selectedAccount && (
                  <p className="text-xs text-gray-500">
                    {formatCurrency(selectedAccount.start_balance, 0)}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
          </button>

          {showAccountMenu && (
            <div className="mt-1 bg-surface-800 border border-surface-600 rounded-lg overflow-hidden animate-slide-in">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { setSelectedAccount(acc); setShowAccountMenu(false); onClose?.() }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-700 transition-colors ${
                    selectedAccount?.id === acc.id ? 'text-brand' : 'text-gray-300'
                  }`}
                >
                  <div className="w-5 h-5 bg-brand/20 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-brand">{acc.name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{acc.name}</span>
                  {selectedAccount?.id === acc.id && (
                    <span className="ml-auto w-1.5 h-1.5 bg-brand rounded-full" />
                  )}
                </button>
              ))}
              <button
                onClick={() => { setShowNewAccount(true); setShowAccountMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-surface-700 transition-colors border-t border-surface-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add account</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: settings + sign out */}
        <div className="px-3 py-3 border-t border-surface-700 space-y-1">
          {selectedAccount && (
            <button
              onClick={() => setShowSettings(true)}
              className="nav-link w-full"
            >
              <Settings className="w-4 h-4 shrink-0" />
              Account Settings
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 bg-surface-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-400">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500 truncate flex-1">{user?.email}</span>
            <button onClick={handleSignOut} className="p-1.5 hover:bg-surface-700 rounded-md transition-colors" title="Sign out">
              <LogOut className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
            </button>
          </div>
        </div>
      </aside>

      {showNewAccount && (
        <AccountSetup onClose={() => setShowNewAccount(false)} />
      )}

      {showSettings && selectedAccount && (
        <AccountSetup
          account={selectedAccount}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
