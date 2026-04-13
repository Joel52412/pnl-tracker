import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, CalendarDays, BarChart3, TrendingUp, LogOut, Plus, ChevronDown, Settings, BookText, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { useState } from 'react'
import AccountSetup from './AccountSetup'
import { formatCurrency } from '../utils/formatters'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trades', icon: BookOpen, label: 'Trade Log' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/journal', icon: BookText, label: 'Journal' },
  { to: '/stats', icon: BarChart3, label: 'Statistics' },
  { to: '/import', icon: Upload, label: 'Import' },
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
      <aside
        className="sidebar flex flex-col h-full"
        style={{ width: 240 }}
      >
        {/* Logo */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 32, height: 32,
              background: 'rgba(0,211,149,0.12)',
              border: '1px solid rgba(0,211,149,0.25)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp style={{ width: 16, height: 16, color: '#00d395' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'white', letterSpacing: '-0.01em' }}>
              TradeFloor
            </span>
          </div>
        </div>

        {/* Account selector */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowAccountMenu(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div style={{
                width: 26, height: 26,
                background: 'rgba(0,211,149,0.15)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#00d395' }}>
                  {selectedAccount?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="min-w-0 text-left">
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }} className="truncate">
                  {selectedAccount?.name || 'Select Account'}
                </p>
                {selectedAccount && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {formatCurrency(selectedAccount.start_balance, 0)}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown style={{
              width: 14, height: 14,
              color: 'rgba(255,255,255,0.3)',
              flexShrink: 0,
              transform: showAccountMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </button>

          {showAccountMenu && (
            <div className="mt-1.5 overflow-hidden animate-slide-in rounded-xl"
              style={{ background: 'rgba(8,10,15,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { setSelectedAccount(acc); setShowAccountMenu(false); onClose?.() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                  style={{ color: selectedAccount?.id === acc.id ? '#00d395' : 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 20, height: 20,
                    background: 'rgba(0,211,149,0.15)',
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#00d395' }}>{acc.name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{acc.name}</span>
                  {selectedAccount?.id === acc.id && (
                    <span className="ml-auto" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d395', display: 'inline-block' }} />
                  )}
                </button>
              ))}
              <button
                onClick={() => { setShowNewAccount(true); setShowAccountMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                <Plus style={{ width: 14, height: 14 }} />
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
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: settings + sign out */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {selectedAccount && (
            <button onClick={() => setShowSettings(true)} className="nav-link w-full">
              <Settings style={{ width: 16, height: 16, flexShrink: 0 }} />
              Account Settings
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-2">
            <div style={{
              width: 28, height: 28,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs truncate flex-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,71,87,0.1)'; e.currentTarget.style.color = '#ff4757'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              title="Sign out"
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </aside>

      {showNewAccount && <AccountSetup onClose={() => setShowNewAccount(false)} />}
      {showSettings && selectedAccount && (
        <AccountSetup account={selectedAccount} onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
