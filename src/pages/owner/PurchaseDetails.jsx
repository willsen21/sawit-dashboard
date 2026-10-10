import React, { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'
import { formatRupiah, formatShortDate, startOfWeek, toDateKey, todayKey } from '../../lib/dateUtils'

export const PAGE_SIZE = 21
const CVS = ['Sinar Mandiri', 'Jaya Agung']
const info = (period) => { const today = todayKey(); if (period === 'minggu-ini') return ['Pembelian Minggu Ini', toDateKey(startOfWeek(new Date())), today]; if (period === 'bulan-ini') return ['Pembelian Bulan Ini', `${today.slice(0, 7)}-01`, today]; return ['Pembelian Hari Ini', today, today] }
const nameOf = (transaction, map) => transaction.name || map[transaction.supplierId]?.name || '—'

export default function PurchaseDetails() {
  const { period } = useParams()
  const { transactions, supplierMap, deleteTransaction } = useData()
  const { currentUser } = useAuth()
  const [page, setPage] = useState(1)
  const [cvFilter, setCvFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [title, from, to] = info(period)
  const rows = useMemo(() => transactions.filter((item) => item.status !== 'voided' && item.date >= from && item.date <= to && (cvFilter === 'all' || (cvFilter === 'unassigned' ? !item.cv : item.cv === cvFilter))).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)), [transactions, from, to, cvFilter])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const kg = rows.reduce((sum, item) => sum + Number(item.netKg ?? item.weightKg ?? 0), 0)
  const total = rows.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const groups = shown.reduce((all, item) => ({ ...all, [item.date]: [...(all[item.date] || []), item] }), {})

  return <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-10">
    <Link to="/owner" className="text-sm text-plantation-700 hover:underline">← Kembali ke ringkasan</Link>
    <div className="mt-5 mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl">{title}</h1><p className="mt-1 text-sm text-ink-500">{formatShortDate(from)} — {formatShortDate(to)}</p></div><div className="flex gap-3"><Summary label="Total ton bersih" value={`${(kg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ton`} /><Summary label="Total pembelian" value={formatRupiah(total)} /></div></div>
    <div className="mb-4 flex justify-end"><label className="flex items-center gap-2 text-xs text-ink-500">Filter CV<select className="rounded-md border border-ink-900/15 bg-white px-3 py-2 text-sm text-ink-700" value={cvFilter} onChange={(event) => { setCvFilter(event.target.value); setPage(1) }}><option value="all">Semua CV</option><option value="unassigned">CV belum tercatat</option>{CVS.map((cv) => <option key={cv} value={cv}>{cv}</option>)}</select></label></div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Tanggal','CV / Jenis','Nama penjual','Status','Metode pembayaran','Berat kotor','Berat bersih','Harga/kg','Total','No. Nota', ...(currentUser?.role === 'owner' ? ['Aksi'] : [])].map((label) => <th key={label} className="table-head">{label}</th>)}</tr></thead><tbody>{shown.length === 0 ? <tr><td colSpan={10 + (currentUser?.role === 'owner' ? 1 : 0)} className="table-cell py-10 text-center text-ink-500">Tidak ada transaksi untuk CV ini pada periode tersebut.</td></tr> : Object.entries(groups).map(([date, items]) => <Group key={date} date={date} items={items} map={supplierMap} onDelete={currentUser?.role === 'owner' ? setDeleteTarget : null} />)}</tbody></table></div>{rows.length > PAGE_SIZE && <Pagination page={page} pages={pages} setPage={setPage} />}</div>
    <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus catatan pembelian">{deleteTarget && <div className="space-y-4"><p className="text-sm text-ink-700">Yakin menghapus catatan pembelian <b>{nameOf(deleteTarget, supplierMap)}</b> tanggal <b>{formatShortDate(deleteTarget.date)}</b>? Catatan akan dibatalkan dan tidak ditampilkan lagi di laporan.</p><div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button><button type="button" className="btn-danger" onClick={() => { const result = deleteTransaction(deleteTarget.id, currentUser.id); if (result?.ok) setDeleteTarget(null) }}><Trash2 size={16} /> Hapus</button></div></div>}</Modal>
  </div>
}

function Summary({ label, value }) { return <div className="card px-4 py-3"><p className="text-xs text-ink-500">{label}</p><p className="font-display text-lg">{value}</p></div> }
function Group({ date, items, map, onDelete }) { return <><tr><td colSpan={onDelete ? 11 : 10} className="bg-paper-100 px-5 py-2 text-xs font-medium text-ink-700">{formatShortDate(date)}</td></tr>{items.map((item) => <tr key={item.id}><td className="table-cell">{formatShortDate(item.date)}</td><td className="table-cell font-medium">{item.kind === 'brondolan' ? 'Brondolan' : item.cv || 'Belum dipilih'}</td><td className="table-cell">{nameOf(item, map)}</td><td className="table-cell"><span className={`rounded-full px-2 py-1 text-xs font-medium ${(item.paymentStatus || 'paid') === 'unpaid' ? 'bg-gold-400/15 text-gold-600' : 'bg-plantation-700/10 text-plantation-700'}`}>{(item.paymentStatus || 'paid') === 'unpaid' ? 'Belum bayar' : 'Sudah bayar'}</span></td><td className="table-cell">{item.paymentMethod === 'transfer' ? 'Transfer' : 'Kas Kebun'}</td><td className="table-cell">{Number(item.grossKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{Number(item.netKg ?? item.weightKg ?? 0).toLocaleString('id-ID')} kg</td><td className="table-cell">{formatRupiah(item.pricePerKg)}</td><td className="table-cell font-medium">{formatRupiah(item.total)}</td><td className="table-cell text-ink-500">{item.notaNumber || '—'}</td>{onDelete && <td className="table-cell"><button type="button" onClick={() => onDelete(item)} className="rounded-md p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700" title="Hapus pembelian"><Trash2 size={16} /></button></td>}</tr>)}</> }
export function Pagination({ page, pages, setPage }) { return <nav className="pagination-bar" aria-label="Navigasi halaman"><span className="hidden text-xs text-ink-500 sm:block">Halaman <b className="text-ink-700">{page}</b> dari {pages}</span><div className="flex items-center justify-center gap-1.5"><button className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>{Array.from({ length: pages }, (_, index) => <button key={index} onClick={() => setPage(index + 1)} aria-current={page === index + 1 ? 'page' : undefined} className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${page === index + 1 ? 'bg-plantation-900 text-paper-50 shadow-sm' : 'text-ink-600 hover:bg-paper-100'}`}>{index + 1}</button>)}<button className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-40" disabled={page === pages} onClick={() => setPage(page + 1)}>Berikutnya</button></div></nav> }
