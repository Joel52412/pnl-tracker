import { NavLink, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { LayoutDashboard, BookOpen, CalendarDays, BarChart3, TrendingUp, LogOut, Plus, ChevronDown, Settings, BookText, Upload, UserCircle } from 'lucide-react'
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

  // Calculate today's PnL for status indicator
  const todayPnL = selectedAccount?.today_pnl || 0
  const hasTradesToday = selectedAccount?.trades_today > 0
  const statusColor = !hasTradesToday ? '#484f58' : todayPnL >= 0 ? '#3fb950' : '#f85149'

  return (
    <>
      <aside
        className="sidebar flex flex-col h-full"
        style={{ width: 210 }}
      >
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid #21262d' }}>
          <div className="flex items-center gap-2">
            <div style={{
              width: 7, height: 7,
              background: '#3fb950',
              borderRadius: '50%',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: '#ffffff' }}>
              TradeFloor
            </span>
          </div>
        </div>

        {/* Account selector */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #21262d' }}>
          <button
            onClick={() => setShowAccountMenu(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md transition-all"
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div style={{
                width: 24, height: 24,
                background: 'rgba(59,130,246,0.15)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#58a6ff' }}>
                  {selectedAccount?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="min-w-0 text-left">
                <p style={{ fontSize: 11, fontWeight: 500, color: '#8b949e' }} className="truncate">
                  {selectedAccount?.name || 'Select Account'}
                </p>
                {selectedAccount && (
                  <p style={{ fontSize: 10, color: '#484f58' }}>
                    {formatCurrency(selectedAccount.start_balance, 0)}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown style={{
              width: 12, height: 12,
              color: '#484f58',
              flexShrink: 0,
              transform: showAccountMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.12s ease',
            }} />
          </button>

          {showAccountMenu && (
            <div className="mt-1 overflow-hidden rounded-md"
              style={{ background: '#161b22', border: '1px solid #21262d' }}
            >
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { setSelectedAccount(acc); setShowAccountMenu(false); onClose?.() }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs transition-colors"
                  style={{ color: selectedAccount?.id === acc.id ? '#ffffff' : '#8b949e' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0d1117'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 18, height: 18,
                    background: 'rgba(59,130,246,0.15)',
                    borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#58a6ff' }}>{acc.name.charAt(0)}</span>
                  </div>
                  <span className="truncate">{acc.name}</span>
                  {selectedAccount?.id === acc.id && (
                    <span className="ml-auto" style={{ width: 5, height: 5, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
                  )}
                </button>
              ))}
              <button
                onClick={() => { setShowNewAccount(true); setShowAccountMenu(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs transition-colors"
                style={{ color: '#484f58', borderTop: '1px solid #21262d' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0d1117'; e.currentTarget.style.color = '#8b949e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#484f58'; }}
              >
                <Plus style={{ width: 12, height: 12 }} />
                <span>Add account</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user info + sign out */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid #21262d' }}>
          {selectedAccount && (
            <button onClick={() => setShowSettings(true)} className="nav-link w-full">
              <Settings style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 12 }}>Account Settings</span>
            </button>
          )}

          {/* User profile section - clickable for account management */}
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => setShowSettings(true)}
            title="Click to manage accounts or close profile"
          >
            <div style={{
              width: 26, height: 26,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#58a6ff',
              flexShrink: 0,
              position: 'relative',
            }}>
              {user?.email?.charAt(0).toUpperCase()}
              {/* Status indicator dot */}
              <span className="pulse-dot" style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor,
                border: '2px solid #0a0c10',
              }} />
            </div>
            <span className="text-xs truncate flex-1" style={{ color: '#8b949e' }}>
              {user?.email?.split('@')[0]}
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              color: '#484f58',
              transition: 'color 0.12s ease',
            }}
            >
              <LogOut
                onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                style={{ width: 13, height: 13 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#484f58'; }}
                title="Sign out"
              />
            </div>
          </div>
        </div>
      </aside>

      {showNewAccount && createPortal(
        <AccountSetup onClose={() => setShowNewAccount(false)} />,
        document.body
      )}
      {showSettings && createPortal(
        <AccountSetup account={selectedAccount || null} onClose={() => setShowSettings(false)} isFirstSetup={!selectedAccount} />,
        document.body
      )}
    </>
  )
}
