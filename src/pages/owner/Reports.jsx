import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Pencil, Save, Trash2, Wallet } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'
import {
  addDays,
  formatRupiah,
  formatShortDate,
  parseDateKey,
  startOfWeek,
  toDateKey,
  todayKey,
} from '../../lib/dateUtils'
import { PAGE_SIZE, Pagination } from './PurchaseDetails'
import StatCard from '../../components/StatCard'

const CVS = ['Sinar Mandiri', 'Jaya Agung']
const parseNumber = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const QUICK_RANGES = ['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', '30 hari terakhir']
const formatCsvDate = (key) => key.split('-').reverse().join('/')
function reportedPricePerKg(record, supplierMap, reportKind) {
  const name = String(record.name || supplierMap[record.supplierId]?.name || '').trim().toLocaleLowerCase('id-ID')
  return Number(record.pricePerKg || 0) + (reportKind === 'brondolan' && name.includes('harmini') ? 10 : 0)
}
function reportedTotal(record, supplierMap, reportKind) {
  const netKg = Number(record.netKg ?? record.weightKg ?? 0)
  return reportKind === 'brondolan' && Number(record.pricePerKg) > 0
    ? Math.round(netKg * reportedPricePerKg(record, supplierMap, reportKind))
    : Number(record.total || 0)
}

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

function downloadCsv(rows, reportKind, range, supplierMap) {
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
      isLoan ? 'Bayar Kas' : t.paymentMethod === 'transfer' ? 'Transfer' : t.paymentMethod === 'personal' ? 'Talangan pribadi' : 'Kas Kebun',
      isLoan ? '—' : t.grossKg ?? t.weightKg ?? 0,
      isLoan ? '—' : t.netKg ?? t.weightKg ?? 0,
      isLoan ? '—' : reportedPricePerKg(t, supplierMap, reportKind),
      isLoan ? t.amount : reportedTotal(t, supplierMap, reportKind),
      isLoan ? '' : t.notaNumber || '',
      (isLoan ? `${t.relatedDate ? `Tanggal terkait ${formatCsvDate(t.relatedDate)} · ` : ''}${t.reason || ''}` : t.note || '').replaceAll(',', ';'),
    ]
  })
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = '\uFEFF' + [header, ...lines].map((row) => row.map(quote).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-${reportKind}-${range[0]}_${range[1]}.csv`
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
      isLoan ? 'Bayar Kas' : t.paymentMethod === 'transfer' ? 'Transfer' : t.paymentMethod === 'personal' ? 'Talangan pribadi' : 'Kas Kebun',
      isLoan ? '—' : `${Number(t.grossKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`,
      isLoan ? '—' : `${Number(t.netKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`,
      isLoan ? '—' : formatRupiah(reportedPricePerKg(t, supplierMap, reportKind)),
      formatRupiah(isLoan ? t.amount : reportedTotal(t, supplierMap, reportKind)),
      isLoan ? `${t.relatedDate ? `Terkait ${formatShortDate(t.relatedDate)} · ` : ''}${t.reason || '—'}` : t.note || '—',
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
  const { pathname } = useLocation()
  const reportKind = pathname.endsWith('/brondolan') ? 'brondolan' : 'buah'
  const { currentUser } = useAuth()
  const { transactions, cashLoans, dailyCash, supplierMap, updateTransaction, editTransaction, editCashLoan, deleteCashLoan, deleteTransaction } = useData()
  const [range, setRange] = useState(() => computeQuickRange('Hari ini'))
  const [activeQuick, setActiveQuick] = useState('Hari ini')
  const [page, setPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [cvFilter, setCvFilter] = useState('all')
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [dailyDetailFilter, setDailyDetailFilter] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editError, setEditError] = useState('')
  const [loanEditTarget, setLoanEditTarget] = useState(null)
  const [loanEditForm, setLoanEditForm] = useState(null)
  const [loanEditError, setLoanEditError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [exportRange, setExportRange] = useState(() => computeQuickRange('Hari ini'))

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.status !== 'voided' && (t.kind || 'buah') === reportKind && t.date >= range[0] && t.date <= range[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (reportKind === 'brondolan' || cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')))
  }, [transactions, reportKind, range, paymentStatus, cvFilter])
  const displayRows = useMemo(() => {
    const purchaseRows = filtered.map((record) => ({ type: 'purchase', record, sortTime: record.time || '00:00' }))
    const loanRows = reportKind === 'brondolan'
      ? cashLoans.filter((loan) => loan.date >= range[0] && loan.date <= range[1]).map((record) => ({ type: 'loan', record, sortTime: record.createdAt?.slice(11, 16) || '00:00' }))
      : []
    return [...purchaseRows, ...loanRows].sort((a, b) => a.record.date.localeCompare(b.record.date) || a.sortTime.localeCompare(b.sortTime))
  }, [filtered, cashLoans, reportKind, range])
  const summary = useMemo(() => {
    const totalWeight = filtered.reduce((s, t) => s + Number(t.netKg ?? t.weightKg ?? 0), 0)
    const totalGrossWeight = filtered.reduce((s, t) => s + Number(t.grossKg ?? t.weightKg ?? 0), 0)
    const totalValue = filtered.reduce((sum, t) => {
      return sum + reportedTotal(t, supplierMap, reportKind)
    }, 0)
    return { totalWeight, totalGrossWeight, totalValue, count: filtered.length }
  }, [filtered, reportKind, supplierMap])

  const dailyClose = useMemo(() => {
    if (reportKind !== 'brondolan' || range[0] !== range[1]) return null
    const date = range[0]
    const records = transactions.filter((t) => t.date === date && t.status !== 'voided' && (t.kind || 'buah') === 'brondolan')
    const pricedRecords = records.map((t) => {
      const netKg = Number(t.netKg ?? t.weightKg ?? 0)
      const price = reportedPricePerKg(t, supplierMap, reportKind)
      return { ...t, reportNetKg: netKg, reportPrice: price, reportTotal: Math.round(netKg * price) }
    })
    const priceCounts = pricedRecords.reduce((counts, t) => counts.set(t.reportPrice, (counts.get(t.reportPrice) || 0) + 1), new Map())
    const purchases = pricedRecords.reduce((result, t) => {
      const total = t.reportTotal
      result.netKg += t.reportNetKg
      if (t.paymentMethod === 'transfer') result.transfer += total
      else if (t.paymentMethod === 'personal') result.personal += total
      else result.cash += total
      const sameRate = priceCounts.get(t.reportPrice) > 1
      const group = sameRate ? result.samePrice : result.differentPrice
      group.netKg += t.reportNetKg
      group.total += total
      group.ids.push(t.id)
      return result
    }, { netKg: 0, cash: 0, transfer: 0, personal: 0, samePrice: { netKg: 0, total: 0, ids: [] }, differentPrice: { netKg: 0, total: 0, ids: [] } })
    const loans = cashLoans.filter((loan) => loan.date === date).reduce((sum, loan) => sum + Number(loan.amount || 0), 0)
    const closure = dailyCash.find((item) => item.date === date)
    return { ...purchases, total: purchases.cash + purchases.transfer, allTotal: purchases.cash + purchases.transfer + purchases.personal, loans, closure }
  }, [reportKind, range, transactions, cashLoans, dailyCash, supplierMap])

  useEffect(() => {
    setDailyDetailFilter(null)
    setPage(1)
  }, [range])

  const detailFilterLabels = {
    weight: 'Semua pembelian brondolan', cash: 'Pembayaran via kas kebun', transfer: 'Pembayaran via transfer',
    personal: 'Pembelian dengan talangan pribadi', loans: 'Pinjaman kas', samePrice: 'Pembelian dengan harga/kg yang sama',
    differentPrice: 'Pembelian dengan harga/kg berbeda', all: 'Semua catatan hari ini',
  }
  const tableRows = useMemo(() => {
    if (!dailyDetailFilter) return displayRows
    if (dailyDetailFilter === 'all' || dailyDetailFilter === 'weight') return dailyDetailFilter === 'weight' ? displayRows.filter((row) => row.type !== 'loan') : displayRows
    if (dailyDetailFilter === 'loans') return displayRows.filter((row) => row.type === 'loan')
    if (['cash', 'transfer', 'personal'].includes(dailyDetailFilter)) return displayRows.filter((row) => row.type === 'purchase' && (row.record.paymentMethod || 'cash') === dailyDetailFilter)
    if (['samePrice', 'differentPrice'].includes(dailyDetailFilter)) {
      const ids = new Set(dailyClose?.[dailyDetailFilter]?.ids || [])
      return displayRows.filter((row) => row.type === 'purchase' && ids.has(row.record.id))
    }
    return displayRows
  }, [displayRows, dailyDetailFilter, dailyClose])
  const pageCount = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE))
  const paginated = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function selectDailyDetail(filter) {
    setDailyDetailFilter((current) => current === filter ? null : filter)
    setPage(1)
  }

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

  function openLoanEdit(loan) {
    setLoanEditTarget(loan)
    setLoanEditForm({ date: loan.date, name: loan.name || '', amount: String(loan.amount ?? ''), reason: loan.reason || '' })
    setLoanEditError('')
  }

  function saveLoanEdit(event) {
    event.preventDefault()
    const result = editCashLoan(loanEditTarget.id, loanEditForm, currentUser.id)
    if (!result?.ok) return setLoanEditError(result?.message || 'Perubahan pinjaman gagal disimpan.')
    setLoanEditTarget(null)
    setLoanEditForm(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const result = deleteTarget.type === 'loan'
      ? deleteCashLoan(deleteTarget.record.id, currentUser.id)
      : deleteTransaction(deleteTarget.record.id, currentUser.id)
    if (!result?.ok) return setDeleteError(result?.message || 'Data gagal dihapus.')
    setDeleteTarget(null)
    setDeleteError('')
  }

  function downloadSelectedExport() {
    const selectedRange = exportRange
    if (!selectedRange[0] || !selectedRange[1] || selectedRange[0] > selectedRange[1]) return
    const purchaseRows = transactions
      .filter((t) => t.status !== 'voided' && (t.kind || 'buah') === reportKind && t.date >= selectedRange[0] && t.date <= selectedRange[1] && (paymentStatus === 'all' || (t.paymentStatus || 'paid') === paymentStatus) && (reportKind === 'brondolan' || cvFilter === 'all' || (cvFilter === 'unassigned' ? !t.cv : t.cv === cvFilter)))
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')))
      .map((record) => ({ type: 'purchase', record }))
    const loanRows = reportKind === 'brondolan'
      ? cashLoans.filter((loan) => loan.date >= selectedRange[0] && loan.date <= selectedRange[1]).map((record) => ({ type: 'loan', record }))
      : []
    const rows = [...purchaseRows, ...loanRows].sort((a, b) => a.record.date.localeCompare(b.record.date) || String(a.record.createdAt || a.record.time || '').localeCompare(String(b.record.createdAt || b.record.time || '')))
    if (exportFormat === 'csv') downloadCsv(rows, reportKind, selectedRange, supplierMap)
    else downloadPdf(rows, supplierMap, selectedRange, reportKind)
    setShowExportOptions(false)
  }

  function selectQuickRange(label) {
    setActiveQuick(label)
    setRange(computeQuickRange(label))
    setPage(1)
  }

  function shiftReportDay(amount) {
    const current = range[0] === range[1] ? range[0] : range[1]
    const next = toDateKey(addDays(parseDateKey(current), amount))
    setRange([next, next])
    setActiveQuick(next === todayKey() ? 'Hari ini' : null)
    setPage(1)
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
          <button className="btn-primary" onClick={() => { setExportRange(range); setShowExportOptions(true) }}>
            <Download size={16} /> Unduh laporan
          </button>
        </div>
      </div>

      <div className="card p-5 mb-6">
        {reportKind === 'brondolan' && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-plantation-900/10 bg-plantation-50/60 p-3">
          <div><p className="text-xs font-medium text-ink-500">Lihat laporan per hari</p><p className="mt-0.5 font-display text-base text-plantation-950">{range[0] === range[1] ? formatShortDate(range[0]) : `${formatShortDate(range[0])} — ${formatShortDate(range[1])}`}</p></div>
          <div className="flex items-center gap-2"><button type="button" className="btn-ghost !rounded-full !px-3 !py-2" onClick={() => shiftReportDay(-1)} aria-label="Hari sebelumnya"><ChevronLeft size={18} /><span className="hidden sm:inline">Hari sebelumnya</span></button><button type="button" className="btn-ghost !rounded-full !px-3 !py-2" onClick={() => selectQuickRange('Hari ini')}>Hari ini</button><button type="button" className="btn-ghost !rounded-full !px-3 !py-2" onClick={() => shiftReportDay(1)} aria-label="Hari berikutnya"><span className="hidden sm:inline">Hari berikutnya</span><ChevronRight size={18} /></button></div>
        </div>}
        <div className="mb-4 flex flex-wrap gap-2">
          {(reportKind === 'brondolan' ? ['Hari ini'] : QUICK_RANGES).map((label) => (
            <button
              key={label}
              onClick={() => selectQuickRange(label)}
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

        <div className={`grid grid-cols-1 items-end gap-3 sm:grid-cols-2 ${reportKind === 'brondolan' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
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

      {dailyClose && <section className="mb-6 overflow-hidden rounded-2xl border border-plantation-900/10 bg-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-900/8 bg-gradient-to-r from-plantation-50 to-white px-5 py-4">
          <div className="flex items-start gap-3"><span className="cash-summary-icon"><Wallet size={17} /></span><div><h2 className="font-display text-lg text-plantation-950">Rekap harian brondolan</h2><p className="mt-0.5 text-xs text-ink-500">Perhitungan memakai berat bersih × harga/kg pada setiap catatan. Harmini dihitung dengan tambahan Rp10/kg.</p><p className="mt-1 text-[11px] text-ink-500">Pilih kartu untuk melihat catatan pembentuk nilainya di tabel bawah. Harga/kg sama berarti dipakai oleh lebih dari satu catatan.</p></div></div>
          {dailyClose.closure?.status === 'locked' ? <span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-semibold text-plantation-800">Kas ditutup</span> : <span className="rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-700">Kas belum ditutup</span>}
        </div>
        <div className="grid gap-px bg-ink-900/8 sm:grid-cols-2 lg:grid-cols-3">
          <CloseMetric label="Total berat bersih" value={`${dailyClose.netKg.toLocaleString('id-ID')} kg`} hint="Semua catatan pembelian" active={dailyDetailFilter === 'weight'} onClick={() => selectDailyDetail('weight')} />
          <CloseMetric label="Pembayaran via kas kebun" value={formatRupiah(dailyClose.cash)} tone="green" hint="Klik untuk melihat catatan kas" active={dailyDetailFilter === 'cash'} onClick={() => selectDailyDetail('cash')} />
          <CloseMetric label="Pembayaran via transfer" value={formatRupiah(dailyClose.transfer)} tone="blue" hint="Klik untuk melihat catatan transfer" active={dailyDetailFilter === 'transfer'} onClick={() => selectDailyDetail('transfer')} />
          {dailyClose.personal > 0 && <CloseMetric label="Talangan pribadi" value={formatRupiah(dailyClose.personal)} hint="Klik untuk melihat catatan talangan" active={dailyDetailFilter === 'personal'} onClick={() => selectDailyDetail('personal')} />}
          <CloseMetric label="Berat bersih × harga/kg sama" value={formatRupiah(dailyClose.samePrice.total)} tone="gold" hint={`${dailyClose.samePrice.netKg.toLocaleString('id-ID')} kg · ${dailyClose.samePrice.ids.length} catatan dengan harga/kg berulang`} active={dailyDetailFilter === 'samePrice'} onClick={() => selectDailyDetail('samePrice')} />
          <CloseMetric label="Berat bersih × harga/kg berbeda" value={formatRupiah(dailyClose.differentPrice.total)} tone="gold" hint={`${dailyClose.differentPrice.netKg.toLocaleString('id-ID')} kg · ${dailyClose.differentPrice.ids.length} catatan dengan harga/kg unik`} active={dailyDetailFilter === 'differentPrice'} onClick={() => selectDailyDetail('differentPrice')} />
          <CloseMetric label="Pinjaman kas (dipisah)" value={formatRupiah(dailyClose.loans)} tone="gold" hint="Klik untuk melihat catatan pinjaman" active={dailyDetailFilter === 'loans'} onClick={() => selectDailyDetail('loans')} />
        </div>
        <div className="grid gap-3 border-t border-ink-900/8 bg-paper-50/70 p-4 sm:grid-cols-3">
          <CloseBalance label="Sisa menurut sistem" value={dailyClose.closure?.systemCashAtClose} onClick={() => selectDailyDetail('all')} active={dailyDetailFilter === 'all'} />
          <CloseBalance label="Uang fisik dihitung admin" value={dailyClose.closure?.countedCash} onClick={() => selectDailyDetail('all')} active={dailyDetailFilter === 'all'} />
          <CloseBalance label="Selisih kas admin" value={dailyClose.closure?.cashDifference} difference onClick={() => selectDailyDetail('all')} active={dailyDetailFilter === 'all'} />
        </div>
        {dailyClose.closure?.status === 'locked' && dailyClose.closure?.countedCash === undefined && <p className="px-5 pb-4 text-xs text-ink-500">Kas ini ditutup sebelum pencatatan jumlah uang fisik tersedia.</p>}
      </section>}

      <div className="card overflow-hidden">
        {dailyDetailFilter && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/8 bg-plantation-50/70 px-5 py-3"><div><p className="text-sm font-semibold text-plantation-950">{detailFilterLabels[dailyDetailFilter]}</p><p className="mt-0.5 text-xs text-ink-500">{tableRows.length} catatan masuk ke perhitungan kartu ini.</p></div><button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => { setDailyDetailFilter(null); setPage(1) }}>Tampilkan semua</button></div>}
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
              {tableRows.length === 0 ? (
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
                    <td className="table-cell">{type === 'loan' ? 'Bayar Kas' : t.paymentMethod === 'transfer' ? 'Transfer' : t.paymentMethod === 'personal' ? 'Talangan pribadi' : 'Kas Kebun'}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : `${Number(t.grossKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : `${Number(t.netKg ?? t.weightKg ?? 0).toLocaleString('id-ID')} kg`}</td>
                    <td className="table-cell">{type === 'loan' ? '—' : formatRupiah(reportedPricePerKg(t, supplierMap, reportKind))}</td>
                    <td className={`table-cell font-medium ${type === 'loan' ? 'text-gold-700' : ''}`}>{type === 'loan' && <span className="mb-1 block text-xs font-normal text-ink-500">Total pinjaman</span>}{formatRupiah(type === 'loan' ? t.amount : reportedTotal(t, supplierMap, reportKind))}</td>
                    <td className="table-cell text-ink-500">{type === 'loan' ? <>{t.relatedDate && <span className="mb-1 block text-xs">Tanggal terkait: {formatShortDate(t.relatedDate)}</span>}{t.reason || '—'}</> : t.note || '—'}</td>
                    {currentUser?.role === 'owner' && <td className="table-cell"><div className="flex items-center gap-1">{type === 'loan' ? <button type="button" onClick={() => openLoanEdit(t)} className="rounded-md p-2 text-ink-500 transition hover:bg-plantation-700/10 hover:text-plantation-800" title="Edit pinjaman" aria-label={`Edit pinjaman ${t.name || ''}`}><Pencil size={16} /></button> : <button type="button" onClick={() => openEdit(t)} className="rounded-md p-2 text-ink-500 transition hover:bg-plantation-700/10 hover:text-plantation-800" title="Edit catatan" aria-label={`Edit catatan ${t.name || 'transaksi'}`}><Pencil size={16} /></button>}<button type="button" onClick={() => { setDeleteTarget({ type, record: t }); setDeleteError('') }} className="rounded-md p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700" title={type === 'loan' ? 'Hapus pinjaman kas' : 'Hapus pembelian'} aria-label={`Hapus ${type === 'loan' ? 'pinjaman' : 'pembelian'} ${t.name || ''}`}><Trash2 size={16} /></button></div></td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {tableRows.length > PAGE_SIZE && <Pagination page={page} pages={pageCount} setPage={setPage} />}
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
            <Field label="Metode pembayaran"><select className="input" value={editForm.paymentMethod} onChange={(event) => setEditForm({ ...editForm, paymentMethod: event.target.value })}><option value="cash">Kas Kebun</option><option value="transfer">Transfer</option><option value="personal">Talangan pribadi</option></select></Field>
            <Field label="Berat kotor (kg)"><input type="number" min="0" step="0.01" className="input" value={editForm.grossKg} onChange={(event) => setEditForm({ ...editForm, grossKg: event.target.value })} /></Field>
            <Field label="Berat bersih (kg)"><input type="number" min="0" step="0.01" className="input" value={editForm.netKg} onChange={(event) => setEditForm({ ...editForm, netKg: event.target.value })} /></Field>
            <Field label="Harga per kg bersih (Rp)"><input type="number" min="0" step="1" className="input" value={editForm.pricePerKg} onChange={(event) => setEditForm({ ...editForm, pricePerKg: event.target.value })} /></Field>
            <Field label="Catatan"><input className="input" value={editForm.note} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} /></Field>
          </div>
          {editError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
          <div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => { setEditTarget(null); setEditForm(null); setEditError('') }}>Batal</button><button type="submit" className="btn-primary"><Save size={16} /> Simpan perubahan</button></div>
        </form>}
      </Modal>
      <Modal open={!!loanEditTarget} onClose={() => { setLoanEditTarget(null); setLoanEditForm(null); setLoanEditError('') }} title="Edit pinjaman kas">
        {loanEditForm && <form onSubmit={saveLoanEdit} className="space-y-4"><p className="text-sm text-ink-600">Perubahan pinjaman akan langsung tersimpan dan memperbarui saldo kas pada tanggal terkait.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal kas dipotong"><input type="date" className="input" value={loanEditForm.date} onChange={(event) => setLoanEditForm({ ...loanEditForm, date: event.target.value })} /></Field><Field label="Nama peminjam"><input className="input" value={loanEditForm.name} onChange={(event) => setLoanEditForm({ ...loanEditForm, name: event.target.value })} /></Field><Field label="Nominal (Rp)"><input type="number" min="1" step="1" className="input" value={loanEditForm.amount} onChange={(event) => setLoanEditForm({ ...loanEditForm, amount: event.target.value })} /></Field><Field label="Alasan / catatan"><input className="input" value={loanEditForm.reason} onChange={(event) => setLoanEditForm({ ...loanEditForm, reason: event.target.value })} /></Field></div>{loanEditError && <p role="alert" className="text-sm text-red-700">{loanEditError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setLoanEditTarget(null)}>Batal</button><button type="submit" className="btn-primary"><Save size={16} /> Simpan</button></div></form>}
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteError('') }} title={deleteTarget?.type === 'loan' ? 'Hapus pinjaman kas' : 'Hapus catatan pembelian'}>
        {deleteTarget && <div className="space-y-4"><p className="text-sm leading-relaxed text-ink-700">Yakin menghapus {deleteTarget.type === 'loan' ? 'pinjaman kas' : 'catatan pembelian'} <b>{deleteTarget.record.name || 'ini'}</b> tanggal <b>{formatShortDate(deleteTarget.record.date)}</b>? {deleteTarget.type === 'loan' ? 'Saldo kas akan dihitung ulang.' : 'Catatan akan dibatalkan dan tidak ditampilkan di laporan.'}</p>{deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setDeleteTarget(null)}>Batal</button><button type="button" className="btn-danger" onClick={confirmDelete}><Trash2 size={16} /> Hapus</button></div></div>}
      </Modal>
      <Modal open={showExportOptions} onClose={() => setShowExportOptions(false)} title="Unduh laporan">
        <div className="space-y-5">
          <p className="text-sm text-ink-600">Pilih tanggal awal dan akhir untuk menentukan isi file yang diunduh.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dari tanggal"><input type="date" className="input" value={exportRange[0]} max={exportRange[1]} onChange={(event) => setExportRange([event.target.value, exportRange[1]])} /></Field>
            <Field label="Sampai tanggal"><input type="date" className="input" value={exportRange[1]} min={exportRange[0]} onChange={(event) => setExportRange([exportRange[0], event.target.value])} /></Field>
          </div>
          <div><span className="label">Format file</span><div className="grid grid-cols-2 gap-2"><button type="button" className={exportFormat === 'pdf' ? 'btn-primary' : 'btn-ghost'} onClick={() => setExportFormat('pdf')}>PDF</button><button type="button" className={exportFormat === 'csv' ? 'btn-primary' : 'btn-ghost'} onClick={() => setExportFormat('csv')}>CSV</button></div></div>
          <p className="text-xs text-ink-500">Data pinjaman kas juga disertakan untuk laporan brondolan.</p>
          <button type="button" disabled={!exportRange[0] || !exportRange[1] || exportRange[0] > exportRange[1]} className="btn-primary w-full" onClick={downloadSelectedExport}><Download size={16} /> Unduh {exportFormat.toUpperCase()}</button>
        </div>
      </Modal>
    </div>
  )
}

function PaymentBadge({ status, onConfirm }) { return status === 'unpaid' ? <button type="button" onClick={onConfirm} className="rounded-full bg-gold-400/15 px-2 py-1 text-xs font-medium text-gold-600 transition hover:bg-gold-400/30" title="Klik untuk konfirmasi pembayaran">Belum bayar</button> : <span className="rounded-full bg-plantation-700/10 px-2 py-1 text-xs font-medium text-plantation-700">Sudah bayar</span> }
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function CloseMetric({ label, value, tone = '', hint, active = false, onClick }) {
  const toneClass = tone === 'green' ? 'text-plantation-800' : tone === 'blue' ? 'text-sky-800' : tone === 'gold' ? 'text-gold-700' : 'text-ink-900'
  return <button type="button" onClick={onClick} aria-pressed={active} className={`group min-h-28 bg-white px-5 py-4 text-left transition-colors hover:bg-plantation-50/60 focus-visible:relative focus-visible:z-10 ${active ? 'bg-plantation-50 ring-2 ring-inset ring-plantation-700/30' : ''}`}><span className="block text-xs text-ink-500">{label}</span><span className={`mt-1 block font-display text-xl ${toneClass}`}>{value}</span>{hint && <span className="mt-1.5 block text-[11px] leading-snug text-ink-500 group-hover:text-plantation-800">{hint}</span>}</button>
}
function CloseBalance({ label, value, difference = false, onClick, active = false }) {
  const known = value !== undefined && value !== null
  const numeric = Number(value || 0)
  const text = !known ? 'Belum dicatat' : `${difference && numeric > 0 ? '+' : ''}${formatRupiah(numeric)}`
  const color = !known ? 'text-ink-500' : difference && numeric < 0 ? 'text-red-700' : difference && numeric > 0 ? 'text-plantation-800' : 'text-ink-900'
  return <button type="button" onClick={onClick} aria-pressed={active} className={`w-full rounded-xl border bg-white px-4 py-3 text-left transition-colors hover:border-plantation-700/25 hover:bg-plantation-50/50 ${active ? 'border-plantation-700/30 ring-2 ring-plantation-700/15' : 'border-ink-900/8'}`}><span className="block text-xs text-ink-500">{label}</span><span className={`mt-1 block text-sm font-semibold ${color}`}>{text}</span>{difference && known && numeric !== 0 && <span className="mt-0.5 block text-[11px] text-ink-500">{numeric > 0 ? 'Uang fisik lebih' : 'Uang fisik kurang'} dari saldo sistem</span>}</button>
}
