import React, { useMemo, useState } from 'react'
import { Mountain, PackageCheck, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatShortDate, todayKey } from '../../lib/dateUtils'

const TYPES = ['Batu A', 'Batu B', 'Batu C', 'Batu D']
const number = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

export default function StoneSales() {
  const { currentUser } = useAuth()
  const { stoneStock, stoneSales, addStoneSale, cloudReady, cloudError } = useData()
  const [form, setForm] = useState({ date: todayKey(), type: TYPES[0], driverName: '', netKg: '' })
  const [message, setMessage] = useState('')
  const availableFor = (type) => stoneStock.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
    - stoneSales.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
  const rows = useMemo(() => [...stoneSales].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [stoneSales])

  function submit(event) {
    event.preventDefault()
    const result = addStoneSale({ ...form, adminId: currentUser.id })
    setMessage(result.ok ? 'Penjualan batu tersimpan.' : result.message)
    if (result.ok) setForm((current) => ({ ...current, driverName: '', netKg: '' }))
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Pencatatan hasil</p><h1 className="mt-1 flex items-center gap-2 font-display text-2xl"><Mountain size={23} /> Penjualan Batu</h1><p className="mt-1 text-sm text-ink-500">Catat jenis batu, tanggal, sopir, dan berat bersih. Penjualan langsung mengurangi stok tersedia.</p></header>
    {!cloudReady && <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-400/10 p-3 text-sm">Sedang memuat data bersama. Tunggu sebentar sebelum mencatat.</p>}
    {cloudError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cloudError}</p>}
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{TYPES.map((type) => <article key={type} className="card p-4"><p className="text-sm text-ink-500">Stok tersedia · {type}</p><p className="mt-1 font-display text-2xl text-plantation-800">{number(availableFor(type))} kg</p></article>)}</section>
    <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-plantation-50 text-plantation-700"><PackageCheck size={19} /></span><div><h2 className="font-medium">Catat batu terjual</h2><p className="text-xs text-ink-500">Isi berat bersih yang keluar.</p></div></div>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div><label className="label" htmlFor="stone-date">Tanggal</label><input id="stone-date" className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
        <div><label className="label" htmlFor="stone-type">Jenis batu</label><select id="stone-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select><p className="mt-1 text-xs text-ink-500">Tersedia {number(availableFor(form.type))} kg</p></div>
        <div><label className="label" htmlFor="stone-driver">Nama sopir</label><input id="stone-driver" className="input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Contoh: Pak Andi" required /></div>
        <div><label className="label" htmlFor="stone-weight">Berat bersih (kg)</label><input id="stone-weight" className="input" type="number" min="0.01" step="0.01" value={form.netKg} onChange={(e) => setForm({ ...form, netKg: e.target.value })} placeholder="Contoh: 850" required /></div>
        <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">{message && <p role="status" className={`text-sm ${message.includes('tersimpan') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady}><Plus size={16} /> Simpan penjualan</button></div>
      </form>
    </section>
    <section className="card overflow-hidden"><div className="border-b border-ink-900/10 px-5 py-4"><h2 className="font-medium">Riwayat penjualan batu</h2><p className="mt-1 text-xs text-ink-500">Catatan ini juga tampil di halaman owner.</p></div><div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head">Nama sopir</th><th className="table-head text-right">Berat bersih</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td className="table-cell">{formatShortDate(row.date)}</td><td className="table-cell"><span className="rounded-full bg-plantation-50 px-2.5 py-1 text-xs font-medium text-plantation-800">{row.type}</span></td><td className="table-cell">{row.driverName}</td><td className="table-cell text-right font-medium">{number(row.netKg)} kg</td></tr>) : <tr><td colSpan="4" className="table-cell py-12 text-center text-ink-500">Belum ada penjualan batu.</td></tr>}</tbody></table></div></section>
  </main>
}
