import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAccount } from '../contexts/AccountContext'
import AccountSetup from './AccountSetup'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { accounts, loadingAccounts, selectedAccount } = useAccount()
  const [showFirstSetup, setShowFirstSetup] = useState(false)

  // Prompt to create first account
  useEffect(() => {
    if (!loadingAccounts && accounts.length === 0) {
      setShowFirstSetup(true)
    }
  }, [loadingAccounts, accounts.length])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full animate-slide-in">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-surface-700 bg-surface-900">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-surface-700 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-white">
            {selectedAccount?.name || 'PnL Tracker'}
          </span>
          <div className="w-8" />
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

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
