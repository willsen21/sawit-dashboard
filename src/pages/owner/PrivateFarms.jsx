import React, { useMemo, useState } from 'react'
import { ArrowLeft, BadgePercent, CircleDollarSign, Leaf, MapPin, Plus, Sprout, TrendingUp, UserRound, Weight, X, Trash2, Pencil } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import { calculateFarmHarvest, getFarmHarvestTotals, splitFarmResultEqually } from '../../lib/farmCalculations'
import FarmShareFields from '../../components/FarmShareFields'

const money = (value) => formatRupiah(Number(value) || 0)
const parseNumeric = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, ...decimalParts] = raw.split(',')
  const grouped = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalParts.length ? `${grouped},${decimalParts.join('').slice(0, 2)}` : grouped
}
const newUse = () => ({ id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, purpose: '', amount: '' })
const MANAGERS = [
  { value: 'joni', label: 'Joni' },
  { value: 'romi', label: 'Romi' },
  { value: 'none', label: 'Tidak ada pengurus' },
]

function managerLabel(manager) {
  return MANAGERS.find((item) => item.value === manager)?.label || 'Belum dicatat'
}

export default function PrivateFarms() {
  const { privateFarms: farms, addPrivateFarm, addPrivateHarvestRecord, updatePrivateHarvestRecord, deletePrivateHarvestRecord } = useData()
  const [selectedId, setSelectedId] = useState(null)
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [recordError, setRecordError] = useState('')
  const [farmForm, setFarmForm] = useState({ name: '', owner: '', location: '', areaHa: '', note: '' })
  const [recordForm, setRecordForm] = useState({ date: todayKey(), manager: '', netKg: '', pricePerKg: '', uses: [newUse()], shareCount: 0, shareNames: [], note: '' })

  const selected = farms.find((farm) => farm.id === selectedId)
  const todaySummary = useMemo(() => farms.flatMap((farm) => farm.records || []).filter((row) => row.date === todayKey())
    .reduce((summary, row) => {
      const totals = getFarmHarvestTotals(row)
      summary.netKg += Number(row.netKg) || 0
      summary.gross += totals.grossTotal
      summary.uses += totals.useTotal
      summary.wages += totals.managerWage
      summary.result += totals.finalTotal
      return summary
    }, { netKg: 0, gross: 0, uses: 0, wages: 0, result: 0 }), [farms])

  function addFarm(event) {
    event.preventDefault()
    if (!farmForm.name.trim()) return
    const farm = addPrivateFarm({ ...farmForm, name: farmForm.name.trim(), owner: farmForm.owner.trim(), location: farmForm.location.trim() })
    setSelectedId(farm.id)
    setFarmForm({ name: '', owner: '', location: '', areaHa: '', note: '' })
    setShowFarmForm(false)
  }

  function addRecord(event) {
    event.preventDefault()
    const netKg = parseNumeric(recordForm.netKg)
    const pricePerKg = parseNumeric(recordForm.pricePerKg)
    const uses = recordForm.uses.map((item) => ({ ...item, purpose: item.purpose.trim(), amount: parseNumeric(item.amount) })).filter((item) => item.purpose || item.amount)
    setRecordError('')
    if (!selected || !recordForm.date || !recordForm.manager || netKg <= 0 || pricePerKg <= 0) {
      return setRecordError('Tanggal, pengurus, berat bersih, dan harga per kg wajib diisi dengan nilai yang valid.')
    }
    if (recordForm.uses.some((item) => Boolean(item.purpose.trim()) !== (parseNumeric(item.amount) > 0))) {
      return setRecordError('Setiap pemakaian harus memiliki keterangan dan nominal lebih dari 0.')
    }
    const primaryUse = recordForm.uses[0]
    if (!primaryUse?.purpose?.trim() || parseNumeric(primaryUse.amount) <= 0) return setRecordError('Pemakaian utama pertama wajib diisi dengan keterangan dan nominal lebih dari 0.')
    const useTotal = uses.reduce((sum, item) => sum + item.amount, 0)
    const { grossTotal, managerWage, finalTotal } = calculateFarmHarvest({ netKg, pricePerKg, uses, manager: recordForm.manager })
    if (useTotal > grossTotal) return setRecordError('Total pemakaian tidak boleh melebihi hasil panen bersih.')
    const shareCount = Number(recordForm.shareCount) || 0
    const shareNames = (recordForm.shareNames || []).slice(0, shareCount).map((name) => name.trim())
    if (shareCount && (finalTotal < 0 || shareNames.some((name) => !name))) return setRecordError('Isi semua nama penerima. Hasil akhir harus positif untuk dibagikan.')
    if (new Set(shareNames.map((name) => name.toLocaleLowerCase('id-ID'))).size !== shareNames.length) return setRecordError('Nama penerima pembagian hasil harus berbeda.')
    const distribution = splitFarmResultEqually(finalTotal, shareNames)
    const record = {
      id: `harvest-${Date.now()}`,
      date: recordForm.date,
      netKg,
      pricePerKg,
      manager: recordForm.manager,
      grossTotal,
      uses,
      useTotal,
      managerWage,
      finalTotal,
      total: finalTotal,
      distribution,
      note: recordForm.note.trim(),
    }
    if (editingRecordId) updatePrivateHarvestRecord(selected.id, editingRecordId, record)
    else addPrivateHarvestRecord(selected.id, record)
    setRecordForm({ date: todayKey(), manager: '', netKg: '', pricePerKg: '', uses: [newUse()], shareCount: 0, shareNames: [], note: '' })
    setEditingRecordId(null)
    setShowRecordForm(false)
  }

  function openRecordForm() {
    setRecordError('')
    setEditingRecordId(null)
    setRecordForm({ date: todayKey(), manager: '', netKg: '', pricePerKg: '', uses: [newUse()], shareCount: 0, shareNames: [], note: '' })
    setShowRecordForm(true)
  }

  function editRecord(record) {
    setRecordError('')
    setEditingRecordId(record.id)
    setRecordForm({
      date: record.date || todayKey(),
      manager: record.manager || '',
      netKg: formatNumericInput(record.netKg ?? ''),
      pricePerKg: formatNumericInput(record.pricePerKg ?? ''),
      uses: (record.uses?.length ? record.uses : [newUse()]).map((item) => ({ ...item, id: item.id || newUse().id, amount: formatNumericInput(item.amount ?? '') })),
      shareCount: (record.distribution || []).length,
      shareNames: (record.distribution || []).map((share) => share.name || ''),
      note: record.note || '',
    })
    setShowRecordForm(true)
  }

  function deleteRecord(record) {
    const confirmed = window.confirm(`Hapus catatan panen tanggal ${formatShortDate(record.date)}? Tindakan ini tidak dapat dibatalkan.`)
    if (confirmed) deletePrivateHarvestRecord(selected.id, record.id)
  }

  if (selected) return <FarmDetail
    farm={selected}
    onBack={() => setSelectedId(null)}
    onAdd={openRecordForm}
    showForm={showRecordForm}
    error={recordError}
    onCloseForm={() => { setShowRecordForm(false); setEditingRecordId(null) }}
    form={recordForm}
    setForm={setRecordForm}
    onSubmit={addRecord}
    editingRecordId={editingRecordId}
    onEdit={editRecord}
    onDelete={deleteRecord}
  />

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Owner workspace</p><h1 className="mt-1 font-display text-3xl text-plantation-950">Kebun</h1><p className="mt-2 max-w-xl text-sm text-ink-500">Kelola lahan, catat panen, pemakaian hasil, dan pembagian upah pengurus.</p></div>
      <button className="btn-primary" onClick={() => setShowFarmForm(true)}><Plus size={17} /> Tambah lahan</button>
    </header>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={<Sprout size={17} />} label="Total lahan" value={farms.length.toLocaleString('id-ID')} delay={0} />
      <Stat icon={<Weight size={17} />} label="Berat bersih hari ini" value={`${todaySummary.netKg.toLocaleString('id-ID')} kg`} delay={70} />
      <Stat icon={<CircleDollarSign size={17} />} label="Hasil panen hari ini" value={money(todaySummary.gross)} delay={140} />
      <Stat icon={<TrendingUp size={17} />} label="Hasil akhir hari ini" value={money(todaySummary.result)} delay={210} />
    </div>
    {farms.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{farms.map((farm) => <FarmCard key={farm.id} farm={farm} onClick={() => setSelectedId(farm.id)} />)}</section> : <section className="card flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plantation-700/10 text-plantation-700"><Leaf size={26} /></span><h2 className="font-display text-xl text-plantation-950">Mulai catat lahan</h2><p className="mt-2 max-w-md text-sm text-ink-500">Tambahkan lahan terlebih dahulu. Setiap lahan memiliki riwayat panen dan perhitungan hasil sendiri.</p><button className="btn-primary mt-5" onClick={() => setShowFarmForm(true)}><Plus size={16} /> Tambah lahan pertama</button></section>}
    {showFarmForm && <Dialog title="Tambah lahan kebun" onClose={() => setShowFarmForm(false)}><form onSubmit={addFarm} className="space-y-4">
      <Field label="Nama lahan *"><input className="input" required autoFocus placeholder="Contoh: Lahan Utara" value={farmForm.name} onChange={(event) => setFarmForm({ ...farmForm, name: event.target.value })} /></Field>
      <Field label="Lokasi"><input className="input" placeholder="Desa atau keterangan lokasi · opsional" value={farmForm.location} onChange={(event) => setFarmForm({ ...farmForm, location: event.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Pemilik lahan"><input className="input" placeholder="Opsional" value={farmForm.owner} onChange={(event) => setFarmForm({ ...farmForm, owner: event.target.value })} /></Field><Field label="Luas (hektare)"><input type="number" min="0" step="0.1" className="input" placeholder="Opsional" value={farmForm.areaHa} onChange={(event) => setFarmForm({ ...farmForm, areaHa: event.target.value })} /></Field></div>
      <Field label="Catatan lahan"><textarea className="input min-h-20" placeholder="Opsional" value={farmForm.note} onChange={(event) => setFarmForm({ ...farmForm, note: event.target.value })} /></Field>
      <button className="btn-primary w-full"><Plus size={16} /> Simpan lahan</button>
    </form></Dialog>}
  </main>
}

function FarmCard({ farm, onClick }) {
  const rows = farm.records || []
  const todayRows = rows.filter((row) => row.date === todayKey())
  const netToday = todayRows.reduce((sum, row) => sum + (Number(row.netKg) || 0), 0)
  const resultToday = todayRows.reduce((sum, row) => sum + getFarmHarvestTotals(row).finalTotal, 0)
  const last = rows[0]
  return <button onClick={onClick} style={{ '--stat-delay': `${Math.min(rows.length * 60, 240)}ms` }} className="stat-card stat-card-action group overflow-hidden rounded-xl border border-ink-900/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-plantation-700/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-plantation-700/30">
    <div className="relative bg-gradient-to-br from-plantation-950 via-plantation-900 to-plantation-700 px-5 pb-5 pt-6 text-white"><div className="absolute right-4 top-3 opacity-10"><Leaf size={76} /></div><div className="relative flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Sprout size={20} /></span><span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-medium text-gold-300">Lahan</span></div><h2 className="relative mt-5 font-display text-2xl text-white">{farm.name}</h2><p className="relative mt-1 flex items-center gap-1.5 text-sm text-white/85"><MapPin size={14} />{farm.location || 'Lokasi belum diisi'}</p></div>
    <div className="p-5">{farm.owner && <div className="flex items-center gap-2 text-sm text-ink-600"><UserRound size={15} className="text-plantation-700" /><span>Pemilik: <strong className="font-medium text-ink-800">{farm.owner}</strong></span></div>}{farm.areaHa && <p className={`${farm.owner ? 'mt-2' : ''} text-xs text-ink-500`}>Luas lahan {farm.areaHa} hektare</p>}<div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-paper-100 p-3 transition-transform duration-300 group-hover:-translate-y-1"><p className="text-[11px] text-ink-500">Panen bersih hari ini</p><p className="mt-1 font-display text-lg text-plantation-900">{netToday.toLocaleString('id-ID')} kg</p></div><div className="rounded-lg bg-gold-400/10 p-3 transition-transform duration-300 group-hover:-translate-y-1"><p className="text-[11px] text-ink-500">Hasil akhir hari ini</p><p className="mt-1 truncate font-display text-lg text-plantation-900">{money(resultToday)}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-ink-900/8 pt-3 text-xs text-ink-500"><span>{rows.length ? `Panen terakhir · ${formatShortDate(last.date)}` : 'Belum ada catatan panen'}</span><span className="font-medium text-plantation-700 group-hover:underline">Buka lahan →</span></div></div>
  </button>
}

function FarmDetail({ farm, onBack, onAdd, showForm, error, onCloseForm, form, setForm, onSubmit, editingRecordId, onEdit, onDelete }) {
  const rows = farm.records || []
  const todayRows = rows.filter((row) => row.date === todayKey())
  const today = todayRows.reduce((sum, row) => {
    const totals = getFarmHarvestTotals(row)
    sum.netKg += Number(row.netKg) || 0
    sum.gross += totals.grossTotal
    sum.useTotal += totals.useTotal
    sum.wages += totals.managerWage
    sum.result += totals.finalTotal
    return sum
  }, { netKg: 0, gross: 0, useTotal: 0, wages: 0, result: 0 })
  return <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
    <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-plantation-700 hover:underline"><ArrowLeft size={16} /> Semua lahan</button>
    <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-plantation-950 via-plantation-900 to-plantation-700 p-6 text-white shadow-soft md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Rincian lahan</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl text-white">{farm.name}</h1><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">{farm.owner && <span className="inline-flex items-center gap-1.5"><UserRound size={15} />{farm.owner}</span>}<span className="inline-flex items-center gap-1.5"><MapPin size={15} />{farm.location || 'Lokasi belum diisi'}</span>{farm.areaHa && <span>{farm.areaHa} hektare</span>}</div></div><button className="btn-gold" onClick={onAdd}><Plus size={17} /> Catat panen</button></div>{farm.note && <p className="mt-4 max-w-2xl rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">{farm.note}</p>}</header>
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<Weight size={17} />} label="Berat bersih hari ini" value={`${today.netKg.toLocaleString('id-ID')} kg`} delay={0} /><Stat icon={<CircleDollarSign size={17} />} label="Hasil panen hari ini" value={money(today.gross)} delay={70} /><Stat icon={<TrendingUp size={17} />} label="Pemakaian + upah hari ini" value={money(today.useTotal + today.wages)} delay={140} /><Stat icon={<BadgePercent size={17} />} label="Hasil akhir hari ini" value={money(today.result)} delay={210} /></section>
    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"><div><h2 className="font-display text-xl text-plantation-950">Riwayat panen dan pembagian hasil</h2><p className="mt-1 text-xs text-ink-500">Hasil akhir dapat dibagi rata kepada dua atau tiga penerima.</p></div><span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-medium text-plantation-700">{rows.length} catatan</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1400px]"><thead><tr>{['Tanggal','Pengurus','Berat bersih','Harga / kg','Hasil panen','Pemakaian','Upah 10%','Hasil akhir','Pembagian hasil','Catatan','Aksi'].map((label) => <th className="table-head" key={label}>{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="11" className="py-12 text-center text-sm text-ink-500">Belum ada catatan panen di lahan ini. Pilih “Catat panen” untuk menambahkan.</td></tr> : rows.map((row) => {
      const totals = getFarmHarvestTotals(row)
      return <tr key={row.id}><td className="table-cell whitespace-nowrap">{formatShortDate(row.date)}</td><td className="table-cell">{managerLabel(row.manager)}</td><td className="table-cell text-right">{Number(row.netKg || 0).toLocaleString('id-ID')} kg</td><td className="table-cell text-right">{money(row.pricePerKg)}</td><td className="table-cell text-right font-medium">{money(totals.grossTotal)}</td><td className="table-cell"><UseList uses={row.uses || []} total={totals.useTotal} /></td><td className="table-cell text-right">{money(totals.managerWage)}</td><td className="table-cell text-right font-semibold text-plantation-900">{money(totals.finalTotal)}</td><td className="table-cell"><ShareList shares={row.distribution || []} /></td><td className="table-cell text-ink-500">{row.note || '—'}</td><td className="table-cell"><div className="flex items-center gap-1"><button type="button" onClick={() => onEdit(row)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-plantation-800 hover:bg-plantation-50" aria-label={`Edit panen ${formatShortDate(row.date)}`}><Pencil size={14} /> Edit</button><button type="button" onClick={() => onDelete(row)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50" aria-label={`Hapus panen ${formatShortDate(row.date)}`}><Trash2 size={14} /> Hapus</button></div></td></tr>
    })}</tbody></table></div></section>
    {showForm && <HarvestDialog farmName={farm.name} form={form} setForm={setForm} error={error} onClose={onCloseForm} onSubmit={onSubmit} editing={Boolean(editingRecordId)} />}
  </main>
}

function UseList({ uses, total }) {
  const validUses = uses.filter((item) => item.purpose || Number(item.amount) > 0)
  if (!validUses.length) return <span className="text-ink-400">—</span>
  return <div className="min-w-40 space-y-1">{validUses.map((item, index) => <p key={item.id || index} className="flex justify-between gap-3 text-xs"><span className="max-w-32 truncate text-ink-600">{item.purpose}</span><span className="whitespace-nowrap text-ink-700">{money(item.amount)}</span></p>)}<p className="flex justify-between gap-3 border-t border-ink-900/10 pt-1 text-xs font-semibold"><span>Total</span><span>{money(total)}</span></p></div>
}

function ShareList({ shares }) {
  if (!shares.length) return <span className="text-ink-400">Tidak dibagi</span>
  return <div className="min-w-36 space-y-1">{shares.map((share, index) => <p key={`${share.name}-${index}`} className="flex justify-between gap-3 text-xs"><span className="max-w-24 truncate text-ink-600">{share.name}</span><span className="whitespace-nowrap font-medium text-ink-700">{money(share.amount)}</span></p>)}</div>
}

function HarvestDialog({ farmName, form, setForm, error, onClose, onSubmit, editing = false }) {
  const netKg = parseNumeric(form.netKg)
  const price = parseNumeric(form.pricePerKg)
  const uses = form.uses.map((item) => ({ ...item, amount: parseNumeric(item.amount) }))
  const { grossTotal: gross, primaryUse, additionalUseTotal, managerWage: wage, finalTotal: result } = calculateFarmHarvest({ netKg, pricePerKg: price, uses, manager: form.manager })
  const previewShares = splitFarmResultEqually(result, form.shareNames || [])

  function updateUse(id, key, value) {
    setForm((current) => ({ ...current, uses: current.uses.map((item) => item.id === id ? { ...item, [key]: key === 'amount' ? formatNumericInput(value) : value } : item) }))
  }

  return <Dialog title={`${editing ? 'Edit catatan panen' : 'Catat panen'} · ${farmName}`} onClose={onClose} wide><form onSubmit={onSubmit} className="space-y-5">
    <div className="rounded-xl bg-plantation-50 px-4 py-3 text-sm text-plantation-900">Upah pengurus 10% dihitung dari <strong>(berat bersih × harga) − pemakaian utama</strong>. Pemakaian tambahan mengurangi hasil akhir, tetapi tidak mengubah hitungan upah.</div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal panen *"><input type="date" required className="input" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field><Field label="Pengurus panen *"><select required className="input" value={form.manager} onChange={(event) => setForm({ ...form, manager: event.target.value })}><option value="">Pilih pengurus</option>{MANAGERS.map((manager) => <option key={manager.value} value={manager.value}>{manager.label}</option>)}</select></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Berat bersih (kg) *"><input inputMode="decimal" required className="input" value={form.netKg} onChange={(event) => setForm({ ...form, netKg: formatNumericInput(event.target.value) })} placeholder="Contoh: 1.250,5" /></Field><Field label="Harga per kg (Rp) *"><input inputMode="numeric" required className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatNumericInput(event.target.value) })} placeholder="Contoh: 2.850" /></Field></div>
    <section className="rounded-xl border border-ink-900/10 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-ink-800">Pemakaian hasil panen</h3><p className="mt-1 text-xs text-ink-500">Pemakaian utama wajib dan mengurangi hasil panen sebelum upah 10% dihitung. Pemakaian tambahan tidak masuk hitungan upah.</p></div><button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setForm((current) => ({ ...current, uses: [...current.uses, newUse()] }))}><Plus size={15} /> Tambah pemakaian</button></div>
      <div className="space-y-3">{form.uses.map((item, index) => <div key={item.id} className="grid items-end gap-2 sm:grid-cols-[1fr_190px_auto]"><Field label={index === 0 ? 'Pemakaian utama *' : `Pemakaian tambahan · ${index + 1}`}><input required={index === 0} className="input" value={item.purpose} onChange={(event) => updateUse(item.id, 'purpose', event.target.value)} placeholder={index === 0 ? 'Wajib, contoh: hasil panen untuk kebutuhan utama' : 'Contoh: pupuk kebun'} /></Field><Field label="Nominal (Rp)"><input required={index === 0} inputMode="numeric" className="input" value={item.amount} onChange={(event) => updateUse(item.id, 'amount', event.target.value)} placeholder="Contoh: 500.000" /></Field><button type="button" disabled={index === 0} className="mb-1 inline-flex h-10 items-center justify-center rounded-lg px-3 text-ink-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" onClick={() => setForm((current) => ({ ...current, uses: current.uses.filter((use) => use.id !== item.id) }))} aria-label="Hapus pemakaian" title={index === 0 ? 'Pemakaian utama wajib' : 'Hapus pemakaian'}><Trash2 size={17} /></button></div>)}</div>
    </section>
    <FarmShareFields count={form.shareCount} names={form.shareNames} onCountChange={(count) => setForm((current) => ({ ...current, shareCount: count, shareNames: Array.from({ length: count }, (_, index) => current.shareNames?.[index] || '') }))} onNameChange={(index, name) => setForm((current) => ({ ...current, shareNames: current.shareNames.map((value, itemIndex) => itemIndex === index ? name : value) }))} />
    <Field label="Catatan panen"><textarea className="input min-h-20" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Keterangan tambahan (opsional)" /></Field>
    <section className="overflow-hidden rounded-xl border border-plantation-900/10 bg-paper-50"><div className="border-b border-ink-900/10 px-4 py-3"><h3 className="font-semibold text-ink-800">Pratinjau pembagian hasil</h3><p className="mt-1 text-xs text-ink-500">Upah 10% dihitung setelah hasil panen dikurangi pemakaian utama. Pemakaian tambahan hanya mengurangi hasil akhir.</p></div><div className="space-y-2 px-4 py-3 text-sm"><PreviewRow label={`${netKg.toLocaleString('id-ID')} kg × ${money(price)}`} value={money(gross)} /><PreviewRow label="Total pemakaian (utama + tambahan)" value={`− ${money(primaryUse + additionalUseTotal)}`} /><PreviewRow label={`Upah pengurus · ${form.manager && form.manager !== 'none' ? '10% dari hasil setelah pemakaian utama' : 'tidak ada pengurus'}`} value={`− ${money(wage)}`} /><div className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-3"><span className="font-semibold text-ink-700">Hasil akhir</span><strong className={`font-display text-2xl ${result < 0 ? 'text-red-700' : 'text-plantation-900'}`}>{money(result)}</strong></div>{previewShares.length > 0 && <div className="space-y-1 border-t border-ink-900/10 pt-3">{previewShares.map((share, index) => <PreviewRow key={`${share.name}-${index}`} label={`Bagian ${share.name || `penerima ${index + 1}`}`} value={money(share.amount)} />)}</div>}</div></section>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <button className="btn-primary w-full"><Sprout size={16} /> {editing ? 'Simpan perubahan' : 'Simpan catatan panen'}</button>
  </form></Dialog>
}

function PreviewRow({ label, value }) { return <div className="flex justify-between gap-4 text-ink-600"><span>{label}</span><span className="whitespace-nowrap font-medium text-ink-800">{value}</span></div> }
function Stat({ icon, label, value, delay = 0 }) { return <div className="stat-card card group flex items-center gap-3 p-4" style={{ '--stat-delay': `${delay}ms` }}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plantation-700/10 text-plantation-700 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{icon}</span><div className="min-w-0"><p className="text-xs text-ink-500">{label}</p><p className="mt-0.5 truncate font-display text-lg text-plantation-950">{value}</p></div></div> }
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function Dialog({ title, onClose, children, wide = false }) { return <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-y-contain bg-ink-950/45 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur-sm sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className={`mx-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white p-4 shadow-xl sm:p-6`}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-xl text-plantation-950">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-paper-100" aria-label="Tutup"><X size={18} /></button></div>{children}</section></div> }
