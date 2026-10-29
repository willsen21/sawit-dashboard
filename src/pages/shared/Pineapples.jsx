import React, { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Apple, PackagePlus, Pencil, ShoppingBasket, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { addDays as addCalendarDays, formatShortDate, todayKey, toDateKey } from '../../lib/dateUtils'
import { formatRupiahInput } from '../../lib/currencyInput'
import Modal from '../../components/Modal'

const PRODUCTS = [
  { id: 'large', name: 'Nanas besar', price: 13000, unit: 'buah', tone: 'bg-plantation-50 text-plantation-800' },
  { id: 'small', name: 'Nanas kecil', price: 8000, unit: 'buah', tone: 'bg-gold-400/15 text-gold-700' },
  { id: 'bundle', name: 'Bundle (3 pcs)', price: 20000, unit: 'bundle', tone: 'bg-paper-100 text-ink-700' },
]
const money = (value) => `Rp${Number(value || 0).toLocaleString('id-ID')}`
const countFormat = (value) => Number(value || 0).toLocaleString('id-ID')
const SELLERS = [
  { id: 'willsen', name: 'Willsen' },
  { id: 'sri', name: 'Sri' },
  { id: 'nisa', name: 'Nisa' },
]

export default function Pineapples() {
  const { currentUser } = useAuth()
  const { pineappleStock, pineappleSales, addPineappleStock, addPineappleSale, updatePineappleSale, deletePineappleSale, updatePineappleSalePayment, cloudReady, cloudError } = useData()
  const [stockForm, setStockForm] = useState({ date: todayKey(), quantities: { large: '', small: '', bundle: '' }, capitalCost: '', note: '' })
  const [saleForm, setSaleForm] = useState({ date: todayKey(), type: 'large', sellerName: 'willsen', quantity: '' })
  const [editingSale, setEditingSale] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', type: 'large', sellerName: 'willsen', quantity: '' })
  const [editError, setEditError] = useState('')
  const [deletingSale, setDeletingSale] = useState(null)
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [message, setMessage] = useState('')
  const isOwner = currentUser?.role === 'owner'

  const productStats = useMemo(() => PRODUCTS.map((product) => {
    const stockRows = pineappleStock.filter((row) => row.quantities ? Number(row.quantities[product.id] || 0) > 0 : row.type === product.id)
    const soldRows = pineappleSales.filter((row) => row.type === product.id)
    const quantityFromRow = (row) => Number(row.quantities?.[product.id] ?? (row.type === product.id ? row.quantity : 0) ?? 0)
    const received = stockRows.reduce((sum, row) => sum + quantityFromRow(row), 0)
    const sold = soldRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    const capital = stockRows.reduce((sum, row) => {
      if (!row.quantities) return sum + Number(row.capitalCost || 0)
      const bundleWeight = Number(row.quantities.bundle || 0) * 3
      const allocationWeight = Number(row.quantities.large || 0) + Number(row.quantities.small || 0) + bundleWeight
      const productWeight = product.id === 'bundle' ? bundleWeight : Number(row.quantities[product.id] || 0)
      return sum + (allocationWeight ? Math.round(Number(row.capitalCost || 0) * productWeight / allocationWeight) : 0)
    }, 0)
    const remainingCapital = received ? Math.max(0, Math.round(capital * (received - sold) / received)) : 0
    return { ...product, received, sold, available: received - sold, capital, remainingCapital }
  }), [pineappleStock, pineappleSales])

  const chartData = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = toDateKey(addCalendarDays(new Date(), index - 13))
    const sales = pineappleSales.filter((sale) => sale.date === date)
    return { date, label: formatShortDate(date).slice(0, 6), revenue: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0), quantity: sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0) }
  }), [pineappleSales])
  const dailyRows = useMemo(() => pineappleSales.filter((sale) => sale.date === selectedDate).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))), [pineappleSales, selectedDate])
  const dailyTotal = dailyRows.reduce((sum, row) => sum + Number(row.total || 0), 0)
  const activeProduct = PRODUCTS.find((product) => product.id === saleForm.type) || PRODUCTS[0]
  const available = productStats.find((product) => product.id === saleForm.type)?.available || 0

  function submitStock(event) {
    event.preventDefault()
    const result = addPineappleStock({ ...stockForm, ownerId: currentUser.id })
    setMessage(result.ok ? 'Stok nanas berhasil ditambahkan.' : result.message)
    if (result.ok) setStockForm((current) => ({ ...current, quantities: { large: '', small: '', bundle: '' }, capitalCost: '', note: '' }))
  }

  function submitSale(event) {
    event.preventDefault()
    const result = addPineappleSale({ ...saleForm, adminId: currentUser.id })
    setMessage(result.ok ? 'Penjualan nanas berhasil disimpan.' : result.message)
    if (result.ok) {
      setSelectedDate(saleForm.date)
      setSaleForm((current) => ({ ...current, quantity: '' }))
    }
  }

  function openEditSale(sale) {
    setEditingSale(sale)
    setEditForm({ date: sale.date || selectedDate, type: sale.type, sellerName: sale.sellerName || 'willsen', quantity: String(sale.quantity || '') })
    setEditError('')
  }

  function saveEditSale(event) {
    event.preventDefault()
    const result = updatePineappleSale(editingSale.id, editForm, currentUser.id)
    if (!result.ok) {
      setEditError(result.message)
      return
    }
    setSelectedDate(editForm.date)
    setEditingSale(null)
    setMessage('Penjualan nanas berhasil diperbarui.')
  }

  function confirmDeleteSale() {
    const result = deletePineappleSale(deletingSale.id, currentUser.id)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setDeletingSale(null)
    setMessage('Penjualan nanas berhasil dihapus dan stok tersedia sudah diperbarui.')
  }

  function changePaymentStatus(sale, paymentMethod) {
    const result = updatePineappleSalePayment(sale.id, paymentMethod, currentUser.id)
    setMessage(result.ok ? 'Status pembayaran berhasil diperbarui.' : result.message)
  }

  function shiftDate(amount) { setSelectedDate((current) => toDateKey(addCalendarDays(new Date(`${current}T12:00:00`), amount))) }

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Penjualan buah</p><h1 className="mt-1 flex items-center gap-2 font-display text-2xl"><Apple size={24} /> Nanas Gambut</h1><p className="mt-1 text-sm text-ink-500">Pantau stok dan modal, catat penjualan dengan harga tetap, lalu lihat hasil per hari.</p></header>
    {!cloudReady && <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-400/10 p-3 text-sm">Data sedang disinkronkan. Tunggu sebelum menambahkan catatan.</p>}
    {cloudError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cloudError}</p>}

    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {productStats.map((product) => <article key={product.id} className="card overflow-hidden"><div className={`h-1.5 ${product.id === 'small' ? 'bg-gold-500' : 'bg-plantation-700'}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-ink-500">Stok tersedia</p><h2 className="mt-1 font-display text-xl">{product.name}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.tone}`}>{money(product.price)} / {product.unit}</span></div><p className="mt-4 font-display text-3xl text-plantation-800">{countFormat(product.available)} <span className="font-sans text-base">{product.unit}</span></p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-900/10 pt-3 text-sm"><div><p className="text-ink-500">Modal tersisa*</p><p className="mt-1 font-semibold">{money(product.remainingCapital)}</p></div><div><p className="text-ink-500">Terjual</p><p className="mt-1 font-semibold">{countFormat(product.sold)} {product.unit}</p></div></div></div></article>)}
    </section>
    <p className="-mt-3 mb-6 text-xs text-ink-500">*Modal tersisa dihitung secara proporsional berdasarkan jumlah stok masuk dan terjual.</p>

    {isOwner && <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-plantation-50 text-plantation-700"><PackagePlus size={19} /></span><div><h2 className="font-medium">Tambah stok nanas</h2><p className="text-xs text-ink-500">Isi jumlah untuk ukuran yang tersedia. Total modal cukup dimasukkan satu kali untuk seluruh stok ini.</p></div></div><form onSubmit={submitStock} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><div><label className="label" htmlFor="pine-stock-date">Tanggal stok</label><input id="pine-stock-date" className="input" type="date" value={stockForm.date} onChange={(event) => setStockForm({ ...stockForm, date: event.target.value })} required /></div>{PRODUCTS.map((product) => <div key={product.id}><label className="label" htmlFor={`pine-stock-${product.id}`}>{product.name} ({product.unit})</label><input id={`pine-stock-${product.id}`} className="input" type="number" min="0" step="1" value={stockForm.quantities[product.id]} onChange={(event) => setStockForm({ ...stockForm, quantities: { ...stockForm.quantities, [product.id]: event.target.value } })} placeholder="0 jika tidak ada" /></div>)}<div><label className="label" htmlFor="pine-stock-capital">Total modal semua stok (Rp)</label><input id="pine-stock-capital" className="input" inputMode="numeric" value={stockForm.capitalCost} onChange={(event) => setStockForm({ ...stockForm, capitalCost: formatRupiahInput(event.target.value) })} placeholder="Contoh: 1.500.000" required /></div><div><label className="label" htmlFor="pine-stock-note">Catatan (opsional)</label><input id="pine-stock-note" className="input" value={stockForm.note} onChange={(event) => setStockForm({ ...stockForm, note: event.target.value })} placeholder="Asal pembelian" /></div><div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 lg:col-span-3">{message && <p role="status" className={`text-sm ${message.includes('berhasil') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady}><PackagePlus size={16} /> Simpan semua stok</button></div></form><p className="mt-3 text-xs text-ink-500">Modal bersama dialokasikan ke kartu secara proporsional; bundle dihitung setara 3 buah.</p></section>}

    <section className="card mb-6 p-5 md:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/20 text-gold-700"><ShoppingBasket size={19} /></span><div><h2 className="font-medium">Catat penjualan</h2><p className="text-xs text-ink-500">Pilih nama penjual. Harga otomatis mengikuti ukuran; bundle dihitung sebagai satu paket berisi 3 buah.</p></div></div><form onSubmit={submitSale} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"><div><label className="label" htmlFor="pine-sale-date">Tanggal</label><input id="pine-sale-date" className="input" type="date" value={saleForm.date} onChange={(event) => setSaleForm({ ...saleForm, date: event.target.value })} required /></div><div><label className="label" htmlFor="pine-sale-type">Ukuran</label><select id="pine-sale-type" className="input" value={saleForm.type} onChange={(event) => setSaleForm({ ...saleForm, type: event.target.value })}>{PRODUCTS.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><p className="mt-1 text-xs text-ink-500">Tersedia {countFormat(available)} {activeProduct.unit}</p></div><div><label className="label" htmlFor="pine-sale-seller">Nama penjual</label><select id="pine-sale-seller" className="input" value={saleForm.sellerName} onChange={(event) => setSaleForm({ ...saleForm, sellerName: event.target.value })}>{SELLERS.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></div><div><label className="label" htmlFor="pine-sale-quantity">Jumlah terjual ({activeProduct.unit})</label><input id="pine-sale-quantity" className="input" type="number" min="1" max={available} step="1" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} placeholder="Jumlah" required /></div><div className="rounded-lg bg-paper-100 px-4 py-3"><p className="text-xs text-ink-500">Harga satuan · total penjualan</p><p className="mt-1 font-semibold">{money(activeProduct.price)} · {money((Number(saleForm.quantity) || 0) * activeProduct.price)}</p></div><div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 lg:col-span-5">{message && <p role="status" className={`text-sm ${message.includes('berhasil') ? 'text-plantation-700' : 'text-red-700'}`}>{message}</p>}<button className="btn-primary ml-auto" type="submit" disabled={!cloudReady || available <= 0}><ShoppingBasket size={16} /> Simpan penjualan</button></div></form></section>

    <section className="card mb-6 p-5 md:p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Performa penjualan</p><h2 className="mt-1 font-display text-xl">Omzet harian · 14 hari terakhir</h2></div><div className="text-right"><p className="text-sm text-ink-500">Total omzet pada grafik</p><p className="font-display text-xl text-plantation-800">{money(chartData.reduce((sum, day) => sum + day.revenue, 0))}</p></div></div><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 2 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e2d7" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#68746c' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => value === 0 ? '0' : `${Math.round(value / 1000)}k`} tick={{ fontSize: 11, fill: '#68746c' }} axisLine={false} tickLine={false} width={42} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? formatShortDate(payload[0].payload.date) : ''} formatter={(value, name) => [name === 'revenue' ? money(value) : `${countFormat(value)} unit`, name === 'revenue' ? 'Omzet' : 'Terjual']} /><Bar dataKey="revenue" name="revenue" fill="#1d5a46" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div></section>

    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"><div><h2 className="font-medium">Penjualan per hari</h2><p className="mt-1 text-sm text-ink-500">{formatShortDate(selectedDate)} · {dailyRows.length} catatan · omzet {money(dailyTotal)}</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" className="btn-ghost" onClick={() => shiftDate(-1)}>‹ Sebelumnya</button><label className="sr-only" htmlFor="pine-table-date">Pilih tanggal riwayat</label><input id="pine-table-date" className="input !w-auto" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /><button type="button" className="btn-ghost" onClick={() => setSelectedDate(todayKey())}>Hari ini</button><button type="button" className="btn-ghost" onClick={() => shiftDate(1)}>Berikutnya ›</button></div></div><div className="table-scroll"><table className="compact-table w-full border-collapse"><thead><tr><th className="table-head">Waktu</th><th className="table-head">Ukuran</th><th className="table-head">Penjual</th><th className="table-head text-right">Jumlah</th><th className="table-head text-right">Harga satuan</th><th className="table-head text-right">Total penjualan</th><th className="table-head">Status pembayaran</th><th className="table-head">Petugas</th>{isOwner && <th className="table-head text-center">Aksi</th>}</tr></thead><tbody>{dailyRows.length ? dailyRows.map((row) => { const product = PRODUCTS.find((item) => item.id === row.type); const seller = SELLERS.find((item) => item.id === row.sellerName)?.name || row.sellerName || '—'; const paymentMethod = row.paymentMethod || (row.paymentStatus === 'paid' ? 'cash' : 'pending'); const paymentLabel = { pending: 'Belum bayar', cash: 'Tunai', transfer: 'TF' }[paymentMethod] || 'Belum bayar'; return <tr key={row.id}><td className="table-cell">{row.createdAt ? new Date(row.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td className="table-cell">{product?.name || row.type}</td><td className="table-cell">{seller}</td><td className="table-cell text-right font-medium">{countFormat(row.quantity)} {product?.unit}</td><td className="table-cell text-right">{money(row.unitPrice || product?.price)}</td><td className="table-cell text-right font-semibold">{money(row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || product?.price || 0))}</td><td className="table-cell">{isOwner ? <select className="input !min-w-[125px] !py-1.5" aria-label={`Status pembayaran untuk ${seller}`} value={paymentMethod} disabled={!cloudReady} onChange={(event) => changePaymentStatus(row, event.target.value)}><option value="pending">Belum bayar</option><option value="cash">Tunai</option><option value="transfer">TF</option></select> : <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentMethod === 'pending' ? 'bg-gold-400/20 text-gold-700' : 'bg-plantation-50 text-plantation-800'}`}>{paymentLabel}</span>}</td><td className="table-cell">{row.adminId === currentUser.id ? 'Anda' : row.recordedByRole === 'owner' ? 'Owner' : 'Admin'}</td>{isOwner && <td className="table-cell"><div className="flex justify-center gap-1"><button type="button" className="btn-ghost !p-2" aria-label={`Edit penjualan ${seller}`} title="Edit penjualan" disabled={!cloudReady} onClick={() => openEditSale(row)}><Pencil size={16} /></button><button type="button" className="btn-ghost !p-2 text-red-700 hover:bg-red-50" aria-label={`Hapus penjualan ${seller}`} title="Hapus penjualan" disabled={!cloudReady} onClick={() => setDeletingSale(row)}><Trash2 size={16} /></button></div></td>}</tr> }) : <tr><td colSpan={isOwner ? 9 : 8} className="table-cell py-12 text-center text-ink-500">Belum ada penjualan nanas pada tanggal ini.</td></tr>}</tbody>{dailyRows.length > 0 && <tfoot><tr className="bg-paper-100 font-semibold"><td className="table-cell" colSpan="3">Total hari ini</td><td className="table-cell text-right">{countFormat(dailyRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0))} unit</td><td className="table-cell" /><td className="table-cell text-right">{money(dailyTotal)}</td><td className="table-cell" /><td className="table-cell" colSpan={isOwner ? 2 : 1} /></tr></tfoot>}</table></div></section>

    <Modal open={Boolean(editingSale)} onClose={() => setEditingSale(null)} title="Edit penjualan nanas">
      {editingSale && <form onSubmit={saveEditSale} className="space-y-4">
        <div><label className="label" htmlFor="pine-edit-date">Tanggal</label><input id="pine-edit-date" className="input" type="date" value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} required /></div>
        <div><label className="label" htmlFor="pine-edit-type">Ukuran</label><select id="pine-edit-type" className="input" value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}>{PRODUCTS.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
        <div><label className="label" htmlFor="pine-edit-seller">Nama penjual</label><select id="pine-edit-seller" className="input" value={editForm.sellerName} onChange={(event) => setEditForm({ ...editForm, sellerName: event.target.value })}>{SELLERS.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></div>
        <div><label className="label" htmlFor="pine-edit-quantity">Jumlah</label><input id="pine-edit-quantity" className="input" type="number" min="1" step="1" value={editForm.quantity} onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} required /></div>
        <p className="text-xs text-ink-500">Harga diperbarui otomatis sesuai ukuran. Perubahan jumlah juga menyesuaikan stok tersedia.</p>
        {editError && <p role="alert" className="text-sm text-red-700">{editError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEditingSale(null)}>Batal</button><button type="submit" className="btn-primary" disabled={!cloudReady}><Pencil size={16} /> Simpan perubahan</button></div>
      </form>}
    </Modal>
    <Modal open={Boolean(deletingSale)} onClose={() => setDeletingSale(null)} title="Hapus penjualan nanas">
      {deletingSale && <div className="space-y-4"><p className="text-sm text-ink-700">Hapus catatan {PRODUCTS.find((item) => item.id === deletingSale.type)?.name || deletingSale.type} milik {SELLERS.find((item) => item.id === deletingSale.sellerName)?.name || deletingSale.sellerName || 'penjual belum dicatat'} sebanyak {countFormat(deletingSale.quantity)}? Stok akan tersedia kembali setelah dihapus.</p><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setDeletingSale(null)}>Batal</button><button type="button" className="btn-primary !bg-red-700 hover:!bg-red-800" disabled={!cloudReady} onClick={confirmDeleteSale}><Trash2 size={16} /> Hapus</button></div></div>}
    </Modal>
  </main>
}
