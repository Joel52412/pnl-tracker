import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatDateShort } from '../utils/formatters'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function EquityCurveChart({ curve, startBalance, floor }) {
  if (!curve || curve.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-600 text-sm">
        No trade data yet — add your first trade to see the equity curve
      </div>
    )
  }

  // Prepend start point
  const allPoints = [{ date: 'Start', balance: startBalance }, ...curve]
  const labels = allPoints.map(p => p.date === 'Start' ? 'Start' : formatDateShort(p.date))
  const data = allPoints.map(p => p.balance)

  const floorLine = floor !== undefined ? allPoints.map(() => floor) : null

  const isPositive = data[data.length - 1] >= startBalance

  const datasets = [
    {
      label: 'Balance',
      data,
      borderColor: isPositive ? '#34d399' : '#f87171',
      backgroundColor: isPositive
        ? 'rgba(52,211,153,0.08)'
        : 'rgba(248,113,113,0.08)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: data.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      pointBackgroundColor: isPositive ? '#34d399' : '#f87171',
      pointBorderColor: 'transparent',
    },
  ]

  if (floorLine) {
    datasets.push({
      label: 'Drawdown Floor',
      data: floorLine,
      borderColor: 'rgba(239,68,68,0.5)',
      borderWidth: 1,
      borderDash: [4, 3],
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
    })
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#13131c',
        borderColor: '#2a2a38',
        borderWidth: 1,
        titleColor: '#9ca3af',
        bodyColor: '#f3f4f6',
        padding: 10,
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === 'Drawdown Floor') return `Floor: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            return `Balance: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        border: { color: 'transparent' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: v => `$${(v / 1000).toFixed(0)}k`,
        },
        border: { color: 'transparent' },
      },
    },
  }

  return (
    <div style={{ height: 210 }}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  )
}
