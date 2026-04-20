import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccountState] = useState(null)
  const [trades, setTrades] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTrades, setLoadingTrades] = useState(false)

  // Guards against stale async responses overwriting fresh state when the user
  // switches accounts or signs out mid-flight.
  const currentUserIdRef = useRef(null)
  const currentAccountIdRef = useRef(null)

  const fetchAccounts = useCallback(async () => {
    if (!user) return []
    setLoadingAccounts(true)
    const requestUserId = user.id
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', requestUserId)
        .order('created_at', { ascending: true })
      if (currentUserIdRef.current !== requestUserId) return data || []
      if (error) {
        console.error('fetchAccounts failed:', error)
        return []
      }
      setAccounts(data || [])
      return data || []
    } finally {
      if (currentUserIdRef.current === requestUserId) setLoadingAccounts(false)
    }
  }, [user])

  const fetchTrades = useCallback(async (accountId) => {
    if (!accountId) return
    setLoadingTrades(true)
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
      if (currentAccountIdRef.current !== accountId) return
      if (error) {
        console.error('fetchTrades failed:', error)
        return
      }
      setTrades(data || [])
    } finally {
      if (currentAccountIdRef.current === accountId) setLoadingTrades(false)
    }
  }, [])

  const fetchPayouts = useCallback(async (accountId) => {
    if (!accountId) return
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
    if (currentAccountIdRef.current !== accountId) return
    if (error) {
      console.error('fetchPayouts failed:', error)
      return
    }
    setPayouts(data || [])
  }, [])

  useEffect(() => {
    currentUserIdRef.current = user?.id || null
    if (!user) {
      currentAccountIdRef.current = null
      setAccounts([]); setSelectedAccountState(null); setTrades([]); setPayouts([])
      setLoadingAccounts(false); return
    }
    fetchAccounts().then(data => {
      if (currentUserIdRef.current !== user.id) return
      if (data?.length) {
        const saved = localStorage.getItem(`pnl_account_${user.id}`)
        const found = saved ? data.find(a => a.id === saved) : null
        setSelectedAccountState(found || data[0])
      } else {
        setSelectedAccountState(null)
      }
    })
  }, [user, fetchAccounts])

  useEffect(() => {
    currentAccountIdRef.current = selectedAccount?.id || null
    if (selectedAccount) {
      setTrades([]); setPayouts([])
      fetchTrades(selectedAccount.id)
      fetchPayouts(selectedAccount.id)
    } else {
      setTrades([]); setPayouts([])
    }
  }, [selectedAccount, fetchTrades, fetchPayouts])

  function setSelectedAccount(account) {
    setSelectedAccountState(account)
    if (user && account) localStorage.setItem(`pnl_account_${user.id}`, account.id)
  }

  async function createAccount(data) {
    const { data: created, error } = await supabase
      .from('accounts').insert({ ...data, user_id: user.id }).select().single()
    if (error) throw error
    await fetchAccounts()
    setSelectedAccount(created)
    return created
  }

  async function updateAccount(id, data) {
    const { error } = await supabase.from('accounts').update(data).eq('id', id)
    if (error) throw error
    const updated = await fetchAccounts()
    if (selectedAccount?.id === id) {
      const refreshed = updated?.find(a => a.id === id)
      if (refreshed) setSelectedAccountState(refreshed)
    }
  }

  async function deleteAccount(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
    const updated = await fetchAccounts()
    if (selectedAccount?.id === id) setSelectedAccount(updated?.[0] || null)
  }

  async function deleteProfile() {
    const { error } = await supabase.rpc('delete_user')
    if (error) throw error
    // Clear local state defensively before sign-out so the UI doesn't flash
    // stale data during the auth round-trip.
    setAccounts([]); setSelectedAccountState(null); setTrades([]); setPayouts([])
    await supabase.auth.signOut()
  }

  async function addTrade(tradeData) {
    if (!selectedAccount) throw new Error('No account selected')
    const { data: created, error } = await supabase
      .from('trades')
      .insert({ ...tradeData, account_id: selectedAccount.id, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    // Optimistically prepend — fetchTrades below reconciles
    if (created) setTrades(prev => [created, ...prev])
    fetchTrades(selectedAccount.id)
  }

  async function deleteTrade(id) {
    if (!selectedAccount) throw new Error('No account selected')
    // Optimistic remove
    const prev = trades
    setTrades(p => p.filter(t => t.id !== id))
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) {
      setTrades(prev)
      throw error
    }
    fetchTrades(selectedAccount.id)
  }

  async function updateTrade(id, data) {
    if (!selectedAccount) throw new Error('No account selected')
    const { error } = await supabase.from('trades').update(data).eq('id', id)
    if (error) throw error
    await fetchTrades(selectedAccount.id)
  }

  async function addPayout(data) {
    if (!selectedAccount) throw new Error('No account selected')
    // Optimistic update — reset qualifying day counter immediately
    const tempId = `optimistic-${Date.now()}`
    const optimistic = {
      id: tempId,
      ...data,
      account_id: selectedAccount.id,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }
    setPayouts(prev => [optimistic, ...prev])
    const { data: created, error } = await supabase
      .from('payouts')
      .insert({ ...data, account_id: selectedAccount.id, user_id: user.id })
      .select()
      .single()
    if (error) {
      setPayouts(prev => prev.filter(p => p.id !== tempId))
      throw error
    }
    // Replace optimistic with the real DB record — avoids stale read-replica lag
    setPayouts(prev => [created, ...prev.filter(p => p.id !== tempId)])
    // Background sync to pick up any server-side changes
    fetchPayouts(selectedAccount.id)
  }

  async function deletePayout(id) {
    if (!selectedAccount) throw new Error('No account selected')
    const prev = payouts
    setPayouts(p => p.filter(x => x.id !== id))
    const { error } = await supabase.from('payouts').delete().eq('id', id)
    if (error) {
      setPayouts(prev)
      throw error
    }
    fetchPayouts(selectedAccount.id)
  }

  return (
    <AccountContext.Provider value={{
      accounts, selectedAccount, setSelectedAccount,
      trades, payouts, loadingAccounts, loadingTrades,
      fetchAccounts,
      fetchTrades: () => fetchTrades(selectedAccount?.id),
      fetchPayouts: () => fetchPayouts(selectedAccount?.id),
      createAccount, updateAccount, deleteAccount, deleteProfile,
      addTrade, deleteTrade, updateTrade,
      addPayout, deletePayout,
    }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
