import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, Leaf, Package, ShieldCheck, Wallet } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import { addDays, formatRupiah, formatShortDate, startOfWeek, toDateKey, todayKey } from '../../lib/dateUtils'
import { STONE_TYPES, canonicalStoneType } from '../../lib/stoneUtils'
import { SHOW_FRUIT_PURCHASES } from '../../config/features'
import { reportedPurchaseTotal } from '../../lib/purchaseCalculations'

const RANGES = [{ label: '7 hari', value: 7 }, { label: '15 hari', value: 15 }, { label: '1 bulan', value: 'month' }]
const kgText = (kg) => `${Number(kg || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`

export default function OwnerDashboard() {
  const { currentUser } = useAuth()
  const { transactions, supplierMap, stoneSales, getCashSummary } = useData()
  const navigate = useNavigate()
  const [chartRange, setChartRange] = useState(7)
  const today = todayKey()
  const cashToday = getCashSummary(today)
  const visibleTransactions = useMemo(() => transactions.filter((item) => SHOW_FRUIT_PURCHASES || item.kind === 'brondolan'), [transactions])
  const stats = useMemo(() => {
    const now = new Date(); const scoped = (start) => visibleTransactions.filter((t) => t.status !== 'voided' && t.date >= start && t.date <= today)
    return { today: scoped(today), week: scoped(toDateKey(startOfWeek(now))), month: scoped(`${today.slice(0, 7)}-01`) }
  }, [visibleTransactions, today])
  const chartData = useMemo(() => {
    const now = new Date()
    const start = chartRange === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : addDays(now, -chartRange + 1)
    const days = Math.floor((toDateKey(now) > toDateKey(start) ? (new Date(toDateKey(now)) - new Date(toDateKey(start))) : 0) / 86_400_000) + 1
    return Array.from({ length: days }, (_, index) => {
      const key = toDateKey(addDays(start, index)); const day = visibleTransactions.filter((t) => t.status !== 'voided' && t.date === key)
      return { key, label: formatShortDate(key), volume: day.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0), total: day.reduce((total, item) => total + reportedPurchaseTotal(item, supplierMap, item.kind || 'buah'), 0) }
    })
  }, [visibleTransactions, supplierMap, chartRange])
  const stoneSalesToday = useMemo(() => stoneSales.filter((sale) => sale.date === today), [stoneSales, today])
  const stoneSaleBreakdown = STONE_TYPES.map((type) => ({ type, kg: stoneSalesToday.filter((sale) => canonicalStoneType(sale.type) === type).reduce((total, sale) => total + Number(sale.netKg || 0), 0) })).filter((item) => item.kg > 0)
  const stoneKgToday = stoneSaleBreakdown.reduce((total, item) => total + item.kg, 0)
  const unpaidToday = stats.today.filter((transaction) => transaction.paymentStatus === 'unpaid')
  const unpaidTotal = unpaidToday.reduce((total, item) => total + reportedPurchaseTotal(item, supplierMap, item.kind || 'buah'), 0)
  const greeting = greetingForHour(new Date().getHours())
  const transactionCount = stats.today.length
  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-9">
    <section className="dashboard-hero relative mb-6 overflow-hidden rounded-[1.75rem] bg-plantation-950 px-5 py-7 text-white shadow-soft sm:px-8 sm:py-9 lg:px-10">
      <DashboardScene />
      <div className="relative z-10 grid gap-8 pb-12 sm:pb-14 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80"><CalendarDays size={14} className="text-gold-300" />{formatShortDate(today)}</span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.2em] text-gold-300">Ringkasan pemilik</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl lg:text-[2.75rem]">{greeting}, {currentUser?.name || 'Pemilik'}.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">Pantau pembelian, arus kas, dan kegiatan kebun Anda dari satu tempat.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-semibold text-plantation-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-300" onClick={() => navigate('/owner/laporan')}>Buka laporan <ArrowRight size={16} /></button>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15" onClick={() => navigate('/owner/operasional')}><Wallet size={16} /> Operasional kebun</button>
          </div>
        </div>
        <div className="dashboard-today-card relative min-w-52 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm sm:min-w-60 sm:p-5">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-white/65">Transaksi hari ini</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-300/15 text-gold-300"><ShieldCheck size={18} /></span></div>
          <p className="mt-2 font-display text-4xl text-white">{transactionCount.toLocaleString('id-ID')}</p>
          <p className="mt-1 text-xs text-white/55">{transactionCount ? 'Transaksi tercatat hari ini' : 'Belum ada transaksi hari ini'}</p>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/75"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" /> Data ringkasan diperbarui</div>
        </div>
      </div>
    </section>

    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-gold-700">Performa pembelian</p><h2 className="mt-1 font-display text-xl text-plantation-950">Angka penting</h2></div><span className="hidden text-xs text-ink-400 sm:inline">Pilih kartu untuk melihat rinciannya</span></div>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={<Leaf size={17} />} label={`${SHOW_FRUIT_PURCHASES ? 'Pembelian' : 'Brondolan'} bersih hari ini`} numericValue={stats.today.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={0} sub="Lihat transaksi hari ini" onClick={() => navigate('/owner/pembelian/hari-ini')} />
      <StatCard icon={<ArrowUpRight size={17} />} label={`${SHOW_FRUIT_PURCHASES ? 'Pembelian' : 'Brondolan'} bersih minggu ini`} numericValue={stats.week.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={100} sub="Lihat transaksi minggu ini" onClick={() => navigate('/owner/pembelian/minggu-ini')} />
      <StatCard icon={<CalendarDays size={17} />} label={`${SHOW_FRUIT_PURCHASES ? 'Pembelian' : 'Brondolan'} bersih bulan ini`} numericValue={stats.month.reduce((total, item) => total + Number(item.netKg ?? item.weightKg ?? 0), 0)} formatValue={kgText} delay={200} sub="Lihat transaksi bulan ini" onClick={() => navigate('/owner/pembelian/bulan-ini')} />
      <StatCard icon={<Wallet size={17} />} label="Sisa kas hari ini" numericValue={cashToday.remaining} formatValue={formatRupiah} delay={300} tone={cashToday.remaining < 0 ? 'danger' : 'gold'} sub={`dari ${formatRupiah(cashToday.initialAmount + cashToday.totalTopup)}`} />
    </div>
    <section className="dashboard-stone-card mb-6 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl border border-plantation-900/10 bg-white p-5 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-plantation-50 text-plantation-800"><Package size={21} /></span><div><p className="text-sm font-semibold text-plantation-950">Penjualan batu hari ini</p><p className="mt-1 font-display text-2xl text-plantation-900">{kgText(stoneKgToday)}</p><p className="mt-1 text-sm text-ink-500">{stoneSaleBreakdown.length ? stoneSaleBreakdown.map((item) => `${item.type}: ${kgText(item.kg)}`).join(' · ') : 'Belum ada penjualan batu hari ini.'}</p></div></div>
      <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-plantation-900/15 px-4 py-2.5 text-sm font-medium text-plantation-900 transition hover:border-plantation-700/30 hover:bg-plantation-50" onClick={() => navigate('/owner/batu')}>Stok dan riwayat batu <ArrowRight size={16} /></button>
    </section>
    {unpaidToday.length > 0 && <button type="button" onClick={() => navigate('/owner/laporan')} className="mb-6 flex w-full flex-col items-start justify-between gap-3 rounded-lg border border-gold-500/35 bg-gold-400/10 px-4 py-4 text-left transition hover:bg-gold-400/15 sm:flex-row sm:items-center sm:px-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-600"><Clock3 size={18} /></span><div><p className="font-medium text-plantation-900">Ada {unpaidToday.length} pembelian yang belum dibayar hari ini</p><p className="text-sm text-ink-500 mt-0.5">Perlu tindak lanjut pembayaran kepada pemasok.</p></div></div><span className="font-display text-lg text-gold-600 sm:shrink-0">{formatRupiah(unpaidTotal)}</span></button>}
    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-gold-700">Tren transaksi</p><h2 className="mt-1 font-display text-xl text-plantation-950">Pergerakan pembelian</h2></div><span className="hidden text-xs text-ink-400 sm:inline">Pilih periode di tiap grafik</span></div>
    <div className="grid gap-4 lg:grid-cols-2"><ChartCard title={`Volume ${SHOW_FRUIT_PURCHASES ? 'pembelian' : 'brondolan'}`} range={chartRange} setRange={setChartRange} data={chartData} type="volume"><BarChart data={chartData} margin={{ top: 12, right: 14, bottom: 0, left: 4 }}><ChartBase /><Tooltip content={<ChartTooltip type="volume" />} /><Bar dataKey="volume" fill="#3A6B58" activeBar={{ fill: '#2A5245' }} radius={[4, 4, 0, 0]} /></BarChart></ChartCard><ChartCard title={`Nilai ${SHOW_FRUIT_PURCHASES ? 'pembelian' : 'brondolan'}`} range={chartRange} setRange={setChartRange} data={chartData} type="total"><LineChart data={chartData} margin={{ top: 12, right: 14, bottom: 0, left: 4 }}><ChartBase /><Tooltip content={<ChartTooltip type="total" />} /><Line type="monotone" dataKey="total" stroke="#C98A2E" strokeWidth={2.5} dot={false} /></LineChart></ChartCard></div>
  </div>
}
function greetingForHour(hour) { return hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam' }
function DashboardScene() {
  return <div className="dashboard-scene pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <svg className="dashboard-palms absolute inset-y-0 right-0 h-full w-[78%]" viewBox="0 0 1200 440" preserveAspectRatio="xMidYMax slice">
      <defs><linearGradient id="palmLeaf" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#A7C58C" stopOpacity=".48"/><stop offset="1" stopColor="#76A17C" stopOpacity=".1"/></linearGradient></defs>
      <path d="M0 408 C220 385 350 425 570 403 S940 385 1200 410 V440 H0Z" fill="#071A13" fillOpacity=".55"/>
      <path d="M0 416 H1200" stroke="#D8BB75" strokeOpacity=".16" strokeWidth="2"/>
      <path d="M30 425 H1170" stroke="#F4E5B8" strokeOpacity=".14" strokeWidth="2" strokeDasharray="26 24"/>
      <g className="dashboard-palm">
        <path d="M874 413 Q914 300 900 150" fill="none" stroke="#C9A86B" strokeOpacity=".52" strokeWidth="13" strokeLinecap="round"/>
        <g fill="none" stroke="url(#palmLeaf)" strokeWidth="8" strokeLinecap="round">
          <path d="M900 151 Q824 95 758 105 Q819 127 875 163"/><path d="M900 151 Q828 136 775 158 Q844 163 887 168"/>
          <path d="M900 151 Q849 73 795 52 Q831 96 887 158"/><path d="M900 151 Q890 70 862 34 Q867 92 894 158"/>
          <path d="M900 151 Q923 68 966 31 Q946 95 907 159"/><path d="M900 151 Q977 84 1044 91 Q987 119 911 163"/>
          <path d="M900 151 Q1001 131 1061 159 Q1002 165 914 169"/>
        </g>
        <g className="dashboard-fruit" fill="#D99A43"><circle cx="910" cy="165" r="7"/><circle cx="920" cy="172" r="7"/><circle cx="908" cy="179" r="7"/><circle cx="919" cy="186" r="7"/></g>
      </g>
      <g className="dashboard-palm dashboard-palm-small" opacity=".62">
        <path d="M1090 415 Q1107 338 1096 248" fill="none" stroke="#C9A86B" strokeOpacity=".48" strokeWidth="9" strokeLinecap="round"/>
        <g fill="none" stroke="url(#palmLeaf)" strokeWidth="6" strokeLinecap="round">
          <path d="M1096 249 Q1046 212 1002 220 Q1040 239 1084 257"/><path d="M1096 249 Q1068 195 1038 178 Q1053 218 1091 256"/>
          <path d="M1096 249 Q1110 193 1142 173 Q1127 217 1101 256"/><path d="M1096 249 Q1151 214 1190 223 Q1155 239 1104 258"/>
        </g>
      </g>
      <circle className="dashboard-firefly dashboard-firefly-one" cx="775" cy="245" r="3" fill="#F2CC70"/><circle className="dashboard-firefly dashboard-firefly-two" cx="1080" cy="300" r="2.5" fill="#A7E4B8"/><circle className="dashboard-firefly dashboard-firefly-three" cx="710" cy="315" r="2" fill="#F2CC70"/>
    </svg>
    <svg className="dashboard-truck absolute" viewBox="0 0 120 58">
      <g>
        <rect x="8" y="13" width="55" height="28" rx="4" fill="#D6A14B"/><path d="M14 19h43M14 26h43M14 33h43" stroke="#F5D991" strokeWidth="2" strokeOpacity=".78"/>
        <path d="M63 24h23l15 12v5H63z" fill="#E8B65D"/><path d="M78 27h7l10 9H78z" fill="#C6E4D8"/>
        <rect x="67" y="38" width="34" height="4" rx="2" fill="#F3D486"/><circle cx="30" cy="44" r="8" fill="#10271E"/><circle cx="30" cy="44" r="3.5" fill="#DDE3D8"/><circle cx="83" cy="44" r="8" fill="#10271E"/><circle cx="83" cy="44" r="3.5" fill="#DDE3D8"/>
        <path d="M5 43h103" stroke="#F7E7B5" strokeOpacity=".38" strokeWidth="2"/>
      </g>
    </svg>
  </div>
}
function ChartBase() { return <CartesianGrid strokeDasharray="3 3" stroke="#3A6B5826" vertical /> }
function ChartCard({ title, range: activeRange, setRange, data, type, children }) { const values = data.map(item => item[type]); const max = niceMax(Math.max(...values, 0)); const yLabels = [max, max * .75, max * .5, max * .25, 0]; const every = Math.ceil(data.length / 6); return <div className="card p-5"><div className="flex flex-wrap justify-between gap-3 mb-4"><h2 className="text-sm font-medium text-ink-700">{title}</h2><div className="flex rounded-md border border-ink-900/10 p-0.5">{RANGES.map((range) => <button key={range.value} type="button" onClick={() => setRange(range.value)} className={`px-2 py-1 text-xs rounded ${activeRange === range.value ? 'bg-plantation-900 text-paper-50' : 'text-ink-500'}`}>{range.label}</button>)}</div></div><div className="chart-shell"><div className="chart-y-labels">{yLabels.map((value, index) => <span key={index}>{type === 'total' ? formatCompactRupiah(value) : kgAxis(value)}</span>)}</div><div className="chart-surface"><ResponsiveContainer width="100%" height={220}>{children}</ResponsiveContainer></div><div className="chart-x-labels" style={{ '--chart-points': data.length }}>{data.map((item, index) => <span key={item.key}>{index % every === 0 || index === data.length - 1 ? <><b>{item.label.split(' ').slice(0, 2).join(' ')}</b><small>{item.label.split(' ')[2]}</small></> : null}</span>)}</div></div></div> }
function niceMax(value) { if (!value) return 1; const power = 10 ** Math.floor(Math.log10(value)); return Math.ceil(value / power / 5) * 5 * power }
function kgAxis(value) { return `${Math.round(value).toLocaleString('id-ID')} kg` }
function formatCompactRupiah(value) { return value >= 1000000 ? `Rp${(value / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt` : formatRupiah(value) }
function ChartTooltip({ active, payload, type }) { if (!active || !payload?.length) return null; const data = payload[0].payload; const value = type === 'volume' ? kgText(data.volume) : formatRupiah(data.total); return <div className="rounded-md border border-ink-900/15 bg-white px-3 py-2 shadow-soft"><p className="text-xs text-ink-500">{formatShortDate(data.key)}</p><p className="text-sm font-medium text-ink-900 mt-1">{type === 'volume' ? 'Volume' : 'Total pembelian'}: {value}</p></div> }
