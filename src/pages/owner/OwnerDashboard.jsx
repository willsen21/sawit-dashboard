import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Clock3 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import StatCard from '../../components/StatCard'
import { addDays, formatRupiah, formatShortDate, startOfWeek, toDateKey, todayKey } from '../../lib/dateUtils'

const RANGES = [{ label: '7 hari', value: 7 }, { label: '15 hari', value: 15 }, { label: '1 bulan', value: 'month' }]
const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0)
const kgText = (kg) => `${Number(kg || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`

export default function OwnerDashboard() {
  const { transactions, getCashSummary } = useData()
  const navigate = useNavigate()
  const [chartRange, setChartRange] = useState(7)
  const today = todayKey()
  const cashToday = getCashSummary(today)
  const stats = useMemo(() => {
    const now = new Date(); const scoped = (start) => transactions.filter((t) => t.status !== 'voided' && t.date >= start && t.date <= today)
    return { today: scoped(today), week: scoped(toDateKey(startOfWeek(now))), month: scoped(`${today.slice(0, 7)}-01`) }
  }, [transactions, today])
  const chartData = useMemo(() => {
    const now = new Date()
    const start = chartRange === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : addDays(now, -chartRange + 1)
    const days = Math.floor((toDateKey(now) > toDateKey(start) ? (new Date(toDateKey(now)) - new Date(toDateKey(start))) : 0) / 86_400_000) + 1
    return Array.from({ length: days }, (_, index) => {
      const key = toDateKey(addDays(start, index)); const day = transactions.filter((t) => t.status !== 'voided' && t.date === key)
      return { key, label: formatShortDate(key), volume: day.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0), total: sum(day, 'total') }
    })
  }, [transactions, chartRange])
  const unpaidToday = stats.today.filter((transaction) => transaction.paymentStatus === 'unpaid')
  const unpaidTotal = sum(unpaidToday, 'total')
  return <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <div className="mb-6"><h1 className="text-2xl font-display">Ringkasan</h1><p className="text-sm text-ink-500 mt-1">{formatShortDate(today)}</p></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Pembelian bersih hari ini" numericValue={stats.today.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={0} sub="Lihat detail pembelian" onClick={() => navigate('/owner/pembelian/hari-ini')} />
      <StatCard label="Pembelian bersih minggu ini" numericValue={stats.week.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={120} sub="Lihat detail pembelian" onClick={() => navigate('/owner/pembelian/minggu-ini')} />
      <StatCard label="Pembelian bersih bulan ini" numericValue={stats.month.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={240} sub="Lihat detail pembelian" onClick={() => navigate('/owner/pembelian/bulan-ini')} />
      <StatCard label="Sisa kas hari ini" numericValue={cashToday.remaining} formatValue={formatRupiah} delay={360} tone={cashToday.remaining < 0 ? 'danger' : 'gold'} sub={`dari ${formatRupiah(cashToday.initialAmount + cashToday.totalTopup)}`} />
    </div>
    {unpaidToday.length > 0 && <button type="button" onClick={() => navigate('/owner/laporan')} className="mb-6 flex w-full flex-col items-start justify-between gap-3 rounded-lg border border-gold-500/35 bg-gold-400/10 px-4 py-4 text-left transition hover:bg-gold-400/15 sm:flex-row sm:items-center sm:px-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-600"><Clock3 size={18} /></span><div><p className="font-medium text-plantation-900">Ada {unpaidToday.length} pembelian yang belum dibayar hari ini</p><p className="text-sm text-ink-500 mt-0.5">Perlu tindak lanjut pembayaran kepada pemasok.</p></div></div><span className="font-display text-lg text-gold-600 sm:shrink-0">{formatRupiah(unpaidTotal)}</span></button>}
    <div className="grid lg:grid-cols-2 gap-4"><ChartCard title="Volume pembelian" range={chartRange} setRange={setChartRange} data={chartData} type="volume"><BarChart data={chartData} margin={{ top: 12, right: 14, bottom: 0, left: 4 }}><ChartBase /><Tooltip content={<ChartTooltip type="volume" />} /><Bar dataKey="volume" fill="#3A6B58" activeBar={{ fill: '#2A5245' }} radius={[4, 4, 0, 0]} /></BarChart></ChartCard><ChartCard title="Total Pembelian" range={chartRange} setRange={setChartRange} data={chartData} type="total"><LineChart data={chartData} margin={{ top: 12, right: 14, bottom: 0, left: 4 }}><ChartBase /><Tooltip content={<ChartTooltip type="total" />} /><Line type="monotone" dataKey="total" stroke="#C98A2E" strokeWidth={2.5} dot={false} /></LineChart></ChartCard></div>
  </div>
}
function ChartBase() { return <CartesianGrid strokeDasharray="3 3" stroke="#3A6B5826" vertical /> }
function ChartCard({ title, range: activeRange, setRange, data, type, children }) { const values = data.map(item => item[type]); const max = niceMax(Math.max(...values, 0)); const yLabels = [max, max * .75, max * .5, max * .25, 0]; const every = Math.ceil(data.length / 6); return <div className="card p-5"><div className="flex flex-wrap justify-between gap-3 mb-4"><h2 className="text-sm font-medium text-ink-700">{title}</h2><div className="flex rounded-md border border-ink-900/10 p-0.5">{RANGES.map((range) => <button key={range.value} type="button" onClick={() => setRange(range.value)} className={`px-2 py-1 text-xs rounded ${activeRange === range.value ? 'bg-plantation-900 text-paper-50' : 'text-ink-500'}`}>{range.label}</button>)}</div></div><div className="chart-shell"><div className="chart-y-labels">{yLabels.map((value, index) => <span key={index}>{type === 'total' ? formatCompactRupiah(value) : kgAxis(value)}</span>)}</div><div className="chart-surface"><ResponsiveContainer width="100%" height={220}>{children}</ResponsiveContainer></div><div className="chart-x-labels" style={{ '--chart-points': data.length }}>{data.map((item, index) => <span key={item.key}>{index % every === 0 || index === data.length - 1 ? <><b>{item.label.split(' ').slice(0, 2).join(' ')}</b><small>{item.label.split(' ')[2]}</small></> : null}</span>)}</div></div></div> }
function niceMax(value) { if (!value) return 1; const power = 10 ** Math.floor(Math.log10(value)); return Math.ceil(value / power / 5) * 5 * power }
function kgAxis(value) { return `${Math.round(value).toLocaleString('id-ID')} kg` }
function formatCompactRupiah(value) { return value >= 1000000 ? `Rp${(value / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt` : formatRupiah(value) }
function ChartTooltip({ active, payload, type }) { if (!active || !payload?.length) return null; const data = payload[0].payload; const value = type === 'volume' ? kgText(data.volume) : formatRupiah(data.total); return <div className="rounded-md border border-ink-900/15 bg-white px-3 py-2 shadow-soft"><p className="text-xs text-ink-500">{formatShortDate(data.key)}</p><p className="text-sm font-medium text-ink-900 mt-1">{type === 'volume' ? 'Volume' : 'Total pembelian'}: {value}</p></div> }
