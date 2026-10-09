import React, { useMemo, useState } from 'react'
import { CheckCircle2, Download } from 'lucide-react'
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

function downloadCsv(rows) {
  const header = ['Tanggal', 'CV', 'Status pembayaran', 'Berat (kg)', 'Harga/kg', 'Total', 'No. Nota', 'Catatan']
  const lines = rows.map((t) => [
    formatCsvDate(t.date),
    t.cv || 'Belum dipilih',
    t.paymentStatus === 'unpaid' ? 'Belum bayar' : 'Sudah bayar',
    t.weightKg,
    t.pricePerKg,
    t.total,
    t.notaNumber || '',
    (t.note || '').replaceAll(',', ';'),
  ])
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = '\uFEFF' + [header, ...lines].map((row) => row.map(quote).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-pembelian-sawit.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPdf(rows, supplierMap, range) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const dateRange = `${formatShortDate(range[0])} — ${formatShortDate(range[1])}`
  const body = rows.map((t, index) => [
    index + 1,
    formatShortDate(t.date),
    t.cv || 'Belum dipilih',
    t.name || supplierMap[t.supplierId]?.name || '—',
    (t.paymentStatus || 'paid') === 'unpaid' ? 'Belum bayar' : 'Sudah bayar',
    `${Number(t.weightKg).toLocaleString('id-ID')} kg`,
    formatRupiah(t.pricePerKg),
    formatRupiah(t.total),
    t.note || '—',
  ])

  pdf.setFontSize(11)
  pdf.text(dateRange, 14, 14)
  autoTable(pdf, {
    startY: 19,
    head: [['No.', 'Tanggal', 'CV', 'Nama', 'Status', 'Berat', 'Harga/kg', 'Total', 'Catatan']],
    body: body.length ? body : [['', '', '', 'Tidak ada transaksi pada rentang ini.', '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: [58, 107, 88], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 23 }, 2: { cellWidth: 27 }, 3: { cellWidth: 29 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 }, 6: { cellWidth: 24 }, 7: { cellWidth: 27 }, 8: { cellWidth: 'auto' } },
    margin: { left: 14, right: 14 },
  })
  pdf.save(`laporan-pembelian-${range[0]}_${range[1]}.pdf`)
}

export default function Reports() {
  const { currentUser } = useAuth()
  const { transactions, supplierMap, updateTransaction } = useData()
  const [range, setRange] = useState(() => computeQuickRange('Bulan ini'))
  const [activeQuick, setActiveQuick] = useState('Bulan ini')
  const [page, setPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [cvFilter, setCvFilter] = useState('all')
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [showPdfOptions, setShowPdfOptions] = useState(false)
  const [pdfRangeDays, setPdfRangeDays] = useState('7')

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.status !== 'voided' && t.date >= range[0] && t.date <= range[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
  }, [transactions, range, paymentStatus, cvFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(() => {
    const totalWeight = filtered.reduce((s, t) => s + Number(t.weightKg || 0), 0)
    const totalValue = filtered.reduce((s, t) => s + Number(t.total || 0), 0)
    const avgPrice = totalWeight > 0 ? totalValue / totalWeight : 0
    return { totalWeight, totalValue, avgPrice, count: filtered.length }
  }, [filtered])

  function confirmPayment() {
    if (!paymentTarget) return
    updateTransaction(paymentTarget.id, { paymentStatus: 'paid' }, currentUser.id)
    setPaymentTarget(null)
  }

  function downloadSelectedPdf() {
    const pdfRange = computePdfRange(pdfRangeDays)
    const pdfRows = transactions
      .filter((t) => t.status !== 'voided' && t.date >= pdfRange[0] && t.date <= pdfRange[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
    downloadPdf(pdfRows, supplierMap, pdfRange)
    setShowPdfOptions(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display">Laporan</h1>
          <p className="text-sm text-ink-500 mt-1">
            {formatShortDate(range[0])} — {formatShortDate(range[1])}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => downloadCsv(filtered)}>
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
          <div>
            <label className="label">CV</label>
            <select className="input" value={cvFilter} onChange={(e) => { setCvFilter(e.target.value); setPage(1) }}>
              <option value="all">Semua CV</option><option value="unassigned">CV belum tercatat</option>
              {CVS.map((cv) => <option key={cv} value={cv}>{cv}</option>)}
            </select>
          </div>
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
        <StatCard label="Total berat" value={`${summary.totalWeight.toLocaleString('id-ID')} kg`} delay={100} />
        <StatCard label="Total pembelian" value={formatRupiah(summary.totalValue)} tone="gold" delay={200} />
        <StatCard label="Rata-rata harga/kg" value={formatRupiah(summary.avgPrice)} delay={300} />
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-head">No.</th>
                <th className="table-head">Tanggal</th>
                <th className="table-head">CV</th>
                <th className="table-head">Nama</th>
                <th className="table-head">Status</th>
                <th className="table-head">Berat</th>
                <th className="table-head">Harga/kg</th>
                <th className="table-head">Total</th>
                <th className="table-head">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center text-ink-500 py-10">
                    Tidak ada transaksi pada rentang ini.
                  </td>
                </tr>
              ) : (
                paginated.map((t, index) => (
                  <tr key={t.id}>
                    <td className="table-cell text-ink-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="table-cell">{formatShortDate(t.date)}</td>
                    <td className="table-cell font-medium">{t.cv || 'Belum dipilih'}</td>
                    <td className="table-cell">{t.name || supplierMap[t.supplierId]?.name || '—'}</td>
                    <td className="table-cell"><PaymentBadge status={t.paymentStatus || 'paid'} onConfirm={() => setPaymentTarget(t)} /></td>
                    <td className="table-cell">{t.weightKg} kg</td>
                    <td className="table-cell">{formatRupiah(t.pricePerKg)}</td>
                    <td className="table-cell font-medium">{formatRupiah(t.total)}</td>
                    <td className="table-cell text-ink-500">{t.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && <Pagination page={page} pages={pageCount} setPage={setPage} />}
      </div>
      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Konfirmasi pembayaran">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-700">Apakah pembelian dari <b>{paymentTarget?.name || supplierMap[paymentTarget?.supplierId]?.name || 'pemasok ini'}</b> sebesar <b>{formatRupiah(paymentTarget?.total)}</b> sudah dibayar?</p>
          <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setPaymentTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={confirmPayment}><CheckCircle2 size={16} /> Sudah dibayar</button></div>
        </div>
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
