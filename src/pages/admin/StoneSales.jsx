import React, { useMemo, useState } from 'react'
import { Mountain, PackageCheck, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatShortDate, todayKey } from '../../lib/dateUtils'
import { STONE_TYPES, canonicalStoneType } from '../../lib/stoneUtils'
import { formatKgInput } from '../../lib/kgUtils'
import { formatRupiahInput, parseRupiahInput } from '../../lib/currencyInput'

const number = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

export default function StoneSales() {
  const { currentUser } = useAuth()
  const { stoneStock, stoneSales, addStoneSale, cloudReady, cloudError } = useData()
  const [form, setForm] = useState({ date: todayKey(), type: STONE_TYPES[0], driverName: '', netKg: '', pricePerKg: '', paymentMethod: 'transfer' })
  const [message, setMessage] = useState('')
  const availableFor = (type) => stoneStock.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
    - stoneSales.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
  const rows = useMemo(() => [...stoneSales].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))), [stoneSales])
  const saleTotal = Math.round((Number(String(form.netKg).replaceAll('.', '').replace(',', '.')) || 0) * parseRupiahInput(form.pricePerKg))

  function submit(event) {
    event.preventDefault()
    const result = addStoneSale({ ...form, adminId: currentUser.id })
    setMessage(result.ok ? 'Penjualan batu tersimpan.' : result.message)
    if (result.ok) setForm((current) => ({ ...current, driverName: '', netKg: '', pricePerKg: '' }))
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Pencatatan hasil</p><h1 className="mt-1 flex items-center gap-2 font-display text-2xl"><Mountain size={23} /> Penjualan Batu</h1><p className="mt-1 text-sm text-ink-500">Catat jenis batu, tanggal, sopir, dan berat bersih. Penjualan langsung mengurangi stok tersedia.</p></header>
    {!cloudReady && <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-400/10 p-3 text-sm">Sedang memuat data bersama. Tunggu sebentar sebelum mencatat.</p>}
    {cloudError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cloudError}</p>}
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{STONE_TYPES.map((type) => <article key={type} className="card p-4"><p className="text-sm text-ink-500">Stok tersedia · {type}</p><p className="mt-1 font-display text-2xl text-plantation-800">{number(availableFor(type))} kg</p></article>)}</section>
    <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-plantation-50 text-plantation-700"><PackageCheck size={19} /></span><div><h2 className="font-medium">Catat batu terjual</h2><p className="text-xs text-ink-500">Isi berat bersih yang keluar.</p></div></div>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div><label className="label" htmlFor="stone-date">Tanggal</label><input id="stone-date" className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
        <div><label className="label" htmlFor="stone-type">Jenis batu</label><select id="stone-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{STONE_TYPES.map((type) => <option key={type}>{type}</option>)}</select><p className="mt-1 text-xs text-ink-500">Tersedia {number(availableFor(form.type))} kg</p></div>
        <div><label className="label" htmlFor="stone-driver">Nama sopir</label><input id="stone-driver" className="input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Contoh: Pak Andi" required /></div>
        <div><label className="label" htmlFor="stone-weight">Berat bersih (kg)</label><input id="stone-weight" className="input" type="text" inputMode="decimal" value={form.netKg} onChange={(e) => setForm({ ...form, netKg: formatKgInput(e.target.value) })} placeholder="Contoh: 1.250 atau 1.250,5" required /></div>
        <div><label className="label" htmlFor="stone-price">Harga jual per kg (Rp)</label><input id="stone-price" className="input" type="text" inputMode="numeric" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: formatRupiahInput(e.target.value) })} placeholder="Contoh: 85.000" required /><p className="mt-1 text-xs text-ink-500">Total penjualan: Rp{saleTotal.toLocaleString('id-ID')}</p></div>
        <div><label className="label" htmlFor="stone-payment">Pembayaran</label><select id="stone-payment" className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="transfer">Transfer — menunggu konfirmasi owner</option><option value="paid">Sudah dibayar — lunas</option></select></div>
        <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">{message && <p role="status" className={`text-sm ${message.includes('tersimpan') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady}><Plus size={16} /> Simpan penjualan</button></div>
      </form>
    </section>
    <section className="card overflow-hidden"><div className="border-b border-ink-900/10 px-5 py-4"><h2 className="font-medium">Riwayat penjualan batu</h2><p className="mt-1 text-xs text-ink-500">Status transfer dapat dikonfirmasi owner dari halaman Stok Batu.</p></div><div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head">Nama sopir</th><th className="table-head text-right">Berat bersih</th><th className="table-head text-right">Harga/kg</th><th className="table-head text-right">Total jual</th><th className="table-head">Pembayaran</th><th className="table-head">Status</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td className="table-cell">{formatShortDate(row.date)}</td><td className="table-cell"><span className="rounded-full bg-plantation-50 px-2.5 py-1 text-xs font-medium text-plantation-800">{canonicalStoneType(row.type)}</span></td><td className="table-cell">{row.driverName}</td><td className="table-cell text-right font-medium">{number(row.netKg)} kg</td><td className="table-cell text-right">Rp{Number(row.pricePerKg || 0).toLocaleString('id-ID')}</td><td className="table-cell text-right font-medium">Rp{Number(row.total || (Number(row.netKg || 0) * Number(row.pricePerKg || 0))).toLocaleString('id-ID')}</td><td className="table-cell">{row.paymentMethod === 'transfer' ? 'Transfer' : row.paymentMethod === 'paid' ? 'Sudah dibayar' : '—'}</td><td className="table-cell">{row.paymentStatus === 'paid' || row.paymentMethod === 'paid' ? <span className="rounded-full bg-plantation-700/10 px-2.5 py-1 text-xs font-medium text-plantation-800">Lunas</span> : row.paymentMethod === 'transfer' ? <span className="rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-medium text-gold-700">Menunggu owner</span> : '—'}</td></tr>) : <tr><td colSpan="8" className="table-cell py-12 text-center text-ink-500">Belum ada penjualan batu.</td></tr>}</tbody></table></div></section>
  </main>
}
