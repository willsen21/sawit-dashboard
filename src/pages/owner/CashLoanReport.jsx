import React, { useMemo, useState } from 'react'
import { Download, HandCoins, Pencil, Save, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import { addDays, formatRupiah, formatShortDate, startOfWeek, toDateKey } from '../../lib/dateUtils'
import Modal from '../../components/Modal'

const QUICK_RANGES = ['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', '30 hari terakhir']

function getRange(label) {
  const now = new Date()
  const today = toDateKey(now)
  if (label === 'Hari ini') return [today, today]
  if (label === 'Minggu ini') return [toDateKey(startOfWeek(now)), today]
  if (label === 'Bulan ini') return [`${today.slice(0, 7)}-01`, today]
  if (label === 'Tahun ini') return [`${today.slice(0, 4)}-01-01`, today]
  return [toDateKey(addDays(now, -29)), today]
}

function exportCsv(loans, admins) {
  const rows = [
    ['Tanggal', 'Nama peminjam', 'Nominal', 'Catatan', 'Dicatat oleh'],
    ...loans.map((loan) => [
      loan.date,
      loan.name,
      loan.amount,
      loan.reason,
      admins.find((admin) => admin.id === loan.adminId)?.name || 'Admin',
    ]),
  ]
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = '\uFEFF' + rows.map((row) => row.map(quote).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'laporan-pinjaman-kas.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function exportPdf(loans, admins, range) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.setFontSize(14)
  pdf.text('Laporan Pinjaman Kas', 14, 15)
  pdf.setFontSize(9)
  pdf.text(`${formatShortDate(range[0])} — ${formatShortDate(range[1])}`, 14, 22)
  autoTable(pdf, {
    startY: 28,
    head: [['Tanggal', 'Nama peminjam', 'Nominal', 'Catatan', 'Dicatat oleh']],
    body: loans.map((loan) => [
      formatShortDate(loan.date),
      loan.name || '—',
      formatRupiah(loan.amount),
      loan.reason || '—',
      admins.find((admin) => admin.id === loan.adminId)?.name || 'Admin',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [58, 107, 88], textColor: 255, fontStyle: 'bold' },
  })
  pdf.save(`laporan-pinjaman-kas-${range[0]}_${range[1]}.pdf`)
}

export default function CashLoanReport() {
  const { cashLoans, editCashLoan, deleteCashLoan } = useData()
  const { admins, currentUser } = useAuth()
  const [range, setRange] = useState(() => getRange('Bulan ini'))
  const [activeQuick, setActiveQuick] = useState('Bulan ini')
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => cashLoans
    .filter((loan) => loan.date >= range[0] && loan.date <= range[1])
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [cashLoans, range])
  const total = filtered.reduce((sum, loan) => sum + Number(loan.amount || 0), 0)

  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Laporan kas</p>
        <h1 className="mt-1 text-2xl font-display">Pinjaman Kas</h1>
        <p className="mt-1 text-sm text-ink-500">{formatShortDate(range[0])} — {formatShortDate(range[1])}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => exportCsv(filtered, admins)}><Download size={16} /> Ekspor CSV</button>
        <button className="btn-primary" onClick={() => exportPdf(filtered, admins, range)}><Download size={16} /> Unduh PDF</button>
      </div>
    </div>

    <section className="card mb-6 p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_RANGES.map((label) => <button key={label} onClick={() => { setActiveQuick(label); setRange(getRange(label)) }} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${activeQuick === label ? 'border-plantation-900 bg-plantation-900 text-paper-50' : 'border-ink-900/15 text-ink-700 hover:bg-paper-100'}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="loan-report-from">Dari tanggal</label><input id="loan-report-from" type="date" className="input" value={range[0]} onChange={(event) => { setActiveQuick(null); setRange([event.target.value, range[1]]) }} /></div>
        <div><label className="label" htmlFor="loan-report-to">Sampai tanggal</label><input id="loan-report-to" type="date" className="input" value={range[1]} onChange={(event) => { setActiveQuick(null); setRange([range[0], event.target.value]) }} /></div>
      </div>
    </section>

    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <StatCard label="Jumlah pinjaman" value={filtered.length.toLocaleString('id-ID')} icon={<HandCoins size={17} />} />
      <StatCard label="Total uang dipinjam" value={formatRupiah(total)} tone="gold" icon={<HandCoins size={17} />} />
    </div>

    <section className="card overflow-hidden">
      <div className="border-b border-ink-900/8 px-5 py-4">
        <h2 className="text-sm font-semibold text-ink-700">Rincian pinjaman</h2>
        <p className="mt-1 text-xs text-ink-500">Nominal tercatat sebagai kas keluar pada tanggal pinjaman.</p>
      </div>
      {filtered.length === 0 ? <p className="px-5 py-12 text-center text-sm text-ink-500">Tidak ada pinjaman pada rentang tanggal ini.</p> : <div className="table-scroll"><table className="w-full">
        <thead><tr><th className="table-head">No.</th><th className="table-head">Tanggal</th><th className="table-head">Nama peminjam</th><th className="table-head">Nominal</th><th className="table-head">Catatan / alasan</th><th className="table-head">Dicatat oleh</th><th className="table-head">Aksi</th></tr></thead>
        <tbody>{filtered.map((loan, index) => <tr key={loan.id}>
          <td className="table-cell text-ink-500">{index + 1}</td>
          <td className="table-cell whitespace-nowrap">{formatShortDate(loan.date)}</td>
          <td className="table-cell font-medium">{loan.name || '—'}</td>
          <td className="table-cell font-semibold text-plantation-900">{formatRupiah(loan.amount)}</td>
          <td className="table-cell text-ink-600">{loan.reason || '—'}</td>
          <td className="table-cell text-ink-500">{admins.find((admin) => admin.id === loan.adminId)?.name || 'Admin'}</td>
          <td className="table-cell"><div className="flex items-center gap-1"><button type="button" onClick={() => { setEditTarget(loan); setEditForm({ date: loan.date, name: loan.name || '', amount: String(loan.amount ?? ''), reason: loan.reason || '' }); setFormError('') }} className="rounded-md p-2 text-ink-500 transition hover:bg-plantation-700/10 hover:text-plantation-800" title="Edit pinjaman" aria-label={`Edit pinjaman ${loan.name}`}><Pencil size={16} /></button><button type="button" onClick={() => setDeleteTarget(loan)} className="rounded-md p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700" title="Hapus pinjaman" aria-label={`Hapus pinjaman ${loan.name}`}><Trash2 size={16} /></button></div></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setEditForm(null); setFormError('') }} title="Edit pinjaman kas">
      {editForm && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const result = editCashLoan(editTarget.id, editForm, currentUser.id); if (!result?.ok) return setFormError(result?.message || 'Perubahan gagal disimpan.'); setEditTarget(null); setEditForm(null) }}><p className="text-sm text-ink-600">Perubahan nominal akan memperbarui perhitungan saldo kas.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal"><input type="date" className="input" value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} /></Field><Field label="Nama peminjam"><input className="input" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></Field><Field label="Nominal (Rp)"><input type="number" min="1" step="1" className="input" value={editForm.amount} onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })} /></Field><Field label="Alasan / catatan"><input className="input" value={editForm.reason} onChange={(event) => setEditForm({ ...editForm, reason: event.target.value })} /></Field></div>{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setEditTarget(null)}>Batal</button><button type="submit" className="btn-primary"><Save size={16} /> Simpan</button></div></form>}
    </Modal>
    <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus pinjaman kas">
      {deleteTarget && <div className="space-y-4"><p className="text-sm text-ink-700">Yakin menghapus pinjaman <b>{deleteTarget.name}</b> sebesar <b>{formatRupiah(deleteTarget.amount)}</b>? Saldo kas pada tanggal pinjaman akan dihitung ulang.</p><div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button><button type="button" className="btn-danger" onClick={() => { const result = deleteCashLoan(deleteTarget.id, currentUser.id); if (result?.ok) setDeleteTarget(null) }}><Trash2 size={16} /> Hapus</button></div></div>}
    </Modal>
  </div>
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
