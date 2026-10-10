import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Download, Pencil, Save } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'
import {
  addDays,
  formatRupiah,
  formatShortDate,
  startOfWeek,
  toDateKey,
  todayKey,
} from '../../lib/dateUtils'
import { PAGE_SIZE, Pagination } from './PurchaseDetails'
import StatCard from '../../components/StatCard'

const CVS = ['Sinar Mandiri', 'Jaya Agung']
const parseNumber = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const QUICK_RANGES = ['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', '30 hari terakhir']
const PDF_RANGES = [
  { value: '7', label: '1 minggu terakhir' },
  { value: '15', label: '15 hari terakhir' },
  { value: '30', label: '1 bulan terakhir' },
  { value: '365', label: '1 tahun terakhir' },
]
const formatCsvDate = (key) => key.split('-').reverse().join('/')

function computeQuickRange(label) {
  const now = new Date()
  const today = toDateKey(now)
  switch (label) {
    case 'Hari ini':
      return [today, today]
    case 'Minggu ini':
      return [toDateKey(startOfWeek(now)), today]
    case 'Bulan ini':
      return [`${today.slice(0, 7)}-01`, today]
    case 'Tahun ini':
      return [`${today.slice(0, 4)}-01-01`, today]
    case '30 hari terakhir':
      return [toDateKey(addDays(now, -29)), today]
    default:
      return [today, today]
  }
}

function computePdfRange(days) {
  const now = new Date()
  return [toDateKey(addDays(now, -(Number(days) - 1))), toDateKey(now)]
}

function downloadCsv(rows, reportKind) {
  const isBrondolan = reportKind === 'brondolan'
  const header = ['Tanggal', ...(isBrondolan ? ['Jenis catatan'] : ['CV']), 'Nama', 'Status pembayaran', 'Metode pembayaran', 'Berat kotor (kg)', 'Berat bersih (kg)', 'Harga/kg bersih', 'Total / nominal', 'No. Nota', 'Catatan / alasan']
  const lines = rows.map(({ type = 'purchase', record }) => {
    const t = record
    const isLoan = type === 'loan'
    return [
      formatCsvDate(t.date),
      isBrondolan ? (isLoan ? 'Pinjaman Kas' : 'Brondolan') : (t.cv || 'Belum dipilih'),
      t.name || '',
      isLoan ? '—' : t.paymentStatus === 'unpaid' ? 'Belum bayar' : 'Sudah bayar',
      isLoan ? 'Kas keluar' : t.paymentMethod === 'transfer' ? 'Transfer' : 'Kas Kebun',
      isLoan ? '—' : t.grossKg ?? t.weightKg ?? 0,
      isLoan ? '—' : t.netKg ?? t.weightKg ?? 0,
      isLoan ? '—' : t.pricePerKg,
      isLoan ? t.amount : t.total,
      isLoan ? '' : t.notaNumber || '',
      (isLoan ? t.reason || '' : t.note || '').replaceAll(',', ';'),
    ]
  })
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = '\uFEFF' + [header, ...lines].map((row) => row.map(quote).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-${reportKind}-sawit.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPdf(rows, supplierMap, range, reportKind) {
  const isBrondolan = reportKind === 'brondolan'
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const dateRange = `${formatShortDate(range[0])} — ${formatShortDate(range[1])}`
  const body = rows.map(({ type = 'purchase', record: t }, index) => {
    const isLoan = type === 'loan'
    return [
      index + 1,
      formatShortDate(t.date),
      isBrondolan ? (isLoan ? 'Pinjaman Kas' : 'Brondolan') : (t.cv || 'Belum dipilih'),
      t.name || supplierMap[t.supplierId]?.name || '—',
      isLoan ? '—' : (t.paymentStatus || 'paid') === 'unpaid' ? 'Belum bayar' : 'Sudah bayar',
      isLoan ? 'Kas keluar' : t.paymentMethod === 'transfer' ? 'Transfer' : 'Kas Kebun',
      isLoan ? '—' : `${Number(t.grossKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`,
      isLoan ? '—' : `${Number(t.netKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`,
      isLoan ? '—' : formatRupiah(t.pricePerKg),
      formatRupiah(isLoan ? t.amount : t.total),
      isLoan ? t.reason || '—' : t.note || '—',
    ]
  })

  pdf.setFontSize(11)
  pdf.text(dateRange, 14, 14)
  autoTable(pdf, {
    startY: 19,
    head: [['No.', 'Tanggal', isBrondolan ? 'Jenis catatan' : 'CV', 'Nama', 'Status', 'Metode', 'Berat kotor', 'Berat bersih', 'Harga/kg', 'Total / nominal', 'Catatan / alasan']],
    body: body.length ? body : [Array(11).fill('').map((value, index) => index === 3 ? 'Tidak ada transaksi pada rentang ini.' : value)],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: [58, 107, 88], textColor: 255, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  })
  pdf.save(`laporan-${reportKind}-${range[0]}_${range[1]}.pdf`)
}

export default function Reports() {
  const { kind } = useParams()
  const reportKind = kind === 'brondolan' ? 'brondolan' : 'buah'
  const { currentUser } = useAuth()
  const { transactions, cashLoans, supplierMap, updateTransaction, editTransaction } = useData()
  const [range, setRange] = useState(() => computeQuickRange('Bulan ini'))
  const [activeQuick, setActiveQuick] = useState('Bulan ini')
  const [page, setPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [cvFilter, setCvFilter] = useState('all')
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editError, setEditError] = useState('')
  const [showPdfOptions, setShowPdfOptions] = useState(false)
  const [pdfRangeDays, setPdfRangeDays] = useState('7')

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.status !== 'voided' && (t.kind || 'buah') === reportKind && t.date >= range[0] && t.date <= range[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (reportKind === 'brondolan' || cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
  }, [transactions, reportKind, range, paymentStatus, cvFilter])
  const displayRows = useMemo(() => {
    const purchaseRows = filtered.map((record) => ({ type: 'purchase', record, sortTime: record.time || '00:00' }))
    const loanRows = reportKind === 'brondolan'
      ? cashLoans.filter((loan) => loan.date >= range[0] && loan.date <= range[1]).map((record) => ({ type: 'loan', record, sortTime: record.createdAt?.slice(11, 16) || '00:00' }))
      : []
    return [...purchaseRows, ...loanRows].sort((a, b) => b.record.date.localeCompare(a.record.date) || b.sortTime.localeCompare(a.sortTime))
  }, [filtered, cashLoans, reportKind, range])
  const pageCount = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE))
  const paginated = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(() => {
    const totalWeight = filtered.reduce((s, t) => s + Number(t.netKg ?? t.weightKg ?? 0), 0)
    const totalGrossWeight = filtered.reduce((s, t) => s + Number(t.grossKg ?? t.weightKg ?? 0), 0)
    const totalValue = filtered.reduce((s, t) => s + Number(t.total || 0), 0)
    return { totalWeight, totalGrossWeight, totalValue, count: filtered.length }
  }, [filtered])

  function confirmPayment() {
    if (!paymentTarget) return
    updateTransaction(paymentTarget.id, { paymentStatus: 'paid' }, currentUser.id)
    setPaymentTarget(null)
  }

  function openEdit(transaction) {
    setEditTarget(transaction)
    setEditForm({
      date: transaction.date,
      name: transaction.name || supplierMap[transaction.supplierId]?.name || '',
      cv: transaction.cv || CVS[0],
      paymentStatus: transaction.paymentStatus || 'paid',
      paymentMethod: transaction.paymentMethod || 'cash',
      grossKg: String(transaction.grossKg ?? transaction.weightKg ?? ''),
      netKg: String(transaction.netKg ?? transaction.weightKg ?? ''),
      pricePerKg: String(transaction.pricePerKg ?? ''),
      note: transaction.note || '',
    })
    setEditError('')
  }

  function saveEdit(event) {
    event.preventDefault()
    if (!editTarget || !editForm) return
    const grossKg = parseNumber(editForm.grossKg)
    const netKg = parseNumber(editForm.netKg)
    const pricePerKg = parseNumber(editForm.pricePerKg)
    if (!editForm.name.trim()) return setEditError('Nama penjual wajib diisi.')
    if (!editForm.date) return setEditError('Tanggal transaksi wajib diisi.')
    if (grossKg <= 0 || netKg <= 0) return setEditError('Berat kotor dan berat bersih harus lebih dari 0.')
    if (netKg > grossKg) return setEditError('Berat bersih tidak boleh lebih besar dari berat kotor.')
    if (pricePerKg <= 0) return setEditError('Harga per kg harus lebih dari 0.')
    const result = editTransaction(editTarget.id, {
      date: editForm.date,
      name: editForm.name.trim(),
      ...(reportKind === 'buah' ? { cv: editForm.cv } : {}),
      paymentStatus: editForm.paymentStatus,
      paymentMethod: editForm.paymentMethod,
      grossKg,
      netKg,
      pricePerKg,
      note: editForm.note.trim(),
    }, currentUser.id)
    if (!result?.ok) return setEditError(result?.message || 'Perubahan tidak berhasil disimpan.')
    setEditTarget(null)
    setEditForm(null)
    setEditError('')
  }

  function downloadSelectedPdf() {
    const pdfRange = computePdfRange(pdfRangeDays)
    const purchaseRows = transactions
      .filter((t) => t.status !== 'voided' && (t.kind || 'buah') === reportKind && t.date >= pdfRange[0] && t.date <= pdfRange[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (reportKind === 'brondolan' || cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
      .map((record) => ({ type: 'purchase', record }))
    const loanRows = reportKind === 'brondolan'
      ? cashLoans.filter((loan) => loan.date >= pdfRange[0] && loan.date <= pdfRange[1]).map((record) => ({ type: 'loan', record }))
      : []
    downloadPdf([...purchaseRows, ...loanRows].sort((a, b) => b.record.date.localeCompare(a.record.date) || String(b.record.createdAt || b.record.time || '').localeCompare(String(a.record.createdAt || a.record.time || ''))), supplierMap, pdfRange, reportKind)
    setShowPdfOptions(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display">Laporan {reportKind === 'brondolan' ? 'Brondolan' : 'Buah'}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {formatShortDate(range[0])} — {formatShortDate(range[1])}
          </p>
          {reportKind === 'brondolan' && <p className="mt-1 text-xs text-ink-500">Pinjaman kas tampil di tabel sebagai kas keluar; ringkasan total pembelian hanya menghitung brondolan.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => downloadCsv(displayRows, reportKind)}>
            <Download size={16} /> Ekspor CSV
          </button>
          <button className="btn-primary" onClick={() => setShowPdfOptions(true)}>
            <Download size={16} /> Unduh PDF
          </button>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_RANGES.map((label) => (
            <button
              key={label}
              onClick={() => {
                setActiveQuick(label)
                setRange(computeQuickRange(label))
                setPage(1)
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                activeQuick === label
                  ? 'bg-plantation-900 text-paper-50 border-plantation-900'
                  : 'border-ink-900/15 text-ink-700 hover:bg-paper-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Dari tanggal</label>
            <input
              type="date"
              className="input"
              value={range[0]}
              onChange={(e) => {
                setActiveQuick(null)
                setRange([e.target.value, range[1]])
                setPage(1)
              }}
            />
          </div>
          <div>
            <label className="label">Status pembayaran</label>
            <select className="input" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}>
              <option value="all">Semua status</option>
              <option value="paid">Sudah bayar</option>
              <option value="unpaid">Belum bayar</option>
            </select>
          </div>
          {reportKind === 'buah' && <div>
            <label className="label">CV</label>
            <select className="input" value={cvFilter} onChange={(e) => { setCvFilter(e.target.value); setPage(1) }}>
              <option value="all">Semua CV</option><option value="unassigned">CV belum tercatat</option>
              {CVS.map((cv) => <option key={cv} value={cv}>{cv}</option>)}
            </select>
          </div>}
          <div>
            <label className="label">Sampai tanggal</label>
            <input
              type="date"
              className="input"
              value={range[1]}
              onChange={(e) => {
                setActiveQuick(null)
                setRange([range[0], e.target.value])
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah transaksi" value={summary.count.toLocaleString('id-ID')} delay={0} />
        <StatCard label="Total berat bersih" value={`${summary.totalWeight.toLocaleString('id-ID')} kg`} delay={100} />
        <StatCard label="Total pembelian" value={formatRupiah(summary.totalValue)} tone="gold" delay={200} />
        <StatCard label="Total berat kotor" value={`${summary.totalGrossWeight.toLocaleString('id-ID')} kg`} delay={300} />
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-head">No.</th>
                <th className="table-head">Tanggal</th>
                {reportKind === 'buah' ? <th className="table-head">CV</th> : <th className="table-head">Jenis catatan</th>}
                <th className="table-head">Nama</th>
                <th className="table-head">Status</th>
                <th className="table-head">Metode pembayaran</th>
                <th className="table-head">Berat kotor</th>
                <th className="table-head">Berat bersih</th>
                <th className="table-head">Harga/kg bersih</th>
                <th className="table-head">Total</th>
                <th className="table-head">Catatan</th>
                {currentUser?.role === 'owner' && <th className="table-head">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={11 + (currentUser?.role === 'owner' ? 1 : 0)} className="table-cell text-center text-ink-500 py-10">
                    Tidak ada transaksi pada rentang ini.
                  </td>
                </tr>
              ) : (
                paginated.map(({ type, record: t }, index) => (
                  <tr key={`${type}-${t.id}`} className={type === 'loan' ? 'bg-gold-400/5' : ''}>
                    <td className="table-cell text-ink-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="table-cell">{formatShortDate(t.date)}</td>
                    {reportKind === 'buah' ? <td className="table-cell font-medium">{t.cv || 'Belum dipilih'}</td> : <td className="table-cell font-medium">{type === 'loan' ? <span className="rounded-full bg-gold-400/15 px-2 py-1 text-xs font-medium text-gold-700">Pinjaman Kas</span> : 'Brondolan'}</td>}
                    <td className="table-cell">{t.name || supplierMap[t.supplierId]?.name || '—'}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : <PaymentBadge status={t.paymentStatus || 'paid'} onConfirm={() => setPaymentTarget(t)} />}</td>
                    <td className="table-cell">{type === 'loan' ? 'Kas keluar' : t.paymentMethod === 'transfer' ? 'Transfer' : 'Kas Kebun'}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : `${Number(t.grossKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : `${Number(t.netKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : formatRupiah(t.pricePerKg)}</td>
                    <td className={`table-cell font-medium ${type === 'loan' ? 'text-gold-700' : ''}`}>{formatRupiah(type === 'loan' ? t.amount : t.total)}</td>
                    <td className="table-cell text-ink-500">{type === 'loan' ? t.reason || '—' : t.note || '—'}</td>
                    {currentUser?.role === 'owner' && <td className="table-cell">{type === 'loan' ? '—' : <button type="button" onClick={() => openEdit(t)} className="rounded-md p-2 text-ink-500 transition hover:bg-plantation-700/10 hover:text-plantation-800" title="Edit catatan" aria-label={`Edit catatan ${t.name || 'transaksi'}`}><Pencil size={16} /></button>}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {displayRows.length > PAGE_SIZE && <Pagination page={page} pages={pageCount} setPage={setPage} />}
      </div>
      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Konfirmasi pembayaran">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-700">Apakah pembelian dari <b>{paymentTarget?.name || supplierMap[paymentTarget?.supplierId]?.name || 'pemasok ini'}</b> sebesar <b>{formatRupiah(paymentTarget?.total)}</b> sudah dibayar?</p>
          <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setPaymentTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={confirmPayment}><CheckCircle2 size={16} /> Sudah dibayar</button></div>
        </div>
      </Modal>
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setEditForm(null); setEditError('') }} title="Edit catatan pembelian">
        {editForm && <form onSubmit={saveEdit} className="space-y-4">
          <p className="text-sm text-ink-600">Perubahan hanya dapat disimpan oleh owner. Total akan dihitung ulang dari berat bersih × harga/kg.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal"><input type="date" max={todayKey()} className="input" value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} /></Field>
            <Field label="Nama penjual"><input className="input" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></Field>
            {reportKind === 'buah' && <Field label="CV"><select className="input" value={editForm.cv} onChange={(event) => setEditForm({ ...editForm, cv: event.target.value })}><option value="">Belum dipilih</option>{CVS.map((cv) => <option key={cv}>{cv}</option>)}</select></Field>}
            <Field label="Status pembayaran"><select className="input" value={editForm.paymentStatus} onChange={(event) => setEditForm({ ...editForm, paymentStatus: event.target.value })}><option value="paid">Sudah bayar</option><option value="unpaid">Belum bayar</option></select></Field>
            <Field label="Metode pembayaran"><select className="input" value={editForm.paymentMethod} onChange={(event) => setEditForm({ ...editForm, paymentMethod: event.target.value })}><option value="cash">Kas Kebun</option><option value="transfer">Transfer</option></select></Field>
            <Field label="Berat kotor (kg)"><input type="number" min="0" step="0.01" className="input" value={editForm.grossKg} onChange={(event) => setEditForm({ ...editForm, grossKg: event.target.value })} /></Field>
            <Field label="Berat bersih (kg)"><input type="number" min="0" step="0.01" className="input" value={editForm.netKg} onChange={(event) => setEditForm({ ...editForm, netKg: event.target.value })} /></Field>
            <Field label="Harga per kg bersih (Rp)"><input type="number" min="0" step="1" className="input" value={editForm.pricePerKg} onChange={(event) => setEditForm({ ...editForm, pricePerKg: event.target.value })} /></Field>
            <Field label="Catatan"><input className="input" value={editForm.note} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} /></Field>
          </div>
          {editError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
          <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => { setEditTarget(null); setEditForm(null); setEditError('') }}>Batal</button><button type="submit" className="btn-primary"><Save size={16} /> Simpan perubahan</button></div>
        </form>}
      </Modal>
      <Modal open={showPdfOptions} onClose={() => setShowPdfOptions(false)} title="Unduh laporan PDF">
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="pdf-range">Rentang laporan</label>
            <select id="pdf-range" className="input" value={pdfRangeDays} onChange={(event) => setPdfRangeDays(event.target.value)}>
              {PDF_RANGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <p className="text-xs text-ink-500">PDF hanya berisi tanggal rentang pilihan dan tabel pembelian.</p>
          <button type="button" className="btn-primary w-full" onClick={downloadSelectedPdf}><Download size={16} /> Unduh PDF</button>
        </div>
      </Modal>
    </div>
  )
}

function PaymentBadge({ status, onConfirm }) { return status === 'unpaid' ? <button type="button" onClick={onConfirm} className="rounded-full bg-gold-400/15 px-2 py-1 text-xs font-medium text-gold-600 transition hover:bg-gold-400/30" title="Klik untuk konfirmasi pembayaran">Belum bayar</button> : <span className="rounded-full bg-plantation-700/10 px-2 py-1 text-xs font-medium text-plantation-700">Sudah bayar</span> }
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
