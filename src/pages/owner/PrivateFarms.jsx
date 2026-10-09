import React, { useState } from 'react'
import { ArrowLeft, Leaf, MapPin, Plus, Sprout, TrendingUp, UserRound, Weight, X } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'

const money = (value) => formatRupiah(Number(value) || 0)
const parseNumeric = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, ...decimalParts] = raw.split(',')
  const grouped = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalParts.length ? `${grouped},${decimalParts.join('').slice(0, 2)}` : grouped
}

export default function PrivateFarms() {
  const { privateFarms: farms, addPrivateFarm, addPrivateHarvestRecord } = useData()
  const [selectedId, setSelectedId] = useState(null)
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [farmForm, setFarmForm] = useState({ name: '', owner: '', location: '', areaHa: '', note: '' })
  const [recordForm, setRecordForm] = useState({ date: todayKey(), grossKg: '', netKg: '', pricePerKg: '', note: '' })

  const selected = farms.find((farm) => farm.id === selectedId)

  function addFarm(event) {
    event.preventDefault()
    if (!farmForm.name.trim() || !farmForm.owner.trim() || !farmForm.location.trim()) return
    const farm = addPrivateFarm(farmForm)
    setSelectedId(farm.id)
    setFarmForm({ name: '', owner: '', location: '', areaHa: '', note: '' })
    setShowFarmForm(false)
  }

  function addRecord(event) {
    event.preventDefault()
    const grossKg = parseNumeric(recordForm.grossKg)
    const netKg = parseNumeric(recordForm.netKg)
    const pricePerKg = parseNumeric(recordForm.pricePerKg)
    if (!selected || !recordForm.date || grossKg <= 0 || netKg <= 0 || pricePerKg <= 0) return
    const record = { ...recordForm, id: `harvest-${Date.now()}`, grossKg, netKg, pricePerKg, total: netKg * pricePerKg }
    addPrivateHarvestRecord(selected.id, record)
    setRecordForm({ date: todayKey(), grossKg: '', netKg: '', pricePerKg: '', note: '' })
    setShowRecordForm(false)
  }

  if (selected) return <FarmDetail farm={selected} onBack={() => setSelectedId(null)} onAdd={() => setShowRecordForm(true)} showForm={showRecordForm} onCloseForm={() => setShowRecordForm(false)} form={recordForm} setForm={setRecordForm} onSubmit={addRecord} />

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Owner workspace</p><h1 className="mt-1 font-display text-3xl text-plantation-950">Kebun Pribadi</h1><p className="mt-2 max-w-xl text-sm text-ink-500">Kelola profil kebun dan catat hasil panen harian dalam satu tempat.</p></div>
      <button className="btn-primary" onClick={() => setShowFarmForm(true)}><Plus size={17} /> Tambah kebun</button>
    </header>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Stat icon={<Sprout size={17} />} label="Total kebun" value={farms.length.toLocaleString('id-ID')} delay={0} />
      <Stat icon={<Weight size={17} />} label="Hasil bersih hari ini" value={`${farms.reduce((sum, farm) => sum + (farm.records || []).filter((row) => row.date === todayKey()).reduce((s, row) => s + Number(row.netKg), 0), 0).toLocaleString('id-ID')} kg`} delay={100} />
      <Stat icon={<TrendingUp size={17} />} label="Pendapatan hari ini" value={formatRupiah(farms.reduce((sum, farm) => sum + (farm.records || []).filter((row) => row.date === todayKey()).reduce((s, row) => s + Number(row.total), 0), 0))} delay={200} />
    </div>
    {farms.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{farms.map((farm) => <FarmCard key={farm.id} farm={farm} onClick={() => setSelectedId(farm.id)} />)}</section> : <section className="card flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plantation-700/10 text-plantation-700"><Leaf size={26} /></span><h2 className="font-display text-xl text-plantation-950">Mulai catat kebun Anda</h2><p className="mt-2 max-w-md text-sm text-ink-500">Tambahkan kebun pertama, lalu catat berat panen, harga per kilogram, dan hasil rupiahnya setiap hari.</p><button className="btn-primary mt-5" onClick={() => setShowFarmForm(true)}><Plus size={16} /> Tambah kebun pertama</button></section>}
    {showFarmForm && <Dialog title="Tambah kebun pribadi" onClose={() => setShowFarmForm(false)}><form onSubmit={addFarm} className="space-y-4"><Field label="Nama kebun *"><input className="input" required autoFocus placeholder="Kebun A" value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} /></Field><Field label="Nama pemilik *"><input className="input" required placeholder="Nama pemilik kebun" value={farmForm.owner} onChange={(e) => setFarmForm({ ...farmForm, owner: e.target.value })} /></Field><Field label="Lokasi kebun *"><input className="input" required placeholder="Desa, kecamatan, kabupaten" value={farmForm.location} onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Luas (hektare)"><input type="number" min="0" step="0.1" className="input" placeholder="Opsional" value={farmForm.areaHa} onChange={(e) => setFarmForm({ ...farmForm, areaHa: e.target.value })} /></Field><Field label="Catatan"><input className="input" placeholder="Opsional" value={farmForm.note} onChange={(e) => setFarmForm({ ...farmForm, note: e.target.value })} /></Field></div><button className="btn-primary w-full"><Plus size={16} /> Simpan kebun</button></form></Dialog>}
  </main>
}

function FarmCard({ farm, onClick }) {
  const rows = farm.records || []
  const todayRows = rows.filter((row) => row.date === todayKey())
  const netToday = todayRows.reduce((sum, row) => sum + Number(row.netKg), 0)
  const incomeToday = todayRows.reduce((sum, row) => sum + Number(row.total), 0)
  const last = rows[0]
  return <button onClick={onClick} style={{ '--stat-delay': `${Math.min((farm.records?.length || 0) * 60, 240)}ms` }} className="stat-card stat-card-action group overflow-hidden rounded-xl border border-ink-900/10 bg-white text-left shadow-sm transition hover:border-plantation-700/30 focus:outline-none focus:ring-2 focus:ring-plantation-700/30">
    <div className="relative bg-gradient-to-br from-plantation-900 via-plantation-800 to-plantation-700 px-5 pb-5 pt-6 text-white"><div className="absolute right-4 top-3 opacity-10"><Leaf size={76} /></div><div className="relative flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Sprout size={20} /></span><span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-medium text-gold-300">Kebun pribadi</span></div><h2 className="relative mt-5 font-display text-2xl text-white">{farm.name}</h2><p className="relative mt-1 flex items-center gap-1.5 text-sm text-white/85"><MapPin size={14} />{farm.location}</p></div>
    <div className="p-5"><div className="flex items-center gap-2 text-sm text-ink-600"><UserRound size={15} className="text-plantation-700" /><span>Pemilik: <strong className="font-medium text-ink-800">{farm.owner}</strong></span></div>{farm.areaHa && <p className="mt-2 text-xs text-ink-500">Luas kebun {farm.areaHa} hektar</p>}<div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-paper-100 p-3 transition-transform duration-300 group-hover:-translate-y-1"><p className="text-[11px] text-ink-500">Berat bersih hari ini</p><p className="mt-1 font-display text-lg text-plantation-900">{netToday.toLocaleString('id-ID')} kg</p></div><div className="rounded-lg bg-gold-400/10 p-3 transition-transform duration-300 group-hover:-translate-y-1"><p className="text-[11px] text-ink-500">Pendapatan hari ini</p><p className="mt-1 truncate font-display text-lg text-plantation-900">{money(incomeToday)}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-ink-900/8 pt-3 text-xs text-ink-500"><span>{rows.length ? `Catatan terakhir · ${formatShortDate(last.date)}` : 'Belum ada catatan panen'}</span><span className="font-medium text-plantation-700 group-hover:underline">Lihat rincian →</span></div></div>
  </button>
}

function FarmDetail({ farm, onBack, onAdd, showForm, onCloseForm, form, setForm, onSubmit }) {
  const rows = farm.records || []
  const todayRows = rows.filter((row) => row.date === todayKey())
  const totals = todayRows.reduce((sum, row) => ({ gross: sum.gross + Number(row.grossKg), net: sum.net + Number(row.netKg), income: sum.income + Number(row.total) }), { gross: 0, net: 0, income: 0 })
  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10"><button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-plantation-700 hover:underline"><ArrowLeft size={16} /> Semua kebun</button>
    <header className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-plantation-950 via-plantation-900 to-plantation-700 p-6 text-white md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Profil kebun pribadi</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl text-white">{farm.name}</h1><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90"><span className="inline-flex items-center gap-1.5"><UserRound size={15} />{farm.owner}</span><span className="inline-flex items-center gap-1.5"><MapPin size={15} />{farm.location}</span>{farm.areaHa && <span className="text-white">{farm.areaHa} hektar</span>}</div></div></div>{farm.note && <p className="mt-4 max-w-2xl rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">{farm.note}</p>}</header>
    <div className="mb-6 grid gap-3 sm:grid-cols-3"><Stat icon={<Weight size={17} />} label="Berat kotor hari ini" value={`${totals.gross.toLocaleString('id-ID')} kg`} delay={0} /><Stat icon={<Sprout size={17} />} label="Berat bersih hari ini" value={`${totals.net.toLocaleString('id-ID')} kg`} delay={100} /><Stat icon={<TrendingUp size={17} />} label="Pendapatan hari ini" value={formatRupiah(totals.income)} delay={200} /></div>
    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"><div><h2 className="font-medium text-ink-800">Rincian hasil panen</h2><p className="mt-1 text-xs text-ink-500">Berat dan nilai penjualan yang dicatat untuk kebun ini.</p></div><span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-medium text-plantation-700">{rows.length} catatan</span></div><div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Tanggal','Berat kotor','Berat bersih','Harga / kg','Total rupiah','Catatan'].map((label) => <th className="table-head" key={label}>{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="6" className="py-12 text-center text-sm text-ink-500">Belum ada hasil panen. Pilih “Catat hasil panen” untuk menambahkan rincian pertama.</td></tr> : rows.map((row) => <tr key={row.id}><td className="table-cell">{formatShortDate(row.date)}</td><td className="table-cell">{Number(row.grossKg).toLocaleString('id-ID')} kg</td><td className="table-cell font-medium">{Number(row.netKg).toLocaleString('id-ID')} kg</td><td className="table-cell">{money(row.pricePerKg)}</td><td className="table-cell font-semibold text-plantation-900">{money(row.total)}</td><td className="table-cell text-ink-500">{row.note || '—'}</td></tr>)}</tbody></table></div></section>
    {showForm && <Dialog title={`Catat hasil — ${farm.name}`} onClose={onCloseForm}><form onSubmit={onSubmit} className="space-y-4"><Field label="Tanggal panen *"><input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Berat kotor (kg) *"><input inputMode="decimal" required className="input" value={form.grossKg} onChange={(e) => setForm({ ...form, grossKg: formatNumericInput(e.target.value) })} placeholder="contoh: 1.250" /></Field><Field label="Berat bersih (kg) *"><input inputMode="decimal" required className="input" value={form.netKg} onChange={(e) => setForm({ ...form, netKg: formatNumericInput(e.target.value) })} placeholder="contoh: 1.210" /></Field></div><Field label="Harga per kg (Rp) *"><input inputMode="numeric" required className="input" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: formatNumericInput(e.target.value) })} placeholder="contoh: 2.850" /></Field><Field label="Catatan"><textarea className="input min-h-20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opsional" /></Field><div className="rounded-lg bg-plantation-700/8 px-4 py-3"><p className="text-xs text-ink-500">Perkiraan total berdasarkan berat bersih</p><p className="mt-1 font-display text-xl text-plantation-900">{money(parseNumeric(form.netKg) * parseNumeric(form.pricePerKg))}</p></div><button className="btn-primary w-full"><Plus size={16} /> Simpan hasil panen</button></form></Dialog>}
  </main>
}

function Stat({ icon, label, value, delay = 0 }) { return <div className="stat-card card group flex items-center gap-3 p-4" style={{ '--stat-delay': `${delay}ms` }}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plantation-700/10 text-plantation-700 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{icon}</span><div className="min-w-0"><p className="text-xs text-ink-500">{label}</p><p className="mt-0.5 truncate font-display text-lg text-plantation-950">{value}</p></div></div> }
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function Dialog({ title, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl md:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-xl text-plantation-950">{title}</h2><button type="button" onClick={onClose} className="rounded-md p-2 text-ink-500 hover:bg-paper-100" aria-label="Tutup"><X size={18} /></button></div>{children}</section></div> }
