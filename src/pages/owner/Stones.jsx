import React, { useMemo, useState } from 'react'
import { CheckCircle2, Mountain, PackagePlus, Scale } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatShortDate, todayKey } from '../../lib/dateUtils'
import { STONE_TYPES, canonicalStoneType } from '../../lib/stoneUtils'
import Modal from '../../components/Modal'

const number = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

export default function Stones() {
  const { currentUser } = useAuth()
  const { stoneStock, stoneSales, addStoneStock, markStoneSalePaid, cloudReady, cloudError } = useData()
  const [form, setForm] = useState({ date: todayKey(), type: STONE_TYPES[0], quantityKg: '', note: '' })
  const [message, setMessage] = useState('')
  const [saleToConfirm, setSaleToConfirm] = useState(null)
  const totals = (type) => {
    const added = stoneStock.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
    const sold = stoneSales.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
    return { added, sold, available: added - sold }
  }
  const rows = useMemo(() => [...stoneSales].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [stoneSales])
  const stockRows = useMemo(() => [...stoneStock].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [stoneStock])

  function submit(event) {
    event.preventDefault()
    const result = addStoneStock({ ...form, ownerId: currentUser.id })
    setMessage(result.ok ? 'Stok batu berhasil ditambahkan.' : result.message)
    if (result.ok) setForm((current) => ({ ...current, quantityKg: '', note: '' }))
  }

  function confirmPaid() {
    if (!saleToConfirm) return
    const result = markStoneSalePaid(saleToConfirm.id, currentUser.id)
    setMessage(result.ok ? 'Status penjualan berhasil diperbarui menjadi lunas.' : result.message)
    setSaleToConfirm(null)
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Persediaan</p><h1 className="mt-1 flex items-center gap-2 font-display text-2xl"><Mountain size={23} /> Stok Batu</h1><p className="mt-1 text-sm text-ink-500">Kelola stok masuk. Penjualan yang dicatat admin otomatis mengurangi stok tersedia.</p></header>
    {!cloudReady && <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-400/10 p-3 text-sm">Sedang memuat data bersama. Tunggu sebentar sebelum mengubah stok.</p>}
    {cloudError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cloudError}</p>}
    <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{STONE_TYPES.map((type) => { const total = totals(type); return <article key={type} className="card overflow-hidden"><div className="h-1 bg-plantation-700"/><div className="p-4"><p className="font-medium">{type}</p><p className="mt-2 font-display text-2xl text-plantation-800">{number(total.available)} <span className="font-sans text-sm">kg tersedia</span></p><div className="mt-3 flex justify-between border-t border-ink-900/8 pt-3 text-xs text-ink-500"><span>Masuk {number(total.added)} kg</span><span>Terjual {number(total.sold)} kg</span></div></div></article> })}</section>
    <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/15 text-gold-700"><PackagePlus size={19} /></span><div><h2 className="font-medium">Tambah stok batu</h2><p className="text-xs text-ink-500">Setiap penambahan tersimpan sebagai catatan stok.</p></div></div><form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div><label className="label" htmlFor="stock-date">Tanggal stok</label><input id="stock-date" className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div><div><label className="label" htmlFor="stock-type">Jenis batu</label><select id="stock-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{STONE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div><div><label className="label" htmlFor="stock-quantity">Jumlah masuk (kg)</label><input id="stock-quantity" className="input" type="number" min="0.01" step="0.01" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} placeholder="Contoh: 1.500" required /></div><div><label className="label" htmlFor="stock-note">Catatan (opsional)</label><input id="stock-note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Asal atau keterangan stok" /></div><div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">{message && <p role="status" className={`text-sm ${message.includes('berhasil') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady}><PackagePlus size={16} /> Tambahkan stok</button></div></form></section>
    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-4"><Scale size={17} className="text-plantation-700"/><div><h2 className="font-medium">Riwayat stok masuk</h2><p className="mt-1 text-xs text-ink-500">Daftar penambahan persediaan per jenis batu.</p></div></div>
      <div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head text-right">Stok masuk</th><th className="table-head">Catatan</th></tr></thead><tbody>{stockRows.length ? stockRows.map((row) => <tr key={row.id}><td className="table-cell">{formatShortDate(row.date)}</td><td className="table-cell">{canonicalStoneType(row.type)}</td><td className="table-cell text-right font-medium">{number(row.quantityKg)} kg</td><td className="table-cell">{row.note || '—'}</td></tr>) : <tr><td colSpan="4" className="table-cell py-10 text-center text-ink-500">Belum ada stok batu yang dicatat.</td></tr>}</tbody></table></div>
    </section>
    <section className="card overflow-hidden">
      <div className="border-b border-ink-900/10 px-5 py-4"><h2 className="font-medium">Batu yang terjual</h2><p className="mt-1 text-xs text-ink-500">Penjualan admin, status pembayarannya, tanggal, dan nama sopir.</p></div>
      <div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head">Nama sopir</th><th className="table-head text-right">Berat bersih</th><th className="table-head">Pembayaran</th><th className="table-head">Status</th><th className="table-head">Aksi</th></tr></thead><tbody>{rows.length ? rows.map((row) => {
        const isPaid = row.paymentStatus === 'paid' || row.paymentMethod === 'paid'
        const isTransfer = row.paymentMethod === 'transfer'
        return <tr key={row.id}>
          <td className="table-cell">{formatShortDate(row.date)}</td>
          <td className="table-cell">{canonicalStoneType(row.type)}</td>
          <td className="table-cell">{row.driverName}</td>
          <td className="table-cell text-right font-medium">{number(row.netKg)} kg</td>
          <td className="table-cell">{isTransfer ? 'Transfer' : row.paymentMethod === 'paid' ? 'Sudah dibayar' : '—'}</td>
          <td className="table-cell">{isPaid ? <span className="rounded-full bg-plantation-700/10 px-2.5 py-1 text-xs font-medium text-plantation-800">Lunas</span> : isTransfer ? <span className="rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-medium text-gold-700">Menunggu owner</span> : '—'}</td>
          <td className="table-cell">{isTransfer && !isPaid ? <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" disabled={!cloudReady} onClick={() => setSaleToConfirm(row)}><CheckCircle2 size={14} /> Tandai lunas</button> : isPaid ? <span className="text-xs text-ink-500">Selesai</span> : '—'}</td>
        </tr>
      }) : <tr><td colSpan="7" className="table-cell py-12 text-center text-ink-500">Belum ada penjualan batu.</td></tr>}</tbody></table></div>
    </section>
    <Modal open={Boolean(saleToConfirm)} onClose={() => setSaleToConfirm(null)} title="Konfirmasi pelunasan">
      {saleToConfirm && <div className="space-y-4"><p className="text-sm text-ink-700">Pastikan transfer untuk catatan berikut sudah diterima sebelum menandai lunas.</p><div className="rounded-lg bg-plantation-50 p-4 text-sm"><p><b>{canonicalStoneType(saleToConfirm.type)}</b> · {saleToConfirm.driverName}</p><p className="mt-1">{formatShortDate(saleToConfirm.date)} · {number(saleToConfirm.netKg)} kg</p></div><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setSaleToConfirm(null)}>Batal</button><button type="button" className="btn-primary" onClick={confirmPaid}><CheckCircle2 size={16} /> Ya, tandai lunas</button></div></div>}
    </Modal>
  </main>
}
