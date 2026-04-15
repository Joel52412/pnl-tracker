import { NavLink, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
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
        style={{ width: 210, background: '#0d0f14', borderRight: '1px solid #21262d' }}
      >
        {/* Logo */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid #21262d' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fb950' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>
              TradeFloor
            </span>
          </div>
          {/* Account pill */}
          {selectedAccount && (
            <div style={{ 
              marginTop: 8, 
              display: 'inline-block',
              fontSize: 11, 
              color: '#8b949e', 
              background: '#161b22', 
              border: '1px solid #21262d', 
              borderRadius: 5, 
              padding: '3px 8px' 
            }}>
              {selectedAccount.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
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

        {/* Footer */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid #21262d' }}>
          <div className="flex items-center gap-2 mb-2">
            <div style={{
              width: 28, height: 28,
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#8b949e',
              flexShrink: 0,
            }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs truncate flex-1" style={{ color: '#484f58' }}>
              {user?.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="nav-link w-full"
            style={{ minHeight: 'auto', padding: '6px 16px' }}
          >
            <LogOut style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#3fb950' }}>Sign out</span>
          </button>
        </div>
      </aside>

      {showNewAccount && createPortal(
        <AccountSetup onClose={() => setShowNewAccount(false)} />,
        document.body
      )}
      {showSettings && selectedAccount && createPortal(
        <AccountSetup account={selectedAccount} onClose={() => setShowSettings(false)} />,
        document.body
      )}
    </>
  )
}
