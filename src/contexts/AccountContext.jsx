import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    setLoadingAccounts(true)
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error) setAccounts(data || [])
    setLoadingAccounts(false)
    return data
  }, [user])

  const fetchTrades = useCallback(async (accountId) => {
    if (!accountId) return
    setLoadingTrades(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
    if (!error) setTrades(data || [])
    setLoadingTrades(false)
  }, [])

  const fetchPayouts = useCallback(async (accountId) => {
    if (!accountId) return
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
    if (!error) setPayouts(data || [])
  }, [])

  useEffect(() => {
    if (!user) {
      setAccounts([]); setSelectedAccountState(null); setTrades([]); setPayouts([])
      setLoadingAccounts(false); return
    }
    fetchAccounts().then(data => {
      if (data?.length) {
        const saved = localStorage.getItem(`pnl_account_${user.id}`)
        const found = saved ? data.find(a => a.id === saved) : null
        setSelectedAccountState(found || data[0])
      }
    })
  }, [user, fetchAccounts])

  useEffect(() => {
    if (selectedAccount) {
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
    await supabase.auth.signOut()
  }

  async function addTrade(tradeData) {
    const { error } = await supabase
      .from('trades')
      .insert({ ...tradeData, account_id: selectedAccount.id, user_id: user.id })
    if (error) throw error
    await fetchTrades(selectedAccount.id)
  }

  async function deleteTrade(id) {
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) throw error
    await fetchTrades(selectedAccount.id)
  }

  async function updateTrade(id, data) {
    const { error } = await supabase.from('trades').update(data).eq('id', id)
    if (error) throw error
    await fetchTrades(selectedAccount.id)
  }

  async function addPayout(data) {
    const { error } = await supabase
      .from('payouts')
      .insert({ ...data, account_id: selectedAccount.id, user_id: user.id })
    if (error) throw error
    await fetchPayouts(selectedAccount.id)
  }

  return (
    <AccountContext.Provider value={{
      accounts, selectedAccount, setSelectedAccount,
      trades, payouts, loadingAccounts, loadingTrades,
      fetchAccounts, fetchTrades: () => fetchTrades(selectedAccount?.id),
      createAccount, updateAccount, deleteAccount, deleteProfile,
      addTrade, deleteTrade, updateTrade,
      addPayout,
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
