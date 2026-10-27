import React, { useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Download, Droplets, Eye, FileSpreadsheet, FileText, Pencil, Plus, Scale, Trash2, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, todayKey } from '../../lib/dateUtils'
import { formatKgInput, parseKgInput } from '../../lib/kgUtils'
import { formatRupiahInput, parseRupiahInput } from '../../lib/currencyInput'
import Modal from '../../components/Modal'

const blankForm = () => ({ name: '', date: todayKey(), bags: [''], pricePerKg: '' })
const kg = (value) => `${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`
const bagWeight = (bags) => bags.reduce((total, value) => total + parseKgInput(value), 0)
const calculate = (weight, price) => {
  const payableWeight = Math.floor(weight * 0.9 + 0.5)
  const total = payableWeight * price
  return { payableWeight, deduction: weight - payableWeight, total, half: Math.round(total / 2) }
}
const shiftDate = (date, amount) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + amount)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
const factorySaleDate = (sale) => {
  const raw = String(sale?.date || sale?.tanggal || sale?.createdAt || '').trim()
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDate) return isoDate[1]
  const localDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  return localDate ? `${localDate[3]}-${String(localDate[2]).padStart(2, '0')}-${String(localDate[1]).padStart(2, '0')}` : ''
}

const saleExpenseAmount = (sale) => Number.isFinite(Number(sale.expenseTotal))
  ? Number(sale.expenseTotal)
  : (sale.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
const saleGrossAmount = (sale) => Number.isFinite(Number(sale.grossAmount))
  ? Number(sale.grossAmount)
  : Number(sale.weightKg || 0) * Number(sale.pricePerKg || 0)
const saleNetAmount = (sale) => Number.isFinite(Number(sale.netAmount))
  ? Number(sale.netAmount)
  : saleGrossAmount(sale) - saleExpenseAmount(sale)

function exportCsv(records, factorySales, range) {
  const bagCount = Math.max(0, ...records.map((record) => record.bags.length))
  const purchaseHeaders = ['Tanggal', 'Nama', ...Array.from({ length: bagCount }, (_, index) => `Berat karung ${index + 1} (kg)`), 'Jumlah karung', 'Berat total (kg)', 'Potongan 10% (kg)', 'Berat bersih (kg)', 'Harga per kg (Rp)', 'Total pembelian (Rp)', 'Bagian setengah (Rp)']
  const purchaseRows = records.map((record) => [record.date, record.name, ...Array.from({ length: bagCount }, (_, index) => record.bags[index] ?? ''), record.bags.length, record.totalWeightKg, record.deductionKg, record.payableWeightKg, record.pricePerKg, record.totalAmount, record.splitAmount])
  const saleHeaders = ['Tanggal', 'Berat di pabrik (kg)', 'Harga jual/kg (Rp)', 'Penjualan kotor (Rp)', 'Rincian pengeluaran', 'Total pengeluaran (Rp)', 'Hasil bersih pabrik (Rp)']
  const saleRows = factorySales.map((sale) => [factorySaleDate(sale), sale.weightKg, sale.pricePerKg, saleGrossAmount(sale), (sale.expenses || []).map((item) => `${item.description}: ${formatRupiah(item.amount)}`).join(' | ') || '—', saleExpenseAmount(sale), saleNetAmount(sale)])
  const expenseHeaders = ['Tanggal', 'ID penjualan', 'Nama pengeluaran', 'Nominal (Rp)']
  const expenseRows = factorySales.flatMap((sale) => (sale.expenses || []).map((item) => [factorySaleDate(sale), sale.id, item.description, item.amount]))
  const totalPurchases = records.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0)
  const totalGross = factorySales.reduce((sum, sale) => sum + saleGrossAmount(sale), 0)
  const totalExpenses = factorySales.reduce((sum, sale) => sum + saleExpenseAmount(sale), 0)
  const totalNet = factorySales.reduce((sum, sale) => sum + saleNetAmount(sale), 0)
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csvRows = [
    ['LAPORAN GETAH', `${formatShortDate(range[0])} - ${formatShortDate(range[1])}`],
    [], ['RINGKASAN'],
    ['Pembelian getah', totalPurchases],
    ['Penjualan pabrik kotor', totalGross],
    ['Total pengeluaran pabrik', totalExpenses],
    ['Hasil bersih pabrik', totalNet],
    [], ['PEMBELIAN GETAH'], purchaseHeaders, ...purchaseRows,
    ['TOTAL PEMBELIAN', '', ...Array(bagCount).fill(''), '', records.reduce((sum, record) => sum + Number(record.totalWeightKg || 0), 0), '', records.reduce((sum, record) => sum + Number(record.payableWeightKg || 0), 0), '', totalPurchases, records.reduce((sum, record) => sum + Number(record.splitAmount || 0), 0)],
    [], ['PENJUALAN GETAH DI PABRIK'], saleHeaders, ...saleRows,
    ['TOTAL PENJUALAN PABRIK', '', '', totalGross, '', totalExpenses, totalNet],
    [], ['RINCIAN PENGELUARAN PABRIK'], expenseHeaders, ...expenseRows,
    ['TOTAL PENGELUARAN', '', '', totalExpenses],
  ]
  const contents = '\uFEFF' + csvRows.map((row) => row.map(quote).join(';')).join('\r\n')
  const link = document.createElement('a')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }))
  link.href = url
  link.download = `laporan-getah-${range[0]}_${range[1]}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportPdf(records, factorySales, range) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const totalWeight = records.reduce((sum, record) => sum + Number(record.totalWeightKg || 0), 0)
  const totalNetWeight = records.reduce((sum, record) => sum + Number(record.payableWeightKg || 0), 0)
  const totalHalf = records.reduce((sum, record) => sum + Number(record.splitAmount || 0), 0)
  const totalPurchases = records.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0)
  const totalGross = factorySales.reduce((sum, sale) => sum + saleGrossAmount(sale), 0)
  const totalExpenses = factorySales.reduce((sum, sale) => sum + saleExpenseAmount(sale), 0)
  const totalFactoryNet = factorySales.reduce((sum, sale) => sum + saleNetAmount(sale), 0)
  const width = pdf.internal.pageSize.getWidth()
  pdf.setFillColor(22, 48, 42)
  pdf.roundedRect(12, 11, width - 24, 38, 4, 4, 'F')
  pdf.setFillColor(227, 177, 85)
  pdf.roundedRect(12, 11, 3, 38, 1.5, 1.5, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.text('LAPORAN GETAH · PEMBELIAN & PABRIK', 21, 23)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(220, 233, 225)
  pdf.text(`${formatShortDate(range[0])} — ${formatShortDate(range[1])}  ·  ${records.length} pembelian  ·  ${factorySales.length} penjualan pabrik`, 21, 33)
  autoTable(pdf, {
    startY: 54,
    body: [
      ['Total pembelian', formatRupiah(totalPurchases), 'Penjualan pabrik', formatRupiah(totalGross)],
      ['Pengeluaran pabrik', `− ${formatRupiah(totalExpenses)}`, 'Hasil bersih pabrik', formatRupiah(totalFactoryNet)],
      ['Berat kotor · bersih', `${kg(totalWeight)} · ${kg(totalNetWeight)}`, 'Bagian ½', formatRupiah(totalHalf)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.6, textColor: [31, 42, 36], lineColor: [225, 228, 222], fillColor: [251, 248, 242] },
    columnStyles: { 0: { cellWidth: 44, fontStyle: 'normal', textColor: [100, 112, 104] }, 1: { cellWidth: 88, fontStyle: 'bold' }, 2: { cellWidth: 44, fontStyle: 'normal', textColor: [100, 112, 104] }, 3: { cellWidth: 85, fontStyle: 'bold' } },
    margin: { left: 12, right: 12 },
  })
  let sectionY = pdf.lastAutoTable.finalY + 9
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('PEMBELIAN GETAH', 14, sectionY)
  autoTable(pdf, {
    startY: sectionY + 4,
    head: [['Tanggal', 'Nama', 'Rincian berat karung', 'Berat total', 'Potongan 10%', 'Berat bersih', 'Harga/kg', 'Total hasil', 'Bagian ½']],
    body: records.length ? records.map((record) => [
      formatShortDate(record.date),
      record.name,
      record.bags.map((weight, index) => `${index + 1}: ${kg(weight)}`).join(' · '),
      kg(record.totalWeightKg),
      kg(record.deductionKg),
      kg(record.payableWeightKg),
      formatRupiah(record.pricePerKg),
      formatRupiah(record.totalAmount),
      formatRupiah(record.splitAmount),
    ]) : [['—', 'Tidak ada pembelian getah dalam rentang tanggal ini', '—', '—', '—', '—', '—', '—', '—']],
    foot: [['TOTAL', `${records.length} catatan`, '', kg(totalWeight), '', kg(totalNetWeight), '', '', formatRupiah(totalHalf)]],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak', textColor: [31, 42, 36], lineColor: [225, 228, 222] },
    headStyles: { fillColor: [42, 82, 69], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [245, 239, 227], textColor: [22, 48, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [251, 248, 242] },
    columnStyles: { 2: { cellWidth: 47 }, 1: { cellWidth: 28 } },
    margin: { left: 12, right: 12 },
  })
  let nextY = pdf.lastAutoTable.finalY + 10
  if (nextY > pdf.internal.pageSize.getHeight() - 35) { pdf.addPage(); nextY = 18 }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('PENJUALAN GETAH DI PABRIK', 14, nextY)
  autoTable(pdf, {
    startY: nextY + 4,
    head: [['Tanggal', 'Berat', 'Harga/kg', 'Penjualan kotor', 'Rincian pengeluaran', 'Total pengeluaran', 'Hasil bersih']],
    body: factorySales.length ? factorySales.map((sale) => [
      formatShortDate(factorySaleDate(sale)), kg(sale.weightKg), formatRupiah(sale.pricePerKg), formatRupiah(saleGrossAmount(sale)),
      (sale.expenses || []).map((item) => `${item.description}: ${formatRupiah(item.amount)}`).join(' · ') || '—',
      formatRupiah(saleExpenseAmount(sale)), formatRupiah(saleNetAmount(sale)),
    ]) : [['—', '—', '—', '—', 'Tidak ada penjualan pabrik dalam rentang tanggal ini', '—', '—']],
    foot: [['TOTAL', `${factorySales.length} catatan`, '', formatRupiah(totalGross), '', formatRupiah(totalExpenses), formatRupiah(totalFactoryNet)]],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak', textColor: [31, 42, 36], lineColor: [225, 228, 222] },
    headStyles: { fillColor: [42, 82, 69], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [245, 239, 227], textColor: [22, 48, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [251, 248, 242] },
    columnStyles: { 4: { cellWidth: 58 } },
    margin: { left: 12, right: 12 },
  })
  nextY = pdf.lastAutoTable.finalY + 12
  const expenseRows = factorySales.flatMap((sale) => (sale.expenses || []).map((item) => [formatShortDate(factorySaleDate(sale)), item.description, formatRupiah(item.amount)]))
  if (expenseRows.length) {
    if (nextY > pdf.internal.pageSize.getHeight() - 35) { pdf.addPage(); nextY = 18 }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('RINCIAN PENGELUARAN PABRIK', 14, nextY)
    autoTable(pdf, {
      startY: nextY + 4,
      head: [['Tanggal', 'Keperluan', 'Nominal']],
      body: expenseRows,
      foot: [['TOTAL PENGELUARAN', '', formatRupiah(totalExpenses)]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [31, 42, 36], lineColor: [225, 228, 222] },
      headStyles: { fillColor: [42, 82, 69], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [245, 239, 227], textColor: [22, 48, 42], fontStyle: 'bold' },
      margin: { left: 12, right: 12 },
    })
  }
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(115, 128, 119)
    pdf.text('Kebun Kas · Rekap hasil getah', 12, pdf.internal.pageSize.getHeight() - 7)
    pdf.text(`${page} / ${pages}`, width - 12, pdf.internal.pageSize.getHeight() - 7, { align: 'right' })
  }
  pdf.save(`laporan-getah-${range[0]}_${range[1]}.pdf`)
}

export default function Rubber() {
  const { rubberRecords, addRubberRecord, updateRubberRecord, deleteRubberRecord, rubberFactorySales, addRubberFactorySale, deleteRubberFactorySale } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [formError, setFormError] = useState('')
  const [viewRecord, setViewRecord] = useState(null)
  const [notice, setNotice] = useState('')
  const [factoryForm, setFactoryForm] = useState({ date: todayKey(), weightKg: '', pricePerKg: '', expenses: [] })
  const [factoryError, setFactoryError] = useState('')
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedFactoryDate, setSelectedFactoryDate] = useState(today)
  const [downloadRange, setDownloadRange] = useState([`${today.slice(0, 7)}-01`, today])

  const records = useMemo(() => [...rubberRecords].sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))), [rubberRecords])
  const totalWeight = records.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0)
  const totalNetWeight = records.reduce((sum, item) => sum + Number(item.payableWeightKg || 0), 0)
  const totalHalf = records.reduce((sum, item) => sum + Number(item.splitAmount || 0), 0)
  const todayRecords = records.filter((item) => item.date === todayKey())
  const dailyRecords = records.filter((item) => item.date === selectedDate)
  const factorySaleDates = [...new Set(rubberFactorySales.map(factorySaleDate).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  const dailyFactorySales = rubberFactorySales.filter((sale) => factorySaleDate(sale) === selectedFactoryDate).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  const dailyWeight = dailyRecords.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0)
  const dailyNetWeight = dailyRecords.reduce((sum, item) => sum + Number(item.payableWeightKg || 0), 0)
  const dailyTotal = dailyRecords.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  const dailyHalf = dailyRecords.reduce((sum, item) => sum + Number(item.splitAmount || 0), 0)
  const factoryDayGross = dailyFactorySales.reduce((sum, sale) => sum + Number(sale.grossAmount || 0), 0)
  const factoryDayExpenses = dailyFactorySales.reduce((sum, sale) => sum + Number(sale.expenseTotal || 0), 0)
  const factoryDayNet = dailyFactorySales.reduce((sum, sale) => sum + Number(sale.netAmount || 0), 0)
  const previewWeight = bagWeight(form.bags)
  const preview = calculate(previewWeight, parseRupiahInput(form.pricePerKg))
  const exportRecords = records.filter((record) => record.date >= downloadRange[0] && record.date <= downloadRange[1])
  const exportFactorySales = rubberFactorySales.filter((sale) => {
    const date = factorySaleDate(sale)
    return date && date >= downloadRange[0] && date <= downloadRange[1]
  })
  const exportPurchaseTotal = exportRecords.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  const exportFactoryGross = exportFactorySales.reduce((sum, sale) => sum + saleGrossAmount(sale), 0)
  const exportAvailable = exportRecords.length > 0 || exportFactorySales.length > 0
  const factoryGross = parseKgInput(factoryForm.weightKg) * parseRupiahInput(factoryForm.pricePerKg)
  const factoryExpenseTotal = factoryForm.expenses.reduce((sum, item) => sum + parseRupiahInput(item.amount), 0)

  function saveFactorySale(event) {
    event.preventDefault()
    const result = addRubberFactorySale(factoryForm)
    if (!result.ok) return setFactoryError(result.message)
    setSelectedFactoryDate(factoryForm.date)
    setFactoryError('')
    setFactoryForm({ date: todayKey(), weightKg: '', pricePerKg: '', expenses: [] })
    setNotice('Penjualan pabrik berhasil disimpan.')
  }

  function openCreate() {
    setEditingId(null)
    setForm(blankForm())
    setFormError('')
    setNotice('')
    setFormOpen(true)
  }

  function openEdit(record) {
    setEditingId(record.id)
    setForm({ name: record.name, date: record.date, bags: record.bags.map((value) => formatKgInput(String(value).replace('.', ','))), pricePerKg: formatRupiahInput(record.pricePerKg) })
    setFormError('')
    setNotice('')
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function save(event) {
    event.preventDefault()
    setFormError('')
    const result = editingId ? updateRubberRecord(editingId, form) : addRubberRecord(form)
    if (!result.ok) return setFormError(result.message)
    setFormOpen(false)
    setForm(blankForm())
    setEditingId(null)
    setNotice(editingId ? 'Catatan getah berhasil diperbarui.' : 'Catatan getah berhasil disimpan.')
  }

  function remove(record) {
    if (!window.confirm(`Hapus catatan getah ${record.name} tanggal ${formatShortDate(record.date)}?`)) return
    const result = deleteRubberRecord(record.id)
    if (!result.ok) return setNotice(result.message)
    if (viewRecord?.id === record.id) setViewRecord(null)
    setNotice('Catatan getah berhasil dihapus.')
  }

  function setBag(index, value) {
    setForm((current) => ({ ...current, bags: current.bags.map((bag, bagIndex) => bagIndex === index ? formatKgInput(value) : bag) }))
  }

  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Owner workspace</p>
        <h1 className="mt-1 font-display text-3xl text-plantation-950">Getah</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">Catat berat tiap karung, potongan 10%, harga, dan pembagian hasil dengan hitungan otomatis.</p>
      </div>
      {!formOpen && <button type="button" className="btn-primary" onClick={openCreate}><Plus size={17} /> Catat getah</button>}
    </header>

    {notice && <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-plantation-700/15 bg-plantation-700/5 px-4 py-3 text-sm text-plantation-900"><span className="flex items-center gap-2"><Check size={16} />{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Tutup pemberitahuan"><X size={16} /></button></div>}

    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard icon={<Droplets size={18} />} label="Jumlah catatan" value={records.length.toLocaleString('id-ID')} detail="Semua catatan getah" />
      <SummaryCard icon={<Scale size={18} />} label="Berat total" value={kg(totalWeight)} detail="Akumulasi semua karung" />
      <SummaryCard icon={<Scale size={18} />} label="Berat bersih" value={kg(totalNetWeight)} detail="Sesudah potongan dan pembulatan" />
      <SummaryCard icon={<CalendarDays size={18} />} label="Catatan hari ini" value={todayRecords.length.toLocaleString('id-ID')} detail={kg(todayRecords.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0))} />
      <SummaryCard icon={<CircleDollarSign size={18} />} label="Bagian ½ hasil" value={formatRupiah(totalHalf)} detail="Akumulasi semua catatan" accent />
    </section>

    <section className="card mb-6 overflow-hidden">
      <div className="border-b border-ink-900/8 px-5 py-4 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600"><CircleDollarSign size={18} /></span><div><h2 className="font-display text-lg text-plantation-950">Penjualan getah di pabrik</h2><p className="mt-1 text-xs text-ink-500">Masukkan berat dan harga; pengeluaran lain otomatis mengurangi hasil penjualan.</p></div></div></div>
      <form onSubmit={saveFactorySale} className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tanggal"><input type="date" className="input" value={factoryForm.date} onChange={(e) => setFactoryForm({ ...factoryForm, date: e.target.value })} required /></Field>
          <Field label="Total berat di pabrik (kg)"><input inputMode="decimal" className="input" value={factoryForm.weightKg} onChange={(e) => setFactoryForm({ ...factoryForm, weightKg: formatKgInput(e.target.value) })} placeholder="Contoh: 1.250" required /></Field>
          <Field label="Harga jual per kg (Rp)"><input inputMode="numeric" className="input" value={factoryForm.pricePerKg} onChange={(e) => setFactoryForm({ ...factoryForm, pricePerKg: formatRupiahInput(e.target.value) })} placeholder="Contoh: 12.000" required /></Field>
        </div>
        <div className="rounded-xl bg-paper-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-plantation-950">Pengeluaran / pemakaian lainnya</h3><p className="mt-1 text-xs text-ink-500">Setiap nominal dipotong dari penjualan pabrik.</p></div><button type="button" className="btn-ghost !min-h-9 !px-3 !py-2 text-xs" onClick={() => setFactoryForm((f) => ({ ...f, expenses: [...f.expenses, { description: '', amount: '' }] }))}><Plus size={15} /> Tambah pengeluaran</button></div>
          {factoryForm.expenses.length === 0 ? <p className="text-xs text-ink-400">Belum ada pengeluaran tambahan.</p> : <div className="space-y-2">{factoryForm.expenses.map((expense, i) => <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="input" aria-label="Nama pengeluaran" placeholder="Contoh: ongkos angkut" value={expense.description} onChange={(e) => setFactoryForm((f) => ({ ...f, expenses: f.expenses.map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))} required /><input className="input" inputMode="numeric" aria-label="Nominal pengeluaran" placeholder="Nominal (Rp)" value={expense.amount} onChange={(e) => setFactoryForm((f) => ({ ...f, expenses: f.expenses.map((x, j) => j === i ? { ...x, amount: formatRupiahInput(e.target.value) } : x) }))} required /><button type="button" className="btn-ghost !min-h-10 !px-3" onClick={() => setFactoryForm((f) => ({ ...f, expenses: f.expenses.filter((_, j) => j !== i) }))} aria-label="Hapus pengeluaran"><Trash2 size={16} /></button></div>)}</div>}
        </div>
        <div className="grid gap-2 rounded-xl bg-plantation-950 p-4 text-white sm:grid-cols-3"><CalcLine label="Berat × harga jual" value={formatRupiah(factoryGross)} /><CalcLine label="Total pengeluaran" value={`− ${formatRupiah(factoryExpenseTotal)}`} /><CalcLine label="Hasil bersih diterima" value={formatRupiah(factoryGross - factoryExpenseTotal)} highlight /></div>
        {factoryError && <p role="alert" className="text-sm text-red-700">{factoryError}</p>}<div className="flex justify-end"><button type="submit" className="btn-primary"><Check size={16} /> Simpan penjualan pabrik</button></div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink-900/8 bg-paper-50/70 px-5 py-3 sm:px-6"><div><p className="text-xs font-medium text-ink-500">Riwayat penjualan pada</p><p className="mt-0.5 text-sm font-semibold text-plantation-950">{formatShortDate(selectedFactoryDate)} <span className="font-normal text-ink-500">· {dailyFactorySales.length} catatan</span></p><p className="mt-1 text-[11px] text-ink-400">Semua riwayat: {rubberFactorySales.length} catatan pada {factorySaleDates.length} tanggal</p></div><div className="flex flex-wrap items-center gap-2">{factorySaleDates.length > 0 && <label className="text-xs text-ink-500">Tanggal berisi data <select className="input mt-1 !min-h-9 !w-auto py-1.5 text-xs" value={factorySaleDates.includes(selectedFactoryDate) ? selectedFactoryDate : ''} onChange={(event) => event.target.value && setSelectedFactoryDate(event.target.value)}><option value="">Pilih tanggal</option>{factorySaleDates.map((date) => <option key={date} value={date}>{formatShortDate(date)}</option>)}</select></label>}<DateNavigator date={selectedFactoryDate} today={today} onChange={setSelectedFactoryDate} /></div></div>
      <div className="table-scroll overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr><th className="table-head">Tanggal</th><th className="table-head text-right">Berat</th><th className="table-head text-right">Harga/kg</th><th className="table-head text-right">Penjualan</th><th className="table-head">Pengeluaran lain</th><th className="table-head text-right">Hasil bersih</th><th className="table-head">Aksi</th></tr></thead><tbody>{dailyFactorySales.map((sale) => <tr key={sale.id}><td className="table-cell">{formatShortDate(factorySaleDate(sale))}</td><td className="table-cell text-right">{kg(sale.weightKg)}</td><td className="table-cell text-right">{formatRupiah(sale.pricePerKg)}</td><td className="table-cell text-right">{formatRupiah(sale.grossAmount)}</td><td className="table-cell text-xs">{sale.expenses?.length ? sale.expenses.map((x) => `${x.description}: ${formatRupiah(x.amount)}`).join(' · ') : '—'}</td><td className="table-cell text-right font-semibold text-plantation-900">{formatRupiah(sale.netAmount)}</td><td className="table-cell"><button type="button" className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-700" aria-label="Hapus penjualan pabrik ini" onClick={() => { if (window.confirm('Hapus catatan penjualan pabrik ini?')) deleteRubberFactorySale(sale.id) }}><Trash2 size={16} /></button></td></tr>)}</tbody>{dailyFactorySales.length > 0 && <tfoot><tr className="bg-paper-100/80"><td colSpan={3} className="table-cell font-semibold">Total tanggal ini · {dailyFactorySales.length} catatan</td><td className="table-cell text-right font-semibold">{formatRupiah(factoryDayGross)}</td><td className="table-cell text-right font-semibold">− {formatRupiah(factoryDayExpenses)}</td><td className="table-cell text-right font-semibold text-plantation-900">{formatRupiah(factoryDayNet)}</td><td /></tr></tfoot>}</table>{!dailyFactorySales.length && <p className="px-5 py-8 text-center text-sm text-ink-500">Belum ada penjualan pabrik pada tanggal ini.</p>}</div>
    </section>

    <section className="card mb-6 overflow-hidden">
      <div className="border-b border-ink-900/8 px-5 py-4 sm:px-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600"><Download size={18} /></span><div><h2 className="font-display text-lg text-plantation-950">Unduh rekap lengkap berdasarkan tanggal</h2><p className="mt-1 text-xs text-ink-500">File memuat pembelian getah, penjualan pabrik, rincian pengeluaran, dan total hasil untuk rentang tanggal yang dipilih.</p></div></div></div>
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dari tanggal"><input type="date" className="input" value={downloadRange[0]} max={downloadRange[1] || undefined} onChange={(event) => setDownloadRange([event.target.value, downloadRange[1]])} /></Field>
          <Field label="Sampai tanggal"><input type="date" className="input" value={downloadRange[1]} min={downloadRange[0] || undefined} max={today} onChange={(event) => setDownloadRange([downloadRange[0], event.target.value])} /></Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" className="rounded-full border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-paper-100" onClick={() => setDownloadRange([`${today.slice(0, 7)}-01`, today])}>Bulan ini</button><button type="button" className="rounded-full border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-paper-100" onClick={() => { const allDates = [...records.map((record) => record.date), ...factorySaleDates].filter(Boolean).sort(); setDownloadRange([allDates[0] || today, today]) }}>Semua catatan</button></div>
        </div>
        <div className="flex flex-col gap-3 lg:min-w-64 lg:items-end">
          <div className="grid gap-2 text-left sm:grid-cols-2 lg:min-w-[26rem]">
            <div className="rounded-xl bg-paper-50 px-3 py-2.5"><p className="text-[11px] text-ink-500">Total pembelian</p><p className="mt-0.5 font-display text-lg text-plantation-950">{formatRupiah(exportPurchaseTotal)}</p></div>
            <div className="rounded-xl bg-paper-50 px-3 py-2.5"><p className="text-[11px] text-ink-500">Total penjualan pabrik</p><p className="mt-0.5 font-display text-lg text-plantation-950">{formatRupiah(exportFactoryGross)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={!exportAvailable || downloadRange[0] > downloadRange[1]} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50" onClick={() => exportCsv(exportRecords, exportFactorySales, downloadRange)}><FileSpreadsheet size={16} /> CSV lengkap</button><button type="button" disabled={!exportAvailable || downloadRange[0] > downloadRange[1]} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => exportPdf(exportRecords, exportFactorySales, downloadRange)}><FileText size={16} /> Unduh PDF lengkap</button></div>
        </div>
      </div>
    </section>

    {formOpen && <section className="card mb-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-ink-900/8 px-5 py-4 sm:px-6">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">{editingId ? 'Perbarui catatan' : 'Catatan baru'}</p><h2 className="mt-1 font-display text-xl text-plantation-950">Data getah</h2></div>
        <button type="button" className="btn-ghost !min-h-9 !px-3 !py-2 text-xs" onClick={() => { setFormOpen(false); setFormError('') }}><X size={15} /> Tutup</button>
      </div>
      <form onSubmit={save} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama *"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Ani" autoFocus required /></Field>
          <Field label="Tanggal *"><input type="date" className="input" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></Field>
        </div>

        <div className="rounded-2xl border border-plantation-900/10 bg-paper-50/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold text-plantation-950">Berat per karung</h3><p className="mt-1 text-xs text-ink-500">Masukkan berat satu per satu; jumlahnya dihitung otomatis.</p></div>
            <button type="button" className="btn-ghost !min-h-9 !px-3 !py-2 text-xs" onClick={() => setForm((current) => ({ ...current, bags: [...current.bags, ''] }))}><Plus size={15} /> Tambah karung</button>
          </div>
          <div className="space-y-3">
            {form.bags.map((weight, index) => <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
              <Field label={`Berat karung ${index + 1} (kg) *`}><input inputMode="decimal" className="input" value={weight} onChange={(event) => setBag(index, event.target.value)} placeholder="Contoh: 25,5" required /></Field>
              <button type="button" disabled={form.bags.length === 1} className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-30" onClick={() => setForm((current) => ({ ...current, bags: current.bags.filter((_, bagIndex) => bagIndex !== index) }))} aria-label={`Hapus berat karung ${index + 1}`} title="Hapus karung"><Trash2 size={17} /></button>
            </div>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-900/8 pt-4 text-sm"><span className="text-ink-500">Jumlah berat semua karung</span><strong className="font-display text-xl text-plantation-950">{kg(previewWeight)}</strong></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <Field label="Harga per kg (Rp) *"><input inputMode="numeric" className="input" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: formatRupiahInput(event.target.value) })} placeholder="Contoh: 12.000" required /><p className="mt-1 text-xs text-ink-500">Harga dimasukkan manual untuk catatan ini.</p></Field>
          <div className="rounded-2xl bg-plantation-950 px-4 py-4 text-white sm:px-5">
            <p className="text-xs font-medium text-white/60">Pratinjau perhitungan</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <CalcLine label="Berat setelah potongan 10%" value={kg(preview.payableWeight)} />
              <CalcLine label="Harga per kg" value={formatRupiah(parseRupiahInput(form.pricePerKg))} />
              <CalcLine label="Total sebelum dibagi" value={formatRupiah(preview.total)} />
              <CalcLine label="Hasil dibagi dua" value={formatRupiah(preview.half)} highlight />
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/55">Berat gabungan × 90%, dibulatkan ke kg penuh (desimal 0,5 ke atas), lalu dikali harga dan dibagi dua.</p>
          </div>
        </div>

        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{formError}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-900/8 pt-4"><button type="button" className="btn-ghost" onClick={() => { setFormOpen(false); setFormError('') }}>Batal</button><button type="submit" className="btn-primary"><Check size={16} /> {editingId ? 'Simpan perubahan' : 'Simpan catatan'}</button></div>
      </form>
    </section>}

    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-900/8 px-5 py-4 sm:px-6">
        <div><h2 className="font-display text-xl text-plantation-950">Riwayat getah</h2><p className="mt-1 text-xs text-ink-500">Catatan dipisahkan per tanggal. Pilih hari untuk melihat rinciannya.</p></div>
        <span className="rounded-full bg-plantation-700/8 px-3 py-1.5 text-xs font-medium text-plantation-800">{dailyRecords.length} catatan · {formatShortDate(selectedDate)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/8 bg-paper-50/70 px-5 py-3 sm:px-6"><div><p className="text-xs font-medium text-ink-500">Tanggal yang ditampilkan</p><p className="mt-0.5 text-sm font-semibold text-plantation-950">{formatShortDate(selectedDate)} <span className="font-normal text-ink-500">· {kg(dailyWeight)} kotor · {kg(dailyNetWeight)} bersih</span></p></div><DateNavigator date={selectedDate} today={today} onChange={setSelectedDate} /></div>
      {dailyRecords.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-plantation-700/8 text-plantation-700"><Droplets size={22} /></span><h3 className="font-display text-lg text-plantation-950">Belum ada catatan pada tanggal ini</h3><p className="mt-1 max-w-sm text-sm text-ink-500">Riwayat tanggal lain tetap tersimpan. Gunakan navigasi tanggal untuk melihat hari lain.</p>{records.length === 0 && <button type="button" className="btn-primary mt-4" onClick={openCreate}><Plus size={16} /> Catat getah pertama</button>}</div> : <div className="table-scroll overflow-x-auto"><table className="w-full min-w-[1060px]">
        <thead><tr><th className="table-head">No.</th><th className="table-head">Tanggal / nama</th><th className="table-head">Berat per karung</th><th className="table-head text-right">Berat total</th><th className="table-head text-right">Setelah -10%</th><th className="table-head text-right">Harga/kg</th><th className="table-head text-right">Total hasil</th><th className="table-head text-right">Bagian ½</th><th className="table-head">Aksi</th></tr></thead>
        <tbody>{dailyRecords.map((record, index) => <tr key={record.id}>
          <td className="table-cell text-ink-500">{index + 1}</td>
          <td className="table-cell"><p className="font-medium text-ink-800">{record.name}</p><p className="mt-1 text-xs text-ink-500">{formatShortDate(record.date)}</p></td>
          <td className="table-cell text-xs text-ink-600">{record.bags.map((weight, bagIndex) => <span key={bagIndex} className="mr-1.5 inline-block whitespace-nowrap rounded-full bg-paper-100 px-2 py-1">{bagIndex + 1}: {kg(weight)}</span>)}</td>
          <td className="table-cell text-right whitespace-nowrap">{kg(record.totalWeightKg)}</td>
          <td className="table-cell text-right whitespace-nowrap"><span className="font-medium text-plantation-800">{kg(record.payableWeightKg)}</span><span className="mt-1 block text-[11px] text-ink-400">bersih · potongan {kg(record.deductionKg)}</span></td>
          <td className="table-cell text-right whitespace-nowrap">{formatRupiah(record.pricePerKg)}</td>
          <td className="table-cell text-right font-medium whitespace-nowrap">{formatRupiah(record.totalAmount)}</td>
          <td className="table-cell text-right font-semibold text-plantation-900 whitespace-nowrap">{formatRupiah(record.splitAmount)}</td>
          <td className="table-cell"><div className="flex items-center gap-1"><button type="button" onClick={() => setViewRecord(record)} className="rounded-lg p-2 text-plantation-800 hover:bg-plantation-50" aria-label={`Lihat catatan getah ${record.name}`} title="Lihat detail"><Eye size={16} /></button><button type="button" onClick={() => openEdit(record)} className="rounded-lg p-2 text-ink-500 hover:bg-gold-400/10 hover:text-gold-600" aria-label={`Edit catatan getah ${record.name}`} title="Edit"><Pencil size={16} /></button><button type="button" onClick={() => remove(record)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-700" aria-label={`Hapus catatan getah ${record.name}`} title="Hapus"><Trash2 size={16} /></button></div></td>
        </tr>)}</tbody>
        <tfoot><tr className="bg-paper-100/80"><td colSpan={3} className="table-cell font-semibold">Total tanggal ini · {dailyRecords.length} catatan</td><td className="table-cell text-right font-semibold">{kg(dailyWeight)}</td><td className="table-cell text-right font-semibold text-plantation-800">{kg(dailyNetWeight)}</td><td className="table-cell" /><td className="table-cell text-right font-semibold">{formatRupiah(dailyTotal)}</td><td className="table-cell text-right font-semibold text-plantation-900">{formatRupiah(dailyHalf)}</td><td className="table-cell" /></tr></tfoot>
      </table></div>}
    </section>

    <Modal open={Boolean(viewRecord)} onClose={() => setViewRecord(null)} title="Detail catatan getah">
      {viewRecord && <div className="space-y-4">
        <div className="rounded-2xl bg-plantation-950 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">{viewRecord.name}</p><p className="mt-1 font-display text-2xl">Getah · {formatShortDate(viewRecord.date)}</p><p className="mt-2 text-sm text-white/65">{viewRecord.bags.length} karung tercatat</p></div>
        <div className="rounded-xl border border-ink-900/10 p-4"><h3 className="mb-3 text-sm font-semibold text-plantation-950">Rincian berat karung</h3><div className="space-y-2">{viewRecord.bags.map((weight, index) => <CalcLine key={index} label={`Karung ${index + 1}`} value={kg(weight)} dark />)}</div><div className="mt-3 border-t border-ink-900/8 pt-3"><CalcLine label="Jumlah berat" value={kg(viewRecord.totalWeightKg)} dark strong /></div></div>
        <div className="rounded-xl bg-paper-100 p-4"><div className="space-y-2"><CalcLine label="Potongan 10% · hasil pembulatan" value={`− ${kg(viewRecord.deductionKg)}`} dark /><CalcLine label="Berat yang dibayar" value={kg(viewRecord.payableWeightKg)} dark /><CalcLine label={`Harga × ${kg(viewRecord.payableWeightKg)}`} value={`${formatRupiah(viewRecord.pricePerKg)}/kg`} dark /><CalcLine label="Total hasil" value={formatRupiah(viewRecord.totalAmount)} dark strong /><div className="mt-3 border-t border-ink-900/10 pt-3"><CalcLine label="Hasil dibagi dua" value={formatRupiah(viewRecord.splitAmount)} dark strong /></div></div></div>
        <div className="flex justify-end"><button type="button" className="btn-primary" onClick={() => { const record = viewRecord; setViewRecord(null); openEdit(record) }}><Pencil size={15} /> Edit catatan</button></div>
      </div>}
    </Modal>
  </div>
}

function SummaryCard({ icon, label, value, detail, accent = false }) {
  return <article className="card relative overflow-hidden p-4 sm:p-5"><span className={`absolute inset-x-0 top-0 h-1 ${accent ? 'bg-gold-500' : 'bg-plantation-700'}`} /><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plantation-700/8 text-plantation-800">{icon}</span><div className="min-w-0"><p className="text-xs text-ink-500">{label}</p><p className="mt-1 truncate font-display text-xl text-plantation-950">{value}</p><p className="mt-1 text-[11px] text-ink-400">{detail}</p></div></div></article>
}

function DateNavigator({ date, today, onChange }) {
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" className="btn-ghost !min-h-9 !rounded-full !px-3 !py-2 text-xs" onClick={() => onChange(shiftDate(date, -1))} aria-label="Tanggal sebelumnya"><ChevronLeft size={16} /><span className="hidden sm:inline">Sebelumnya</span></button>
    <label className="relative"><span className="sr-only">Pilih tanggal</span><input type="date" className="input !min-h-9 !w-auto !rounded-full !px-3 !py-1.5 text-xs" value={date} max={today} onChange={(event) => event.target.value && onChange(event.target.value)} /></label>
    <button type="button" className="btn-ghost !min-h-9 !rounded-full !px-3 !py-2 text-xs" onClick={() => onChange(today)} disabled={date === today}>Hari ini</button>
    <button type="button" className="btn-ghost !min-h-9 !rounded-full !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(shiftDate(date, 1))} disabled={date >= today} aria-label="Tanggal berikutnya"><span className="hidden sm:inline">Berikutnya</span><ChevronRight size={16} /></button>
  </div>
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function CalcLine({ label, value, dark = false, strong = false, highlight = false }) { return <div className="flex items-center justify-between gap-3"><span className={`text-xs ${dark ? 'text-ink-500' : 'text-white/65'}`}>{label}</span><span className={`${strong || highlight ? 'font-semibold' : 'font-medium'} ${dark ? 'text-plantation-950' : highlight ? 'text-gold-300' : 'text-white'} text-right text-sm`}>{value}</span></div> }
