import React, { useMemo, useState } from 'react'
import { CheckCircle2, Mountain, PackagePlus, Scale, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatShortDate, todayKey } from '../../lib/dateUtils'
import { STONE_TYPES, canonicalStoneType } from '../../lib/stoneUtils'
import { formatKgInput } from '../../lib/kgUtils'
import { formatRupiahInput } from '../../lib/currencyInput'
import Modal from '../../components/Modal'

const number = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })

export default function Stones() {
  const { currentUser } = useAuth()
  const { stoneStock, stoneSales, addStoneStock, updateStoneStock, deleteStoneStock, updateStoneSale, deleteStoneSale, markStoneSalePaid, cloudReady, cloudError } = useData()
  const [form, setForm] = useState({ date: todayKey(), type: STONE_TYPES[0], quantityKg: '', capitalCost: '', note: '' })
  const [message, setMessage] = useState('')
  const [saleToConfirm, setSaleToConfirm] = useState(null)
  const [stockToDelete, setStockToDelete] = useState(null)
  const [stockToEdit, setStockToEdit] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', type: STONE_TYPES[0], quantityKg: '', capitalCost: '', note: '' })
  const [editError, setEditError] = useState('')
  const [saleToEdit, setSaleToEdit] = useState(null)
  const [saleToDelete, setSaleToDelete] = useState(null)
  const [saleEditForm, setSaleEditForm] = useState({ date: '', type: STONE_TYPES[0], driverName: '', netKg: '', pricePerKg: '', paymentMethod: 'transfer' })
  const [saleEditError, setSaleEditError] = useState('')
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
    if (result.ok) setForm((current) => ({ ...current, quantityKg: '', capitalCost: '', note: '' }))
  }

  function confirmPaid() {
    if (!saleToConfirm) return
    const result = markStoneSalePaid(saleToConfirm.id, currentUser.id)
    setMessage(result.ok ? 'Status penjualan berhasil diperbarui menjadi lunas.' : result.message)
    setSaleToConfirm(null)
  }

  function openStockEdit(row) {
    setStockToEdit(row)
    setEditForm({ date: row.date, type: canonicalStoneType(row.type), quantityKg: number(row.quantityKg), capitalCost: formatRupiahInput(row.capitalCost || 0), note: row.note || '' })
    setEditError('')
  }

  function saveStockEdit(event) {
    event.preventDefault()
    const result = updateStoneStock(stockToEdit.id, editForm, currentUser.id)
    if (!result.ok) return setEditError(result.message)
    setStockToEdit(null)
    setMessage('Catatan stok berhasil diperbarui.')
  }

  function confirmDeleteStock() {
    if (!stockToDelete) return
    const result = deleteStoneStock(stockToDelete.id, currentUser.id)
    if (!result.ok) setMessage(result.message)
    else setMessage('Catatan stok batu berhasil dihapus.')
    setStockToDelete(null)
  }

  function openSaleEdit(row) {
    setSaleToEdit(row)
    setSaleEditForm({ date: row.date, type: canonicalStoneType(row.type), driverName: row.driverName || '', netKg: number(row.netKg), pricePerKg: formatRupiahInput(row.pricePerKg || 0), paymentMethod: row.paymentMethod === 'paid' ? 'paid' : 'transfer' })
    setSaleEditError('')
  }

  function saveSaleEdit(event) {
    event.preventDefault()
    const result = updateStoneSale(saleToEdit.id, saleEditForm, currentUser.id)
    if (!result.ok) return setSaleEditError(result.message)
    setSaleToEdit(null)
    setMessage('Catatan penjualan berhasil diperbarui.')
  }

  function confirmDeleteSale() {
    if (!saleToDelete) return
    const result = deleteStoneSale(saleToDelete.id, currentUser.id)
    setMessage(result.ok ? 'Catatan penjualan batu berhasil dihapus.' : result.message)
    setSaleToDelete(null)
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Persediaan</p><h1 className="mt-1 flex items-center gap-2 font-display text-2xl"><Mountain size={23} /> Stok Batu</h1><p className="mt-1 text-sm text-ink-500">Kelola stok masuk. Penjualan yang dicatat admin otomatis mengurangi stok tersedia.</p></header>
    {!cloudReady && <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-400/10 p-3 text-sm">Sedang memuat data bersama. Tunggu sebentar sebelum mengubah stok.</p>}
    {cloudError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cloudError}</p>}
    <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{STONE_TYPES.map((type) => { const total = totals(type); return <article key={type} className="card overflow-hidden"><div className="h-1 bg-plantation-700"/><div className="p-4"><p className="font-medium">{type}</p><p className="mt-2 font-display text-2xl text-plantation-800">{number(total.available)} <span className="font-sans text-sm">kg tersedia</span></p><div className="mt-3 flex justify-between border-t border-ink-900/8 pt-3 text-xs text-ink-500"><span>Masuk {number(total.added)} kg</span><span>Terjual {number(total.sold)} kg</span></div></div></article> })}</section>
    <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/15 text-gold-700"><PackagePlus size={19} /></span><div><h2 className="font-medium">Tambah stok batu</h2><p className="text-xs text-ink-500">Setiap penambahan tersimpan sebagai catatan stok.</p></div></div><form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div><label className="label" htmlFor="stock-date">Tanggal stok</label><input id="stock-date" className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div><div><label className="label" htmlFor="stock-type">Jenis batu</label><select id="stock-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{STONE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div><div><label className="label" htmlFor="stock-quantity">Jumlah masuk (kg)</label><input id="stock-quantity" className="input" type="text" inputMode="decimal" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: formatKgInput(e.target.value) })} placeholder="Contoh: 1.500 atau 1.250,5" required /></div><div><label className="label" htmlFor="stock-capital">Modal pembelian (Rp)</label><input id="stock-capital" className="input" type="text" inputMode="numeric" value={form.capitalCost} onChange={(e) => setForm({ ...form, capitalCost: formatRupiahInput(e.target.value) })} placeholder="Contoh: 2.500.000" required /></div><div><label className="label" htmlFor="stock-note">Catatan (opsional)</label><input id="stock-note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Asal atau keterangan stok" /></div><div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">{message && <p role="status" className={`text-sm ${message.includes('berhasil') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady}><PackagePlus size={16} /> Tambahkan stok</button></div></form></section>
    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-4"><Scale size={17} className="text-plantation-700"/><div><h2 className="font-medium">Riwayat stok masuk</h2><p className="mt-1 text-xs text-ink-500">Daftar penambahan persediaan per jenis batu.</p></div></div>
      <div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head text-right">Stok masuk</th><th className="table-head text-right">Modal pembelian</th><th className="table-head">Catatan</th><th className="table-head">Aksi</th></tr></thead><tbody>{stockRows.length ? stockRows.map((row) => <tr key={row.id}><td className="table-cell">{formatShortDate(row.date)}</td><td className="table-cell">{canonicalStoneType(row.type)}</td><td className="table-cell text-right font-medium">{number(row.quantityKg)} kg</td><td className="table-cell text-right">Rp{Number(row.capitalCost || 0).toLocaleString('id-ID')}</td><td className="table-cell">{row.note || '—'}</td><td className="table-cell"><div className="flex gap-1"><button type="button" className="btn-ghost !px-2 !py-1.5" disabled={!cloudReady} onClick={() => openStockEdit(row)} title="Edit stok"><Pencil size={15} /></button><button type="button" className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-40" disabled={!cloudReady} onClick={() => setStockToDelete(row)} title="Hapus stok"><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan="6" className="table-cell py-10 text-center text-ink-500">Belum ada stok batu yang dicatat.</td></tr>}</tbody></table></div>
    </section>
    <section className="card overflow-hidden">
      <div className="border-b border-ink-900/10 px-5 py-4"><h2 className="font-medium">Batu yang terjual</h2><p className="mt-1 text-xs text-ink-500">Penjualan admin, status pembayarannya, tanggal, dan nama sopir.</p></div>
      <div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Tanggal</th><th className="table-head">Jenis batu</th><th className="table-head">Nama sopir</th><th className="table-head text-right">Berat bersih</th><th className="table-head text-right">Harga/kg</th><th className="table-head text-right">Total jual</th><th className="table-head">Pembayaran</th><th className="table-head">Status</th><th className="table-head">Aksi</th></tr></thead><tbody>{rows.length ? rows.map((row) => {
        const isPaid = row.paymentStatus === 'paid' || row.paymentMethod === 'paid'
        const isTransfer = row.paymentMethod === 'transfer'
        return <tr key={row.id}>
          <td className="table-cell">{formatShortDate(row.date)}</td>
          <td className="table-cell">{canonicalStoneType(row.type)}</td>
          <td className="table-cell">{row.driverName}</td>
          <td className="table-cell text-right font-medium">{number(row.netKg)} kg</td>
          <td className="table-cell text-right">Rp{Number(row.pricePerKg || 0).toLocaleString('id-ID')}</td>
          <td className="table-cell text-right font-medium">Rp{Number(row.total || 0).toLocaleString('id-ID')}</td>
          <td className="table-cell">{isTransfer ? 'Transfer' : row.paymentMethod === 'paid' ? 'Sudah dibayar' : '—'}</td>
          <td className="table-cell">{isPaid ? <span className="rounded-full bg-plantation-700/10 px-2.5 py-1 text-xs font-medium text-plantation-800">Lunas</span> : isTransfer ? <span className="rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-medium text-gold-700">Menunggu owner</span> : '—'}</td>
          <td className="table-cell"><div className="flex flex-wrap items-center gap-1">{isTransfer && !isPaid && <button type="button" className="btn-ghost !px-2 !py-1.5 text-xs" disabled={!cloudReady} onClick={() => setSaleToConfirm(row)}><CheckCircle2 size={14} /> Lunas</button>}{isPaid && <span className="px-1 text-xs text-ink-500">Selesai</span>}<button type="button" className="btn-ghost !px-2 !py-1.5" disabled={!cloudReady} onClick={() => openSaleEdit(row)} title="Edit penjualan"><Pencil size={15} /></button><button type="button" className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-40" disabled={!cloudReady} onClick={() => setSaleToDelete(row)} title="Hapus penjualan"><Trash2 size={15} /></button></div></td>
        </tr>
      }) : <tr><td colSpan="9" className="table-cell py-12 text-center text-ink-500">Belum ada penjualan batu.</td></tr>}</tbody></table></div>
    </section>
    <Modal open={Boolean(saleToConfirm)} onClose={() => setSaleToConfirm(null)} title="Konfirmasi pelunasan">
      {saleToConfirm && <div className="space-y-4"><p className="text-sm text-ink-700">Pastikan transfer untuk catatan berikut sudah diterima sebelum menandai lunas.</p><div className="rounded-lg bg-plantation-50 p-4 text-sm"><p><b>{canonicalStoneType(saleToConfirm.type)}</b> · {saleToConfirm.driverName}</p><p className="mt-1">{formatShortDate(saleToConfirm.date)} · {number(saleToConfirm.netKg)} kg</p></div><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setSaleToConfirm(null)}>Batal</button><button type="button" className="btn-primary" onClick={confirmPaid}><CheckCircle2 size={16} /> Ya, tandai lunas</button></div></div>}
    </Modal>
    <Modal open={Boolean(stockToEdit)} onClose={() => setStockToEdit(null)} title="Edit catatan stok batu">
      <form onSubmit={saveStockEdit} className="space-y-4">
        <div><label className="label" htmlFor="edit-stock-date">Tanggal stok</label><input id="edit-stock-date" className="input" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required /></div>
        <div><label className="label" htmlFor="edit-stock-type">Jenis batu</label><select id="edit-stock-type" className="input" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>{STONE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
        <div><label className="label" htmlFor="edit-stock-quantity">Jumlah masuk (kg)</label><input id="edit-stock-quantity" className="input" inputMode="decimal" value={editForm.quantityKg} onChange={(e) => setEditForm({ ...editForm, quantityKg: formatKgInput(e.target.value) })} required /></div>
        <div><label className="label" htmlFor="edit-stock-capital">Modal pembelian (Rp)</label><input id="edit-stock-capital" className="input" inputMode="numeric" value={editForm.capitalCost} onChange={(e) => setEditForm({ ...editForm, capitalCost: formatRupiahInput(e.target.value) })} /></div>
        <div><label className="label" htmlFor="edit-stock-note">Catatan</label><input id="edit-stock-note" className="input" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} /></div>
        {editError && <p role="alert" className="text-sm text-red-700">{editError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setStockToEdit(null)}>Batal</button><button type="submit" className="btn-primary" disabled={!cloudReady}>Simpan perubahan</button></div>
      </form>
    </Modal>
    <Modal open={Boolean(stockToDelete)} onClose={() => setStockToDelete(null)} title="Hapus catatan stok">
      {stockToDelete && <div className="space-y-4"><p className="text-sm text-ink-700">Hapus {canonicalStoneType(stockToDelete.type)} sebanyak <b>{number(stockToDelete.quantityKg)} kg</b> dengan modal <b>Rp{Number(stockToDelete.capitalCost || 0).toLocaleString('id-ID')}</b>? Stok dan pengeluaran modal tanggal tersebut akan dihitung ulang.</p><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setStockToDelete(null)}>Batal</button><button type="button" className="btn-danger" disabled={!cloudReady} onClick={confirmDeleteStock}><Trash2 size={16} /> Hapus catatan</button></div></div>}
    </Modal>
    <Modal open={Boolean(saleToEdit)} onClose={() => setSaleToEdit(null)} title="Edit penjualan batu">
      <form onSubmit={saveSaleEdit} className="space-y-4">
        <div><label className="label" htmlFor="edit-sale-date">Tanggal</label><input id="edit-sale-date" className="input" type="date" value={saleEditForm.date} onChange={(e) => setSaleEditForm({ ...saleEditForm, date: e.target.value })} required /></div>
        <div><label className="label" htmlFor="edit-sale-type">Jenis batu</label><select id="edit-sale-type" className="input" value={saleEditForm.type} onChange={(e) => setSaleEditForm({ ...saleEditForm, type: e.target.value })}>{STONE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
        <div><label className="label" htmlFor="edit-sale-driver">Nama sopir</label><input id="edit-sale-driver" className="input" value={saleEditForm.driverName} onChange={(e) => setSaleEditForm({ ...saleEditForm, driverName: e.target.value })} required /></div>
        <div><label className="label" htmlFor="edit-sale-kg">Berat bersih (kg)</label><input id="edit-sale-kg" className="input" inputMode="decimal" value={saleEditForm.netKg} onChange={(e) => setSaleEditForm({ ...saleEditForm, netKg: formatKgInput(e.target.value) })} required /></div>
        <div><label className="label" htmlFor="edit-sale-price">Harga jual per kg (Rp)</label><input id="edit-sale-price" className="input" inputMode="numeric" value={saleEditForm.pricePerKg} onChange={(e) => setSaleEditForm({ ...saleEditForm, pricePerKg: formatRupiahInput(e.target.value) })} required /></div>
        <div><label className="label" htmlFor="edit-sale-payment">Pembayaran</label><select id="edit-sale-payment" className="input" value={saleEditForm.paymentMethod} onChange={(e) => setSaleEditForm({ ...saleEditForm, paymentMethod: e.target.value })}><option value="transfer">Transfer — menunggu konfirmasi</option><option value="paid">Sudah dibayar</option></select></div>
        {saleEditError && <p role="alert" className="text-sm text-red-700">{saleEditError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setSaleToEdit(null)}>Batal</button><button type="submit" className="btn-primary" disabled={!cloudReady}>Simpan perubahan</button></div>
      </form>
    </Modal>
    <Modal open={Boolean(saleToDelete)} onClose={() => setSaleToDelete(null)} title="Hapus catatan penjualan">
      {saleToDelete && <div className="space-y-4"><p className="text-sm text-ink-700">Hapus penjualan {canonicalStoneType(saleToDelete.type)} sebanyak <b>{number(saleToDelete.netKg)} kg</b>? Jumlah tersebut akan kembali ke stok tersedia.</p><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setSaleToDelete(null)}>Batal</button><button type="button" className="btn-danger" disabled={!cloudReady} onClick={confirmDeleteSale}><Trash2 size={16} /> Hapus penjualan</button></div></div>}
    </Modal>
  </main>
}
