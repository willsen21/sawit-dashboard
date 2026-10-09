import React, { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, Plus, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import StatCard from '../../components/StatCard'
import Modal from '../../components/Modal'

const TABS = [
  { id: 'harvest', label: 'Jadwal panen', icon: CalendarDays },
  { id: 'expense', label: 'Pengeluaran', icon: Wallet },
  { id: 'payroll', label: 'Gaji karyawan', icon: Users },
]
const CATEGORIES = ['Pupuk', 'Makan pekerja', 'BBM / transport', 'Peralatan', 'Perawatan kebun', 'Lainnya']
const parseNumeric = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, ...decimalParts] = raw.split(',')
  const grouped = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalParts.length ? `${grouped},${decimalParts.join('').slice(0, 2)}` : grouped
}

export default function Operations() {
  const { currentUser } = useAuth()
  const { harvestSchedules, addHarvestSchedule, updateHarvestScheduleStatus, privateFarms, addPrivateHarvestRecord, operationalExpenses, addOperationalExpense, markOperationalExpensePaid, payrolls, addPayroll, markPayrollPaid } = useData()
  const [tab, setTab] = useState('harvest')
  const today = todayKey()
  const [schedule, setSchedule] = useState({ date: today, farmId: '', pic: '', workers: '', estimatedKg: '', note: '' })
  const [expense, setExpense] = useState({ date: today, category: 'Pupuk', amount: '', farmId: '', note: '' })
  const [payroll, setPayroll] = useState({ period: today.slice(0, 7), employeeName: '', workDays: '', dailyRate: '', bonus: '', deduction: '', note: '' })
  const [completeTarget, setCompleteTarget] = useState(null)
  const [harvestForm, setHarvestForm] = useState({ farmId: '', grossKg: '', netKg: '', pricePerKg: '', note: '' })

  const overview = useMemo(() => {
    const month = today.slice(0, 7)
    const expenses = operationalExpenses.filter((item) => item.date.startsWith(month))
    const salaries = payrolls.filter((item) => item.period === month)
    const nextHarvest = harvestSchedules.filter((item) => item.status !== 'completed' && item.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
    return {
      nextHarvest,
      expenseTotal: expenses.reduce((sum, item) => sum + Number(item.amount), 0),
      payrollTotal: salaries.reduce((sum, item) => sum + Number(item.total), 0),
      pending: expenses.filter((item) => item.status === 'pending').length + salaries.filter((item) => item.status === 'pending').length,
    }
  }, [harvestSchedules, operationalExpenses, payrolls, today])

  function submitSchedule(event) {
    event.preventDefault()
    const farm = privateFarms.find((item) => item.id === schedule.farmId)
    if (!farm) return
    addHarvestSchedule({ ...schedule, farmName: farm.name, workers: parseNumeric(schedule.workers), estimatedKg: parseNumeric(schedule.estimatedKg), createdBy: currentUser.id })
    setSchedule({ date: today, farmId: '', pic: '', workers: '', estimatedKg: '', note: '' })
  }

  function handleScheduleStatus(id, status) {
    const item = harvestSchedules.find((entry) => entry.id === id)
    if (!item) return
    if (status === 'completed') {
      const farm = privateFarms.find((entry) => entry.id === item.farmId) || privateFarms.find((entry) => entry.name === (item.farmName || item.block))
      setHarvestForm({ farmId: farm?.id || '', grossKg: '', netKg: '', pricePerKg: '', note: item.note || '' })
      setCompleteTarget(item)
      return
    }
    updateHarvestScheduleStatus(id, status, currentUser.id)
  }

  function submitHarvestCompletion(event) {
    event.preventDefault()
    const grossKg = parseNumeric(harvestForm.grossKg)
    const netKg = parseNumeric(harvestForm.netKg)
    const pricePerKg = parseNumeric(harvestForm.pricePerKg)
    if (!completeTarget || !privateFarms.some((farm) => farm.id === harvestForm.farmId) || grossKg <= 0 || netKg <= 0 || pricePerKg <= 0) return
    addPrivateHarvestRecord(harvestForm.farmId, { date: completeTarget.date, grossKg, netKg, pricePerKg, total: netKg * pricePerKg, note: harvestForm.note.trim(), scheduleId: completeTarget.id })
    updateHarvestScheduleStatus(completeTarget.id, 'completed', currentUser.id)
    setCompleteTarget(null)
  }
  function submitExpense(event) {
    event.preventDefault()
    if (!parseNumeric(expense.amount) || !expense.note.trim()) return
    addOperationalExpense({ ...expense, amount: parseNumeric(expense.amount), createdBy: currentUser.id })
    setExpense({ date: today, category: 'Pupuk', amount: '', block: '', note: '' })
  }
  function submitPayroll(event) {
    event.preventDefault()
    if (!payroll.employeeName.trim() || !parseNumeric(payroll.workDays) || !parseNumeric(payroll.dailyRate)) return
    addPayroll({ ...payroll, workDays: parseNumeric(payroll.workDays), dailyRate: parseNumeric(payroll.dailyRate), bonus: parseNumeric(payroll.bonus), deduction: parseNumeric(payroll.deduction), createdBy: currentUser.id })
    setPayroll({ period: today.slice(0, 7), employeeName: '', workDays: '', dailyRate: '', bonus: '', deduction: '', note: '' })
  }

  return <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
    <header className="operations-hero mb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Owner workspace</p><h1 className="text-2xl font-display mt-1">Operasional Kebun</h1><p className="mt-1 text-sm text-ink-500">Rencanakan panen, kendalikan biaya, dan pantau pembayaran pekerja.</p></div><div className="operations-next"><CalendarDays size={17} /><div><p className="text-xs text-ink-500">Panen terdekat</p><p className="text-sm font-semibold text-plantation-900">{overview.nextHarvest ? `${formatShortDate(overview.nextHarvest.date)} · ${overview.nextHarvest.block}` : 'Belum dijadwalkan'}</p></div></div></header>

    <div className="grid gap-4 sm:grid-cols-3 mb-6">
      <StatCard label="Biaya bulan ini" value={formatRupiah(overview.expenseTotal)} icon={<Wallet size={17} />} tone="gold" delay={0} />
      <StatCard label="Gaji periode ini" value={formatRupiah(overview.payrollTotal)} icon={<Users size={17} />} delay={100} />
      <StatCard label="Menunggu dibayar" value={`${overview.pending.toLocaleString('id-ID')} item`} icon={<Clock3 size={17} />} tone={overview.pending ? 'gold' : ''} delay={200} />
    </div>

    <nav className="operations-tabs mb-6" aria-label="Menu operasional">{TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'operations-tab operations-tab-active' : 'operations-tab'}><Icon size={17} />{label}</button>)}</nav>

    {tab === 'harvest' && <HarvestPanel form={schedule} setForm={setSchedule} onSubmit={submitSchedule} schedules={harvestSchedules} farms={privateFarms} today={today} onStatus={handleScheduleStatus} />}
    {tab === 'expense' && <ExpensePanel form={expense} setForm={setExpense} onSubmit={submitExpense} expenses={operationalExpenses} farms={privateFarms} onPaid={(id) => markOperationalExpensePaid(id, currentUser.id)} />}
    {tab === 'payroll' && <PayrollPanel form={payroll} setForm={setPayroll} onSubmit={submitPayroll} payrolls={payrolls} onPaid={(id) => markPayrollPaid(id, currentUser.id)} />}
    <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title="Catat hasil panen">
      <form onSubmit={submitHarvestCompletion} className="space-y-4">
        <p className="text-sm text-ink-600">Lengkapi hasil panen {completeTarget?.farmName || completeTarget?.block || 'kebun'} pada {completeTarget ? formatShortDate(completeTarget.date) : ''}. Setelah disimpan, catatan otomatis masuk ke Kebun Pribadi dan jadwal ditandai selesai.</p>
        <Field label="Kebun pribadi *"><select required className="input" value={harvestForm.farmId} onChange={(event) => setHarvestForm({ ...harvestForm, farmId: event.target.value })}><option value="">Pilih kebun</option>{privateFarms.map((farm) => <option value={farm.id} key={farm.id}>{farm.name} · {farm.owner}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Berat kotor (kg) *"><input required inputMode="decimal" className="input" value={harvestForm.grossKg} onChange={(event) => setHarvestForm({ ...harvestForm, grossKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.250" /></Field><Field label="Berat bersih (kg) *"><input required inputMode="decimal" className="input" value={harvestForm.netKg} onChange={(event) => setHarvestForm({ ...harvestForm, netKg: formatNumericInput(event.target.value) })} placeholder="mis. 1.210" /></Field></div>
        <Field label="Harga per kg (Rp) *"><input required inputMode="numeric" className="input" value={harvestForm.pricePerKg} onChange={(event) => setHarvestForm({ ...harvestForm, pricePerKg: formatNumericInput(event.target.value) })} placeholder="mis. 2.850" /></Field>
        <Field label="Catatan"><textarea className="input min-h-20" value={harvestForm.note} onChange={(event) => setHarvestForm({ ...harvestForm, note: event.target.value })} placeholder="Kondisi panen atau keterangan tambahan" /></Field>
        <div className="rounded-lg bg-plantation-700/8 px-4 py-3"><p className="text-xs text-ink-500">Perkiraan total (berat bersih × harga)</p><p className="mt-1 font-display text-xl text-plantation-900">{formatRupiah(parseNumeric(harvestForm.netKg) * parseNumeric(harvestForm.pricePerKg))}</p></div>
        <button className="btn-primary w-full"><CheckCircle2 size={16} /> Simpan hasil dan selesaikan panen</button>
      </form>
    </Modal>
  </div>
}

function HarvestPanel({ form, setForm, onSubmit, schedules, farms, today, onStatus }) {
  const upcoming = [...schedules].sort((a, b) => a.date.localeCompare(b.date))
  return <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div><p className="text-sm font-semibold text-ink-700">Buat jadwal panen</p><p className="mt-1 text-xs text-ink-500">Pilih kebun pribadi agar hasil panen tersimpan di kebun yang tepat.</p></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal"><input type="date" className="input" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Kebun *"><select required className="input" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}><option value="">Pilih kebun pribadi</option>{farms.map((farm) => <option value={farm.id} key={farm.id}>{farm.name}</option>)}</select></Field>
      </div>
      {farms.length === 0 && <p className="rounded-lg bg-gold-400/10 px-3 py-2 text-xs text-ink-600">Belum ada kebun. <Link className="font-medium text-plantation-700 underline" to="/owner/kebun-pribadi">Tambahkan kebun pribadi</Link> terlebih dahulu.</p>}
      <div className="grid grid-cols-2 gap-3"><Field label="PIC / mandor"><input className="input" value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} placeholder="Pak Budi" /></Field><Field label="Jumlah pekerja"><input inputMode="numeric" className="input" value={form.workers} onChange={(e) => setForm({ ...form, workers: formatNumericInput(e.target.value) })} placeholder="8" /></Field></div>
      <Field label="Estimasi hasil (kg)"><input inputMode="decimal" className="input" value={form.estimatedKg} onChange={(e) => setForm({ ...form, estimatedKg: formatNumericInput(e.target.value) })} placeholder="mis. 12.000" /></Field>
      <Field label="Catatan"><textarea className="input min-h-20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Kebutuhan alat atau arahan panen" /></Field>
      <button disabled={!farms.length} className="btn-primary w-full"><Plus size={16} /> Simpan jadwal</button>
    </form>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-ink-700">Agenda panen</h2><p className="mt-0.5 text-xs text-ink-500">Setelah panen, selesaikan jadwal dan catat hasilnya.</p></div><CalendarDays size={18} className="text-plantation-700" /></div>
      {upcoming.length === 0 ? <Empty icon={<CalendarDays size={23} />} text="Belum ada jadwal panen." /> : <div className="divide-y divide-ink-900/8">{upcoming.map((item) => { const farm = farms.find((entry) => entry.id === item.farmId) || farms.find((entry) => entry.name === (item.farmName || item.block)); return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-ink-800">{farm?.name || item.farmName || item.block || 'Kebun'} <span className="font-normal text-ink-500">· {formatShortDate(item.date)}</span></p><p className="mt-1 text-xs text-ink-500">PIC {item.pic || '—'} · {item.workers || 0} pekerja · Est. {Number(item.estimatedKg).toLocaleString('id-ID')} kg</p>{item.note && <p className="mt-1 text-xs text-ink-600">{item.note}</p>}</div><ScheduleStatus item={item} onStatus={onStatus} /></div> })}</div>}
    </section>
  </div>
}

function ExpensePanel({ form, setForm, onSubmit, expenses, farms, onPaid }) {
  return <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
    <form onSubmit={onSubmit} className="card space-y-4 p-5"><div><p className="text-sm font-semibold text-ink-700">Catat pengeluaran</p><p className="mt-1 text-xs text-ink-500">Simpan biaya pupuk, makan, transport, dan kebutuhan kebun.</p></div>
      <div className="grid grid-cols-2 gap-3"><Field label="Tanggal"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Kategori"><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field></div>
      <Field label="Kebun"><select className="input" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}><option value="">Umum / tidak terkait kebun</option>{farms.map((farm) => <option value={farm.id} key={farm.id}>{farm.name}</option>)}</select></Field>
      <Field label="Nominal (Rp)"><input inputMode="numeric" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: formatNumericInput(e.target.value) })} placeholder="500.000" /></Field>
      <Field label="Keterangan / bukti"><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: pupuk NPK untuk kebun yang dipilih" /></Field><button className="btn-primary w-full"><Plus size={16} /> Tambah pengeluaran</button>
    </form>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-ink-700">Pengeluaran terbaru</h2><p className="mt-0.5 text-xs text-ink-500">Tandai pembayaran setelah dana benar-benar keluar.</p></div><Wallet size={18} className="text-plantation-700" /></div>{expenses.length === 0 ? <Empty icon={<Wallet size={23} />} text="Belum ada pengeluaran." /> : <div className="divide-y divide-ink-900/8">{expenses.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-ink-800">{item.category} <span className="font-normal text-ink-500">· {formatShortDate(item.date)}</span></p><p className="mt-1 text-sm font-semibold text-plantation-900">{formatRupiah(item.amount)}</p><p className="mt-1 text-xs text-ink-500">{item.farmName || item.block ? `${item.farmName || item.block} · ` : ''}{item.note}</p></div>{item.status === 'paid' ? <PaidBadge /> : <button type="button" onClick={() => onPaid(item.id)} className="btn-gold !px-3 !py-2 text-xs"><CheckCircle2 size={15} /> Tandai dibayar</button>}</div>)}</div>}</section>
  </div>
}

function PayrollPanel({ form, setForm, onSubmit, payrolls, onPaid }) { const preview = Math.max(0, (parseNumeric(form.workDays) || 0) * (parseNumeric(form.dailyRate) || 0) + (parseNumeric(form.bonus) || 0) - (parseNumeric(form.deduction) || 0)); return <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><form onSubmit={onSubmit} className="card p-5 space-y-4"><div><p className="text-sm font-semibold text-ink-700">Buat draft gaji</p><p className="text-xs text-ink-500 mt-1">Hitung upah harian, bonus, serta potongan sebelum dibayar.</p></div><div className="grid grid-cols-2 gap-3"><Field label="Periode"><input type="month" className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></Field><Field label="Nama pekerja"><input className="input" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="Pak Andi" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Hari kerja"><input inputMode="numeric" className="input" value={form.workDays} onChange={(e) => setForm({ ...form, workDays: formatNumericInput(e.target.value) })} placeholder="24" /></Field><Field label="Upah / hari"><input inputMode="numeric" className="input" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: formatNumericInput(e.target.value) })} placeholder="125.000" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Bonus"><input inputMode="numeric" className="input" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: formatNumericInput(e.target.value) })} placeholder="0" /></Field><Field label="Potongan"><input inputMode="numeric" className="input" value={form.deduction} onChange={(e) => setForm({ ...form, deduction: formatNumericInput(e.target.value) })} placeholder="0" /></Field></div><Field label="Catatan"><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opsional" /></Field><div className="rounded-lg bg-plantation-700/8 px-4 py-3"><p className="text-xs text-ink-500">Perkiraan gaji bersih</p><p className="mt-1 font-display text-xl text-plantation-900">{formatRupiah(preview)}</p></div><button className="btn-primary w-full"><Plus size={16} /> Simpan draft gaji</button></form><section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4"><div><h2 className="text-sm font-semibold text-ink-700">Pembayaran gaji</h2><p className="text-xs text-ink-500 mt-0.5">Draft dan pembayaran pekerja per periode.</p></div><Users size={18} className="text-plantation-700" /></div>{payrolls.length === 0 ? <Empty icon={<Users size={23} />} text="Belum ada draft gaji." /> : <div className="divide-y divide-ink-900/8">{payrolls.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-ink-800">{item.employeeName} <span className="font-normal text-ink-500">· {item.period}</span></p><p className="mt-1 text-sm font-semibold text-plantation-900">{formatRupiah(item.total)}</p><p className="mt-1 text-xs text-ink-500">{item.workDays} hari × {formatRupiah(item.dailyRate)}{item.bonus ? ` · Bonus ${formatRupiah(item.bonus)}` : ''}{item.deduction ? ` · Potongan ${formatRupiah(item.deduction)}` : ''}</p></div>{item.status === 'paid' ? <PaidBadge /> : <button type="button" onClick={() => onPaid(item.id)} className="btn-gold !px-3 !py-2 text-xs"><CheckCircle2 size={15} /> Tandai dibayar</button>}</div>)}</div>}</section></div> }

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function Empty({ icon, text }) { return <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-5 text-center text-ink-500"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-100 text-plantation-700">{icon}</span><p className="text-sm">{text}</p></div> }
function PaidBadge() { return <span className="inline-flex items-center gap-1 rounded-full bg-plantation-700/10 px-2.5 py-1.5 text-xs font-medium text-plantation-700"><CheckCircle2 size={13} /> Sudah dibayar</span> }
function ScheduleStatus({ item, onStatus }) { if (item.status === 'completed') return <span className="inline-flex items-center gap-1 rounded-full bg-plantation-700/10 px-2.5 py-1.5 text-xs font-medium text-plantation-700"><CheckCircle2 size={13} /> Selesai</span>; if (item.status === 'in-progress') return <button type="button" onClick={() => onStatus(item.id, 'completed')} className="btn-primary !px-3 !py-2 text-xs"><CheckCircle2 size={15} /> Selesaikan</button>; return <button type="button" onClick={() => onStatus(item.id, 'in-progress')} className="btn-ghost !px-3 !py-2 text-xs"><Clock3 size={15} /> Mulai panen</button> }
