import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatDateShort } from '../utils/formatters'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function EquityCurveChart({ curve, startBalance, floor, height = 180 }) {
  if (!curve || curve.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-600 text-sm" style={{ height }}>
        No trade data yet — add your first trade to see the equity curve
      </div>
    )
  }

  const allPoints = [{ date: 'Start', balance: startBalance }, ...curve]
  const labels = allPoints.map(p => p.date === 'Start' ? 'Start' : formatDateShort(p.date))
  const data = allPoints.map(p => p.balance)

  const floorLine = floor !== undefined ? allPoints.map(() => floor) : null
  const startingBalanceLine = allPoints.map(() => startBalance)

  const isPositive = data[data.length - 1] >= startBalance
  const lineColor = '#3fb950'

  // Create gradient fill
  const gradientColor = isPositive 
    ? 'rgba(63,185,80,0.15)' 
    : 'rgba(248,81,73,0.15)'

  const datasets = [
    {
      label: 'Balance',
      data,
      borderColor: lineColor,
      backgroundColor: (ctx) => {
        const chartCtx = ctx.chart.ctx
        const gradient = chartCtx.createLinearGradient(0, 0, 0, ctx.chart.height)
        gradient.addColorStop(0, gradientColor)
        gradient.addColorStop(1, 'transparent')
        return gradient
      },
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: data.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      pointBackgroundColor: lineColor,
      pointBorderColor: 'transparent',
    },
    {
      label: 'Starting Balance',
      data: startingBalanceLine,
      borderColor: 'rgba(255,255,255,0.3)',
      borderWidth: 1,
      borderDash: [4, 3],
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
    },
  ]

  if (floorLine) {
    datasets.push({
      label: 'Drawdown Floor',
      data: floorLine,
      borderColor: 'rgba(248,81,73,0.45)',
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
        borderColor: '#30363d',
        borderWidth: 1,
        titleColor: '#8b949e',
        bodyColor: '#e6edf3',
        padding: 10,
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === 'Drawdown Floor') return `Floor: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            if (ctx.dataset.label === 'Starting Balance') return `Start: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            return `Balance: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
    <div style={{ height }}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  )
}
