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

  const allPoints = [{ date: 'Start', balance: startBalance }, ...curve]
  const labels = allPoints.map(p => p.date === 'Start' ? 'Start' : formatDateShort(p.date))
  const data = allPoints.map(p => p.balance)

  const datasets = [
    {
      label: 'Balance',
      data,
      borderColor: '#3fb950',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: '#3fb950',
      pointBorderColor: '#3fb950',
    },
  ]

  // Dashed white line at starting balance
  datasets.push({
    label: 'Starting Balance',
    data: allPoints.map(() => startBalance),
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderDash: [4, 3],
    fill: false,
    tension: 0,
    pointRadius: 0,
    pointHoverRadius: 0,
  })

  if (floor !== undefined) {
    datasets.push({
      label: 'Drawdown Floor',
      data: allPoints.map(() => floor),
      borderColor: 'rgba(248, 81, 73, 0.5)',
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
        backgroundColor: '#161b22',
        borderColor: '#21262d',
        borderWidth: 1,
        titleColor: '#8b949e',
        bodyColor: '#ffffff',
        padding: 10,
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === 'Drawdown Floor') return `Floor: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            if (ctx.dataset.label === 'Starting Balance') return `Start: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            return `$${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#21262d' },
        ticks: {
          color: '#484f58',
          font: { size: 10 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        border: { color: 'transparent' },
      },
      y: {
        grid: { color: '#21262d' },
        ticks: {
          color: '#484f58',
          font: { size: 10 },
          callback: v => `$${(v / 1000).toFixed(0)}k`,
        },
        border: { color: 'transparent' },
      },
    },
  }

  return (
    <div style={{ height: 90 }}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  )
}
