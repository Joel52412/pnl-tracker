import { createContext, useContext, useState } from 'react'
import { formatCurrency } from '../utils/formatters'

const HideContext = createContext(null)

export function HideProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('pnl_balance_hidden') === 'true' } catch { return false }
  })

  function toggle() {
    setHidden(v => {
      const next = !v
      localStorage.setItem('pnl_balance_hidden', String(next))
      return next
    })
  }

  return (
    <HideContext.Provider value={{ hidden, toggle }}>
      {children}
    </HideContext.Provider>
  )
}

export function useHide() {
  const ctx = useContext(HideContext)
  if (!ctx) throw new Error('useHide must be used within HideProvider')
  return ctx
}

// Hook that returns a money formatter respecting the hide toggle
export function useMoney() {
  const { hidden } = useHide()
  return (value, decimals = 2) => hidden ? '••••' : formatCurrency(value, decimals)
}
