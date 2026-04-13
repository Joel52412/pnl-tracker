import { useAccount } from '../contexts/AccountContext'
import DashSimple from '../components/DashSimple'
import DashEval from '../components/DashEval'
import DashFunded from '../components/DashFunded'

export default function Dashboard() {
  const { selectedAccount, trades, payouts, loadingTrades } = useAccount()

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 text-sm">
        No account selected
      </div>
    )
  }

  if (loadingTrades) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const type = selectedAccount.account_type || 'simple'

  if (type === 'eval') return <DashEval account={selectedAccount} trades={trades} />
  if (type === 'funded') return <DashFunded account={selectedAccount} trades={trades} payouts={payouts} />
  return <DashSimple account={selectedAccount} trades={trades} />
}
