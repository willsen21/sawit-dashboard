import React, { useMemo, useState } from 'react'
import { ArrowLeft, BadgePercent, CircleDollarSign, Download, Eye, Leaf, MapPin, Plus, Search, Sprout, TrendingUp, UserRound, Weight, X, Trash2, Pencil } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate, startOfWeek, toDateKey, todayKey } from '../../lib/dateUtils'
import { calculateFarmHarvest, getFarmHarvestTotals, splitFarmResultEqually } from '../../lib/farmCalculations'
import FarmShareFields from '../../components/FarmShareFields'

const money = (value) => formatRupiah(Number(value) || 0)
const parseNumeric = (value) => Number(String(value || '').replaceAll('.', '').replace(',', '.')) || 0
const formatNumericInput = (value) => {
  const raw = String(value).replace(/[^0-9,]/g, '')
  const [whole, ...decimalParts] = raw.split(',')
  const grouped = (whole || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalParts.length ? `${grouped},${decimalParts.join('').slice(0, 2)}` : grouped
}
const newUse = () => ({ id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, purpose: '', amount: '' })
const newYield = () => ({ id: `yield-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, netKg: '', pricePerKg: '' })
const MANAGERS = [
  { value: 'joni', label: 'Joni' },
  { value: 'romi', label: 'Romi' },
  { value: 'none', label: 'Tidak ada pengurus' },
]

function managerLabel(manager) {
  return MANAGERS.find((item) => item.value === manager)?.label || 'Belum dicatat'
}

function getYieldDetails(record) {
  const legacyFruit = Number(record.fruitNetKg ?? record.netKg) > 0 ? [{ netKg: record.fruitNetKg ?? record.netKg, pricePerKg: record.fruitPricePerKg ?? record.pricePerKg }] : []
  const legacyBrondolan = Number(record.brondolanNetKg) > 0 ? [{ netKg: record.brondolanNetKg, pricePerKg: record.brondolanPricePerKg }] : []
  const legacyKetek = Number(record.ketekNetKg) > 0 ? [{ netKg: record.ketekNetKg, pricePerKg: record.ketekPricePerKg }] : []
  return [
    { name: 'Buah', rows: record.fruitRows?.length ? record.fruitRows : legacyFruit },
    { name: 'Brondolan', rows: record.brondolanRows?.length ? record.brondolanRows : legacyBrondolan },
    { name: 'Ketek', rows: record.ketekRows?.length ? record.ketekRows : legacyKetek },
  ]
}

async function exportFarmDetailsPdf(farm) {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  const green = [20, 54, 43]
  const midGreen = [44, 91, 72]
  const gold = [194, 143, 62]
  const muted = [104, 119, 111]
  const cream = [248, 246, 239]
  const records = [...(farm.records || [])].sort((a, b) => b.date.localeCompare(a.date))
  const totals = records.reduce((sum, row) => {
    const detail = getFarmHarvestTotals(row)
    sum.netKg += Number(row.netKg) || 0
    sum.gross += detail.grossTotal
    sum.result += detail.finalTotal
    return sum
  }, { netKg: 0, gross: 0, result: 0 })
  let y = 0

  function drawPageHeader(subtitle = 'Laporan detail hasil panen') {
    pdf.setFillColor(...green)
    pdf.rect(0, 0, pageWidth, 37, 'F')
    pdf.setFillColor(...gold)
    pdf.circle(23, 18.5, 9, 'F')
    pdf.setDrawColor(255, 255, 255)
    pdf.setLineWidth(0.8)
    pdf.line(23, 23, 23, 16)
    pdf.line(23, 18, 19.5, 15)
    pdf.line(23, 19, 26.5, 15.5)
    pdf.setFillColor(255, 255, 255)
    pdf.circle(19.5, 15, 1, 'F')
    pdf.circle(26.5, 15.5, 1, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.text('KEBUN', 38, 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(subtitle, 38, 23)
    pdf.setTextColor(...green)
  }

  function nextPage() {
    pdf.addPage()
    drawPageHeader('Laporan detail hasil panen - lanjutan')
    y = 48
  }

  function ensureSpace(height) {
    if (y + height > pageHeight - 17) nextPage()
  }

  function labelValue(label, value, x, top, width) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...muted)
    pdf.text(label, x, top)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...green)
    const lines = pdf.splitTextToSize(String(value || '-'), width)
    pdf.text(lines, x, top + 5)
    return top + 5 + Math.max(1, lines.length) * 4.5
  }

  drawPageHeader()
  y = 49
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(...green)
  pdf.text(String(farm.name || 'Lahan').slice(0, 70), margin, y)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...muted)
  pdf.text(`Dibuat ${formatShortDate(todayKey())} | ${records.length} catatan panen`, margin, y)
  y += 8

  pdf.setFillColor(...cream)
  pdf.roundedRect(margin, y, contentWidth, 31, 3, 3, 'F')
  labelValue('LOKASI', farm.location || 'Belum diisi', margin + 5, y + 7, 72)
  labelValue('PEMILIK', farm.owner || 'Belum diisi', margin + 67, y + 7, 48)
  labelValue('LUAS LAHAN', farm.areaHa ? `${farm.areaHa} hektare` : 'Belum diisi', margin + 127, y + 7, 42)
  y += 37

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...green)
  pdf.text('Ringkasan seluruh catatan', margin, y)
  y += 3
  const statGap = 3
  const statWidth = (contentWidth - statGap * 2) / 3
  const statItems = [
    ['BERAT BERSIH', `${totals.netKg.toLocaleString('id-ID')} kg`],
    ['TOTAL HASIL PANEN', money(totals.gross)],
    ['TOTAL HASIL AKHIR', money(totals.result)],
  ]
  statItems.forEach(([label, value], index) => {
    const x = margin + index * (statWidth + statGap)
    pdf.setFillColor(246, 249, 246)
    pdf.roundedRect(x, y, statWidth, 19, 2, 2, 'F')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...muted)
    pdf.text(label, x + 3, y + 6)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...green)
    pdf.text(value, x + 3, y + 13)
  })
  y += 27

  if (farm.note) {
    ensureSpace(20)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...muted)
    const noteLines = pdf.splitTextToSize(`Catatan lahan: ${farm.note}`, contentWidth)
    pdf.text(noteLines, margin, y)
    y += noteLines.length * 4.5 + 5
  }

  records.forEach((record, index) => {
    ensureSpace(49)
    const rowTotals = getFarmHarvestTotals(record)
    const boxTop = y
    pdf.setFillColor(...green)
    pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(255, 255, 255)
    pdf.text(`PANEN ${String(index + 1).padStart(2, '0')}  |  ${formatShortDate(record.date)}`, margin + 4, y + 6.5)
    y += 16

    const col2 = margin + contentWidth / 2
    const baseY = y
    const a = labelValue('NAMA PENGURUS', managerLabel(record.manager), margin + 2, baseY, contentWidth / 2 - 8)
    const b = labelValue('TOTAL BERAT BERSIH', `${Number(record.netKg || 0).toLocaleString('id-ID')} kg`, col2, baseY, contentWidth / 2 - 8)
    y = Math.max(a, b) + 3

    getYieldDetails(record).forEach(({ name, rows: yieldRows }) => {
      yieldRows.forEach((yieldRow, rowIndex) => {
        ensureSpace(10)
        const amount = Math.round((Number(yieldRow.netKg) || 0) * (Number(yieldRow.pricePerKg) || 0))
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.5)
        pdf.setTextColor(...muted)
        pdf.text(`${name}${yieldRows.length > 1 ? ` ${rowIndex + 1}` : ''}: ${Number(yieldRow.netKg || 0).toLocaleString('id-ID')} kg x ${money(yieldRow.pricePerKg)}/kg`, margin + 2, y)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...green)
        pdf.text(money(amount), pageWidth - margin, y, { align: 'right' })
        y += 5
      })
    })
    ensureSpace(17)
    labelValue('TOTAL HASIL PANEN', money(rowTotals.grossTotal), margin + 2, y, contentWidth - 4)
    y += 11

    const uses = record.uses || []
    if (uses.length) {
      ensureSpace(12 + uses.length * 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(...midGreen)
      pdf.text('PEMAKAIAN HASIL PANEN', margin + 2, y)
      y += 5
      uses.forEach((use, useIndex) => {
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...muted)
        const usageLabel = `${useIndex === 0 ? 'Utama' : `Tambahan ${useIndex}`} - ${use.purpose || 'Tanpa keterangan'}`
        const usageLines = pdf.splitTextToSize(usageLabel, contentWidth - 48)
        usageLines.forEach((line, lineIndex) => {
          ensureSpace(7)
          pdf.text(line, margin + 2, y)
          if (lineIndex === 0) {
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(...green)
            pdf.text(money(use.amount), pageWidth - margin, y, { align: 'right' })
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(...muted)
          }
          y += 5
        })
      })
    }

    const primaryUse = Number(uses[0]?.amount) || 0
    const wageBase = Math.max(0, rowTotals.grossTotal - primaryUse)
    pdf.setDrawColor(218, 224, 218)
    pdf.line(margin + 2, y, pageWidth - margin - 2, y)
    y += 5
    labelValue('DASAR UPAH PENGURUS', money(wageBase), margin + 2, y, contentWidth / 2 - 8)
    labelValue('UPAH PENGURUS (10%)', money(rowTotals.managerWage), col2, y, contentWidth / 2 - 8)
    y = Math.max(y + 11, boxTop + 43)

    pdf.setFillColor(...cream)
    pdf.roundedRect(margin, y, contentWidth, 13, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...green)
    pdf.text('HASIL AKHIR', margin + 4, y + 8)
    pdf.setFontSize(12)
    pdf.setTextColor(...midGreen)
    pdf.text(money(rowTotals.finalTotal), pageWidth - margin - 4, y + 8, { align: 'right' })
    y += 17

    if (record.distribution?.length) {
      ensureSpace(8 + record.distribution.length * 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(...midGreen)
      pdf.text('PEMBAGIAN HASIL', margin + 2, y)
      y += 5
      record.distribution.forEach((share) => {
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...muted)
        const shareLines = pdf.splitTextToSize(`Nama: ${share.name}`, contentWidth - 48)
        shareLines.forEach((line, lineIndex) => {
          ensureSpace(7)
          pdf.text(line, margin + 2, y)
          if (lineIndex === 0) {
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(...green)
            pdf.text(money(share.amount), pageWidth - margin, y, { align: 'right' })
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(...muted)
          }
          y += 5
        })
      })
    }
    if (record.note) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...muted)
      const noteLines = pdf.splitTextToSize(`Catatan panen: ${record.note}`, contentWidth - 4)
      noteLines.forEach((line) => {
        ensureSpace(6)
        pdf.text(line, margin + 2, y)
        y += 4
      })
      y += 4
    }
    y += 5
  })

  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setDrawColor(225, 229, 224)
    pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...muted)
    pdf.text('Dokumen dibuat dari data Kebun pada aplikasi Sawit', margin, pageHeight - 6)
    pdf.text(`Halaman ${page} dari ${pages}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
  }
  const safeName = String(farm.name || 'kebun').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kebun'
  pdf.save(`laporan-detail-${safeName}-${todayKey()}.pdf`)
}

export default function PrivateFarms() {
  const { privateFarms: farms, addPrivateFarm, updatePrivateFarm, addPrivateHarvestRecord, updatePrivateHarvestRecord, deletePrivateHarvestRecord } = useData()
  const [selectedId, setSelectedId] = useState(null)
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [editingFarmId, setEditingFarmId] = useState(null)
  const [farmError, setFarmError] = useState('')
  const [farmSearch, setFarmSearch] = useState('')
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [recordError, setRecordError] = useState('')
  const [farmForm, setFarmForm] = useState({ name: '', owner: '', location: '', areaHa: '', note: '' })
  const [recordForm, setRecordForm] = useState({ date: todayKey(), manager: '', fruitRows: [newYield()], brondolanRows: [newYield()], ketekRows: [newYield()], uses: [newUse()], shareCount: 0, shareNames: [], note: '' })

  const selected = farms.find((farm) => farm.id === selectedId)
  const currentDay = todayKey()
  const currentWeekStart = toDateKey(startOfWeek(new Date()))
  const currentMonthStart = `${currentDay.slice(0, 7)}-01`
  const periodSummary = useMemo(() => {
    const records = farms.flatMap((farm) => farm.records || [])
    const summarize = (rows) => rows.reduce((summary, row) => {
      const totals = getFarmHarvestTotals(row)
      summary.netKg += Number(row.netKg) || 0
      summary.gross += totals.grossTotal
      summary.result += totals.finalTotal
      return summary
    }, { netKg: 0, gross: 0, result: 0 })
    return {
      week: summarize(records.filter((row) => row.date >= currentWeekStart && row.date <= currentDay)),
      month: summarize(records.filter((row) => row.date >= currentMonthStart && row.date <= currentDay)),
    }
  }, [farms, currentDay, currentWeekStart, currentMonthStart])
  const visibleFarms = useMemo(() => {
    const query = farmSearch.trim().toLocaleLowerCase('id-ID')
    return [...farms]
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id') || String(a.location || '').localeCompare(String(b.location || ''), 'id'))
      .filter((farm) => !query || `${farm.name || ''} ${farm.location || ''} ${farm.owner || ''}`.toLocaleLowerCase('id-ID').includes(query))
  }, [farms, farmSearch])

  function openFarmForm() {
    setEditingFarmId(null)
    setFarmError('')
    setFarmForm({ name: '', owner: '', location: '', areaHa: '', note: '' })
    setShowFarmForm(true)
  }

  function openFarmEdit(farm) {
    setEditingFarmId(farm.id)
    setFarmError('')
    setFarmForm({ name: farm.name || '', owner: farm.owner || '', location: farm.location || '', areaHa: farm.areaHa || '', note: farm.note || '' })
    setShowFarmForm(true)
  }

  function saveFarm(event) {
    event.preventDefault()
    if (!farmForm.name.trim()) return setFarmError('Nama lahan wajib diisi.')
    const payload = { ...farmForm, name: farmForm.name.trim(), owner: farmForm.owner.trim(), location: farmForm.location.trim(), note: farmForm.note.trim() }
    if (editingFarmId) {
      const result = updatePrivateFarm(editingFarmId, payload)
      if (!result.ok) return setFarmError(result.message)
    } else {
      const farm = addPrivateFarm(payload)
      setSelectedId(farm.id)
    }
    setFarmForm({ name: '', owner: '', location: '', areaHa: '', note: '' })
    setShowFarmForm(false)
    setEditingFarmId(null)
    setFarmError('')
  }

  function addRecord(event) {
    event.preventDefault()
    const fruitRows = recordForm.fruitRows.map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) })).filter((row) => row.netKg || row.pricePerKg)
    const brondolanRows = recordForm.brondolanRows.map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) })).filter((row) => row.netKg || row.pricePerKg)
    const ketekRows = recordForm.ketekRows.map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) })).filter((row) => row.netKg || row.pricePerKg)
    const fruitNetKg = fruitRows.reduce((sum, row) => sum + row.netKg, 0)
    const brondolanNetKg = brondolanRows.reduce((sum, row) => sum + row.netKg, 0)
    const ketekNetKg = ketekRows.reduce((sum, row) => sum + row.netKg, 0)
    const fruitPricePerKg = fruitRows[0]?.pricePerKg || 0
    const brondolanPricePerKg = brondolanRows[0]?.pricePerKg || 0
    const netKg = fruitNetKg + brondolanNetKg + ketekNetKg
    const uses = recordForm.uses.map((item) => ({ ...item, purpose: item.purpose.trim(), amount: parseNumeric(item.amount) })).filter((item) => item.purpose || item.amount)
    setRecordError('')
    if (!selected || !recordForm.date || !recordForm.manager || netKg <= 0 || [...fruitRows, ...brondolanRows, ...ketekRows].some((row) => row.netKg <= 0 || row.pricePerKg <= 0)) {
      return setRecordError('Tanggal, pengurus, dan setiap baris hasil panen yang diisi harus memiliki berat serta harga per kg lebih dari 0.')
    }
    if (fruitNetKg < 0 || brondolanNetKg < 0) return setRecordError('Berat bersih buah dan brondolan tidak boleh negatif.')
    if (recordForm.uses.some((item) => Boolean(item.purpose.trim()) !== (parseNumeric(item.amount) > 0))) {
      return setRecordError('Setiap pemakaian harus memiliki keterangan dan nominal lebih dari 0.')
    }
    const primaryUse = recordForm.uses[0]
    if (!primaryUse?.purpose?.trim() || parseNumeric(primaryUse.amount) <= 0) return setRecordError('Pemakaian utama pertama wajib diisi dengan keterangan dan nominal lebih dari 0.')
    const useTotal = uses.reduce((sum, item) => sum + item.amount, 0)
    const { grossTotal, managerWage, finalTotal } = calculateFarmHarvest({ fruitRows, brondolanRows, ketekRows, uses, manager: recordForm.manager })
    if (useTotal > grossTotal) return setRecordError('Total pemakaian tidak boleh melebihi hasil panen bersih.')
    const shareCount = Number(recordForm.shareCount) || 0
    const shareNames = (recordForm.shareNames || []).slice(0, shareCount).map((name) => name.trim())
    if (shareCount && (finalTotal < 0 || shareNames.some((name) => !name))) return setRecordError('Isi semua nama penerima. Hasil akhir harus positif untuk dibagikan.')
    if (new Set(shareNames.map((name) => name.toLocaleLowerCase('id-ID'))).size !== shareNames.length) return setRecordError('Nama penerima pembagian hasil harus berbeda.')
    const distribution = splitFarmResultEqually(finalTotal, shareNames)
    const record = {
      id: `harvest-${Date.now()}`,
      date: recordForm.date,
      netKg,
      fruitNetKg,
      fruitPricePerKg,
      brondolanNetKg,
      brondolanPricePerKg,
      pricePerKg: brondolanNetKg > 0 ? 0 : fruitPricePerKg,
      fruitRows,
      brondolanRows,
      ketekRows,
      ketekNetKg,
      ketekPricePerKg: ketekRows[0]?.pricePerKg || 0,
      manager: recordForm.manager,
      grossTotal,
      uses,
      useTotal,
      managerWage,
      finalTotal,
      total: finalTotal,
      distribution,
      note: recordForm.note.trim(),
    }
    if (editingRecordId) updatePrivateHarvestRecord(selected.id, editingRecordId, record)
    else addPrivateHarvestRecord(selected.id, record)
    setRecordForm({ date: todayKey(), manager: '', fruitRows: [newYield()], brondolanRows: [newYield()], ketekRows: [newYield()], uses: [newUse()], shareCount: 0, shareNames: [], note: '' })
    setEditingRecordId(null)
    setShowRecordForm(false)
  }

  function openRecordForm() {
    setRecordError('')
    setEditingRecordId(null)
    setRecordForm({ date: todayKey(), manager: '', fruitRows: [newYield()], brondolanRows: [newYield()], ketekRows: [newYield()], uses: [newUse()], shareCount: 0, shareNames: [], note: '' })
    setShowRecordForm(true)
  }

  function editRecord(record) {
    setRecordError('')
    setEditingRecordId(record.id)
    setRecordForm({
      date: record.date || todayKey(),
      manager: record.manager || '',
      fruitRows: (record.fruitRows?.length ? record.fruitRows : (Number(record.fruitNetKg ?? record.netKg) > 0 ? [{ netKg: record.fruitNetKg ?? record.netKg, pricePerKg: record.fruitPricePerKg ?? record.pricePerKg }] : [])).map((row) => ({ ...row, id: row.id || newYield().id, netKg: formatNumericInput(row.netKg ?? ''), pricePerKg: formatNumericInput(row.pricePerKg ?? '') })).concat(record.fruitRows?.length || Number(record.fruitNetKg ?? record.netKg) > 0 ? [] : [newYield()]),
      brondolanRows: (record.brondolanRows?.length ? record.brondolanRows : (Number(record.brondolanNetKg) > 0 ? [{ netKg: record.brondolanNetKg, pricePerKg: record.brondolanPricePerKg }] : [])).map((row) => ({ ...row, id: row.id || newYield().id, netKg: formatNumericInput(row.netKg ?? ''), pricePerKg: formatNumericInput(row.pricePerKg ?? '') })).concat(record.brondolanRows?.length || Number(record.brondolanNetKg) > 0 ? [] : [newYield()]),
      ketekRows: (record.ketekRows?.length ? record.ketekRows : (Number(record.ketekNetKg) > 0 ? [{ netKg: record.ketekNetKg, pricePerKg: record.ketekPricePerKg }] : [])).map((row) => ({ ...row, id: row.id || newYield().id, netKg: formatNumericInput(row.netKg ?? ''), pricePerKg: formatNumericInput(row.pricePerKg ?? '') })).concat(record.ketekRows?.length || Number(record.ketekNetKg) > 0 ? [] : [newYield()]),
      uses: (record.uses?.length ? record.uses : [newUse()]).map((item) => ({ ...item, id: item.id || newUse().id, amount: formatNumericInput(item.amount ?? '') })),
      shareCount: (record.distribution || []).length,
      shareNames: (record.distribution || []).map((share) => share.name || ''),
      note: record.note || '',
    })
    setShowRecordForm(true)
  }

  function deleteRecord(record) {
    const confirmed = window.confirm(`Hapus catatan panen tanggal ${formatShortDate(record.date)}? Tindakan ini tidak dapat dibatalkan.`)
    if (confirmed) deletePrivateHarvestRecord(selected.id, record.id)
  }

  if (selected) return <FarmDetail
    farm={selected}
    onBack={() => setSelectedId(null)}
    onEditFarm={() => openFarmEdit(selected)}
    onAdd={openRecordForm}
    showForm={showRecordForm}
    error={recordError}
    onCloseForm={() => { setShowRecordForm(false); setEditingRecordId(null) }}
    form={recordForm}
    setForm={setRecordForm}
    onSubmit={addRecord}
    editingRecordId={editingRecordId}
    onEdit={editRecord}
    onDelete={deleteRecord}
    onViewRecord={setViewRecord}
    viewRecord={viewRecord}
    onCloseViewRecord={() => setViewRecord(null)}
    showFarmForm={showFarmForm}
    farmForm={farmForm}
    setFarmForm={setFarmForm}
    farmError={farmError}
    onSaveFarm={saveFarm}
    onCloseFarmForm={() => { setShowFarmForm(false); setEditingFarmId(null); setFarmError('') }}
    editingFarm={Boolean(editingFarmId)}
  />

  return <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Owner workspace</p><h1 className="mt-1 font-display text-3xl text-plantation-950">Kebun</h1><p className="mt-2 max-w-xl text-sm text-ink-500">Kelola lahan, catat panen, pemakaian hasil, dan pembagian upah pengurus.</p></div>
      <button className="btn-primary" onClick={openFarmForm}><Plus size={17} /> Tambah lahan</button>
    </header>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={<Sprout size={17} />} label="Total lahan" value={farms.length.toLocaleString('id-ID')} delay={0} />
      <Stat icon={<Weight size={17} />} label="Berat bersih minggu ini" value={`${periodSummary.week.netKg.toLocaleString('id-ID')} kg`} delay={70} />
      <Stat icon={<CircleDollarSign size={17} />} label="Hasil panen minggu ini" value={money(periodSummary.week.gross)} delay={140} />
      <Stat icon={<TrendingUp size={17} />} label="Hasil akhir bulan ini" value={money(periodSummary.month.result)} delay={210} />
    </div>
    <p className="-mt-3 mb-5 text-xs text-ink-500">Minggu berjalan: {formatShortDate(currentWeekStart)}–{formatShortDate(currentDay)}. Angka bulanan dihitung dari {formatShortDate(currentMonthStart)} sampai hari ini.</p>
    {farms.length > 0 && <div className="mb-4"><label className="relative block max-w-xl"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" /><input className="input pl-10" value={farmSearch} onChange={(event) => setFarmSearch(event.target.value)} placeholder="Cari nama lahan, lokasi, atau pemilik" /></label><p className="mt-2 text-xs text-ink-500">Nama lahan boleh sama; lokasi ditampilkan sebagai pembeda. {visibleFarms.length} dari {farms.length} lahan</p></div>}
    {farms.length ? visibleFarms.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleFarms.map((farm) => <FarmCard key={farm.id} farm={farm} onClick={() => setSelectedId(farm.id)} />)}</section> : <section className="card flex min-h-48 flex-col items-center justify-center px-6 text-center"><h2 className="font-display text-xl text-plantation-950">Lahan tidak ditemukan</h2><p className="mt-2 text-sm text-ink-500">Coba cari dengan nama atau lokasi yang berbeda.</p><button type="button" className="btn-ghost mt-4" onClick={() => setFarmSearch('')}>Hapus pencarian</button></section> : <section className="card flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plantation-700/10 text-plantation-700"><Leaf size={26} /></span><h2 className="font-display text-xl text-plantation-950">Mulai catat lahan</h2><p className="mt-2 max-w-md text-sm text-ink-500">Tambahkan lahan terlebih dahulu. Setiap lahan memiliki riwayat panen dan perhitungan hasil sendiri.</p><button className="btn-primary mt-5" onClick={openFarmForm}><Plus size={16} /> Tambah lahan pertama</button></section>}
    {showFarmForm && <FarmFormDialog title={editingFarmId ? 'Edit data lahan' : 'Tambah lahan kebun'} form={farmForm} setForm={setFarmForm} error={farmError} onClose={() => { setShowFarmForm(false); setEditingFarmId(null); setFarmError('') }} onSubmit={saveFarm} editing={Boolean(editingFarmId)} />}
  </main>
}

function FarmFormDialog({ title, form, setForm, error, onClose, onSubmit, editing = false }) {
  return <Dialog title={title} onClose={onClose}><form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nama lahan *"><input className="input" required autoFocus placeholder="Contoh: Lahan Utara" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Lokasi"><input className="input" placeholder="Desa atau keterangan lokasi · opsional" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Pemilik lahan"><input className="input" placeholder="Opsional" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field><Field label="Luas (hektare)"><input type="number" min="0" step="0.1" className="input" placeholder="Opsional" value={form.areaHa} onChange={(event) => setForm({ ...form, areaHa: event.target.value })} /></Field></div>
      <Field label="Catatan lahan"><textarea className="input min-h-20" placeholder="Opsional" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full">{editing ? <Pencil size={16} /> : <Plus size={16} />} {editing ? 'Simpan perubahan' : 'Simpan lahan'}</button>
    </form></Dialog>
}

function FarmCard({ farm, onClick }) {
  const rows = farm.records || []
  const today = todayKey()
  const weekStart = toDateKey(startOfWeek(new Date()))
  const todaySummary = summarizeFarmRecords(rows.filter((row) => row.date === today))
  const weekSummary = summarizeFarmRecords(rows.filter((row) => row.date >= weekStart && row.date <= today))
  const last = rows[0]
  return <button onClick={onClick} style={{ '--stat-delay': `${Math.min(rows.length * 60, 240)}ms` }} className="stat-card stat-card-action group overflow-hidden rounded-xl border border-ink-900/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-plantation-700/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-plantation-700/30">
    <div className="relative bg-gradient-to-br from-plantation-950 via-plantation-900 to-plantation-700 px-5 pb-5 pt-6 text-white"><div className="absolute right-4 top-3 opacity-10"><Leaf size={76} /></div><div className="relative flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Sprout size={20} /></span><span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-medium text-gold-300">Lahan</span></div><h2 className="relative mt-5 font-display text-2xl text-white">{farm.name}</h2><p className="relative mt-1 flex items-center gap-1.5 text-sm text-white/85"><MapPin size={14} />{farm.location || 'Lokasi belum diisi'}</p></div>
    <div className="p-5">{farm.owner && <div className="flex items-center gap-2 text-sm text-ink-600"><UserRound size={15} className="text-plantation-700" /><span>Pemilik: <strong className="font-medium text-ink-800">{farm.owner}</strong></span></div>}{farm.areaHa && <p className={`${farm.owner ? 'mt-2' : ''} text-xs text-ink-500`}>Luas lahan {farm.areaHa} hektare</p>}<div className="mt-5 grid grid-cols-2 gap-2"><FarmMetric label="Berat bersih · hari ini" value={`${todaySummary.netKg.toLocaleString('id-ID')} kg`} tone="paper" /><FarmMetric label="Hasil akhir · hari ini" value={money(todaySummary.result)} tone="gold" /><FarmMetric label="Berat bersih · minggu ini" value={`${weekSummary.netKg.toLocaleString('id-ID')} kg`} tone="paper" /><FarmMetric label="Hasil akhir · minggu ini" value={money(weekSummary.result)} tone="gold" /></div><div className="mt-4 flex items-center justify-between border-t border-ink-900/8 pt-3 text-xs text-ink-500"><span>{rows.length ? `Panen terakhir · ${formatShortDate(last.date)}` : 'Belum ada catatan panen'}</span><span className="font-medium text-plantation-700 group-hover:underline">Buka lahan →</span></div></div>
  </button>
}

function summarizeFarmRecords(rows) {
  return rows.reduce((summary, row) => {
    summary.netKg += Number(row.netKg) || 0
    summary.result += getFarmHarvestTotals(row).finalTotal
    return summary
  }, { netKg: 0, result: 0 })
}

function FarmMetric({ label, value, tone }) {
  return <div className={`rounded-lg p-3 ${tone === 'gold' ? 'bg-gold-400/10' : 'bg-paper-100'}`}><p className="text-[10px] text-ink-500">{label}</p><p className="mt-1 truncate font-display text-base text-plantation-900">{value}</p></div>
}

function HarvestDetailDialog({ farm, record, onClose }) {
  const totals = getFarmHarvestTotals(record)
  const uses = record.uses || []
  const primaryUse = Number(uses[0]?.amount) || 0
  const yieldGroups = getYieldDetails(record)
  return <Dialog title="Detail catatan panen" onClose={onClose} wide scrollable>
    <div className="min-w-0 space-y-4 pr-3">
      <section className="rounded-xl bg-gradient-to-br from-plantation-950 to-plantation-700 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">{farm.name}</p>
        <h3 className="mt-1 font-display text-2xl text-white">Panen {formatShortDate(record.date)}</h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85"><span>Lokasi: {farm.location || 'Belum diisi'}</span><span>Nama pengurus: {managerLabel(record.manager)}</span></div>
      </section>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2"><DetailValue label="Total berat bersih" value={`${Number(record.netKg || 0).toLocaleString('id-ID')} kg`} /><DetailValue label="Total hasil panen" value={money(totals.grossTotal)} /></div>
      {yieldGroups.some((group) => group.rows.length) && <section className="rounded-xl border border-ink-900/10 p-4"><h3 className="mb-3 font-semibold text-plantation-950">Rincian hasil dan harga</h3><div className="space-y-2">{yieldGroups.flatMap(({ name, rows }) => rows.map((item, index) => <div key={`${name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-900/8 pb-2 text-sm last:border-0 last:pb-0"><span className="text-ink-600">{name}{rows.length > 1 ? ` ${index + 1}` : ''}: {Number(item.netKg || 0).toLocaleString('id-ID')} kg × {money(item.pricePerKg)}/kg</span><strong className="text-plantation-900">{money(Math.round((Number(item.netKg) || 0) * (Number(item.pricePerKg) || 0)))}</strong></div>))}</div></section>}
      <section className="rounded-xl border border-ink-900/10 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="font-semibold text-plantation-950">Pemakaian hasil panen</h3><p className="mt-1 text-xs text-ink-500">Pemakaian utama menjadi pengurang dasar upah.</p></div><strong className="whitespace-nowrap text-sm text-plantation-900">Total {money(totals.useTotal)}</strong></div>{uses.length ? <div className="space-y-2">{uses.map((use, index) => <div key={use.id || index} className="flex justify-between gap-3 text-sm"><span className="text-ink-600">{index === 0 ? 'Utama' : `Tambahan ${index}`} · {use.purpose || 'Tanpa keterangan'}</span><strong>{money(use.amount)}</strong></div>)}</div> : <p className="text-sm text-ink-500">Tidak ada pemakaian tercatat.</p>}</section>
      <section className="rounded-xl bg-paper-50 p-4"><div className="space-y-2 text-sm"><DetailLine label="Dasar upah (hasil panen - pemakaian utama)" value={money(Math.max(0, totals.grossTotal - primaryUse))} /><DetailLine label="Upah pengurus 10%" value={`− ${money(totals.managerWage)}`} /><DetailLine label="Total pemakaian (utama + tambahan)" value={`− ${money(totals.useTotal)}`} /></div><div className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-3"><span className="font-semibold text-ink-700">Hasil akhir</span><strong className="font-display text-2xl text-plantation-950">{money(totals.finalTotal)}</strong></div></section>
      <section className="rounded-xl border border-ink-900/10 p-4"><h3 className="mb-2 font-semibold text-plantation-950">Pembagian hasil</h3>{record.distribution?.length ? <div className="space-y-2">{record.distribution.map((share, index) => <DetailLine key={`${share.name}-${index}`} label={`Nama: ${share.name}`} value={money(share.amount)} />)}</div> : <p className="text-sm text-ink-500">Hasil tidak dibagi.</p>}</section>
      {record.note && <section className="rounded-xl bg-gold-400/10 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Catatan panen</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{record.note}</p></section>}
    </div>
    <div className="sticky bottom-0 -mx-1 mt-4 flex justify-end border-t border-ink-900/10 bg-white/95 px-1 pt-3 backdrop-blur"><button type="button" className="btn-ghost" onClick={onClose}>Tutup</button></div>
  </Dialog>
}

function DetailValue({ label, value }) {
  return <div className="rounded-xl bg-paper-100 p-4"><p className="text-xs text-ink-500">{label}</p><p className="mt-1 font-display text-xl text-plantation-950">{value}</p></div>
}

function DetailLine({ label, value }) {
  return <div className="flex flex-wrap justify-between gap-3"><span className="text-ink-600">{label}</span><strong className="text-ink-800">{value}</strong></div>
}

function FarmDetail({ farm, onBack, onEditFarm, onAdd, showForm, error, onCloseForm, form, setForm, onSubmit, editingRecordId, onEdit, onDelete, onViewRecord, viewRecord, onCloseViewRecord, showFarmForm, farmForm, setFarmForm, farmError, onSaveFarm, onCloseFarmForm, editingFarm }) {
  const rows = farm.records || []
  const todayRows = rows.filter((row) => row.date === todayKey())
  const today = todayRows.reduce((sum, row) => {
    const totals = getFarmHarvestTotals(row)
    sum.netKg += Number(row.netKg) || 0
    sum.gross += totals.grossTotal
    sum.useTotal += totals.useTotal
    sum.wages += totals.managerWage
    sum.result += totals.finalTotal
    return sum
  }, { netKg: 0, gross: 0, useTotal: 0, wages: 0, result: 0 })
  return <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
    <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-plantation-700 hover:underline"><ArrowLeft size={16} /> Semua lahan</button>
    <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-plantation-950 via-plantation-900 to-plantation-700 p-6 text-white shadow-soft md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Rincian lahan</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl text-white">{farm.name}</h1><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">{farm.owner && <span className="inline-flex items-center gap-1.5"><UserRound size={15} />{farm.owner}</span>}<span className="inline-flex items-center gap-1.5"><MapPin size={15} />{farm.location || 'Lokasi belum diisi'}</span>{farm.areaHa && <span>{farm.areaHa} hektare</span>}</div></div><div className="flex flex-wrap gap-2"><button type="button" className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15" onClick={onEditFarm}><Pencil size={16} /> Edit data lahan</button><button className="btn-gold" onClick={onAdd}><Plus size={17} /> Catat panen</button></div></div>{farm.note && <p className="mt-4 max-w-2xl rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">{farm.note}</p>}</header>
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<Weight size={17} />} label="Berat bersih hari ini" value={`${today.netKg.toLocaleString('id-ID')} kg`} delay={0} /><Stat icon={<CircleDollarSign size={17} />} label="Hasil panen hari ini" value={money(today.gross)} delay={70} /><Stat icon={<TrendingUp size={17} />} label="Pemakaian + upah hari ini" value={money(today.useTotal + today.wages)} delay={140} /><Stat icon={<BadgePercent size={17} />} label="Hasil akhir hari ini" value={money(today.result)} delay={210} /></section>
    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"><div><h2 className="font-display text-xl text-plantation-950">Riwayat panen dan pembagian hasil</h2><p className="mt-1 text-xs text-ink-500">Buka ikon mata untuk rincian lengkap. Unduh laporan berisi detail tiap catatan panen.</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-plantation-700/10 px-3 py-1 text-xs font-medium text-plantation-700">{rows.length} catatan</span><button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={() => exportFarmDetailsPdf(farm)} disabled={!rows.length}><Download size={15} /> Unduh laporan detail</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1400px]"><thead><tr>{['Tanggal','Pengurus','Berat bersih','Harga / kg','Hasil panen','Pemakaian','Upah 10%','Hasil akhir','Pembagian hasil','Catatan','Aksi'].map((label) => <th className="table-head" key={label}>{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="11" className="py-12 text-center text-sm text-ink-500">Belum ada catatan panen di lahan ini. Pilih “Catat panen” untuk menambahkan.</td></tr> : rows.map((row) => {
      const totals = getFarmHarvestTotals(row)
      const fruitRows = row.fruitRows?.length ? row.fruitRows : Number(row.fruitNetKg ?? row.netKg) > 0 ? [{ netKg: row.fruitNetKg ?? row.netKg, pricePerKg: row.fruitPricePerKg ?? row.pricePerKg }] : []
      const brondolanRows = row.brondolanRows?.length ? row.brondolanRows : Number(row.brondolanNetKg) > 0 ? [{ netKg: row.brondolanNetKg, pricePerKg: row.brondolanPricePerKg }] : []
      const ketekRows = row.ketekRows?.length ? row.ketekRows : Number(row.ketekNetKg) > 0 ? [{ netKg: row.ketekNetKg, pricePerKg: row.ketekPricePerKg }] : []
      return <tr key={row.id}><td className="table-cell whitespace-nowrap">{formatShortDate(row.date)}</td><td className="table-cell">{managerLabel(row.manager)}</td><td className="table-cell text-right">{Number(row.netKg || 0).toLocaleString('id-ID')} kg</td><td className="table-cell text-right text-xs"><div className="space-y-1">{fruitRows.map((item, index) => <div key={`f-${index}`}>Buah {fruitRows.length > 1 ? index + 1 : ''} · {Number(item.netKg || 0).toLocaleString('id-ID')} kg @ {money(item.pricePerKg)}</div>)}{brondolanRows.map((item, index) => <div key={`b-${index}`}>Brondolan {brondolanRows.length > 1 ? index + 1 : ''} · {Number(item.netKg || 0).toLocaleString('id-ID')} kg @ {money(item.pricePerKg)}</div>)}{ketekRows.map((item, index) => <div key={`k-${index}`}>Ketek {ketekRows.length > 1 ? index + 1 : ''} · {Number(item.netKg || 0).toLocaleString('id-ID')} kg @ {money(item.pricePerKg)}</div>)}</div></td><td className="table-cell text-right font-medium">{money(totals.grossTotal)}</td><td className="table-cell"><UseList uses={row.uses || []} total={totals.useTotal} /></td><td className="table-cell text-right">{money(totals.managerWage)}</td><td className="table-cell text-right font-semibold text-plantation-900">{money(totals.finalTotal)}</td><td className="table-cell"><ShareList shares={row.distribution || []} /></td><td className="table-cell text-ink-500">{row.note || '—'}</td><td className="table-cell"><div className="flex items-center gap-1"><button type="button" onClick={() => onViewRecord(row)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-plantation-800 hover:bg-plantation-50" aria-label={`Lihat detail panen ${formatShortDate(row.date)}`} title="Lihat detail"><Eye size={15} /> Lihat</button><button type="button" onClick={() => onEdit(row)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-plantation-800 hover:bg-plantation-50" aria-label={`Edit panen ${formatShortDate(row.date)}`}><Pencil size={14} /> Edit</button><button type="button" onClick={() => onDelete(row)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50" aria-label={`Hapus panen ${formatShortDate(row.date)}`}><Trash2 size={14} /> Hapus</button></div></td></tr>
    })}</tbody></table></div></section>
    {showForm && <HarvestDialog farmName={farm.name} form={form} setForm={setForm} error={error} onClose={onCloseForm} onSubmit={onSubmit} editing={Boolean(editingRecordId)} />}
    {showFarmForm && <FarmFormDialog title="Edit data lahan" form={farmForm} setForm={setFarmForm} error={farmError} onClose={onCloseFarmForm} onSubmit={onSaveFarm} editing={editingFarm} />}
    {viewRecord && <HarvestDetailDialog farm={farm} record={viewRecord} onClose={onCloseViewRecord} />}
  </main>
}

function UseList({ uses, total }) {
  const validUses = uses.filter((item) => item.purpose || Number(item.amount) > 0)
  if (!validUses.length) return <span className="text-ink-400">—</span>
  return <div className="min-w-40 space-y-1">{validUses.map((item, index) => <p key={item.id || index} className="flex justify-between gap-3 text-xs"><span className="max-w-32 truncate text-ink-600">{item.purpose}</span><span className="whitespace-nowrap text-ink-700">{money(item.amount)}</span></p>)}<p className="flex justify-between gap-3 border-t border-ink-900/10 pt-1 text-xs font-semibold"><span>Total</span><span>{money(total)}</span></p></div>
}

function ShareList({ shares }) {
  if (!shares.length) return <span className="text-ink-400">Tidak dibagi</span>
  return <div className="min-w-36 space-y-1">{shares.map((share, index) => <p key={`${share.name}-${index}`} className="flex justify-between gap-3 text-xs"><span className="max-w-24 truncate text-ink-600">{share.name}</span><span className="whitespace-nowrap font-medium text-ink-700">{money(share.amount)}</span></p>)}</div>
}

function HarvestDialog({ farmName, form, setForm, error, onClose, onSubmit, editing = false }) {
  const fruitRows = (form.fruitRows || []).map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) }))
  const brondolanRows = (form.brondolanRows || []).map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) }))
  const ketekRows = (form.ketekRows || []).map((row) => ({ ...row, netKg: parseNumeric(row.netKg), pricePerKg: parseNumeric(row.pricePerKg) }))
  const fruitNetKg = fruitRows.reduce((sum, row) => sum + row.netKg, 0)
  const brondolanNetKg = brondolanRows.reduce((sum, row) => sum + row.netKg, 0)
  const ketekNetKg = ketekRows.reduce((sum, row) => sum + row.netKg, 0)
  const netKg = fruitNetKg + brondolanNetKg + ketekNetKg
  const uses = form.uses.map((item) => ({ ...item, amount: parseNumeric(item.amount) }))
  const { grossTotal: gross, primaryUse, additionalUseTotal, managerWage: wage, finalTotal: result } = calculateFarmHarvest({ fruitRows, brondolanRows, ketekRows, uses, manager: form.manager })
  const previewShares = splitFarmResultEqually(result, form.shareNames || [])

  function updateUse(id, key, value) {
    setForm((current) => ({ ...current, uses: current.uses.map((item) => item.id === id ? { ...item, [key]: key === 'amount' ? formatNumericInput(value) : value } : item) }))
  }

  function updateYield(type, id, key, value) {
    setForm((current) => ({ ...current, [type]: current[type].map((item) => item.id === id ? { ...item, [key]: formatNumericInput(value) } : item) }))
  }

  function renderYieldRows(type, label) {
    const rows = form[type] || []
    return <section className="grid gap-4 rounded-xl border border-ink-900/10 p-4 sm:grid-cols-2"><div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-ink-800">{label}</h3><p className="mt-1 text-xs text-ink-500">Setiap baris bisa memakai berat dan harga yang berbeda.</p></div><button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setForm((current) => ({ ...current, [type]: [...current[type], newYield()] }))}><Plus size={15} /> Tambah {label.toLowerCase()}</button></div>{rows.map((row, index) => <div key={row.id} className="sm:col-span-2 grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"><Field label={`Berat bersih ${label.toLowerCase()} ${index + 1} (kg)`}><input inputMode="decimal" className="input" value={row.netKg} onChange={(event) => updateYield(type, row.id, 'netKg', event.target.value)} placeholder="Contoh: 1.250,5" /></Field><Field label={`Harga ${label.toLowerCase()} ${index + 1} per kg (Rp)`}><input inputMode="numeric" className="input" value={row.pricePerKg} onChange={(event) => updateYield(type, row.id, 'pricePerKg', event.target.value)} placeholder="Contoh: 3.000" /></Field><button type="button" disabled={rows.length === 1} className="mb-1 inline-flex h-10 items-center justify-center rounded-lg px-3 text-ink-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" onClick={() => setForm((current) => ({ ...current, [type]: current[type].filter((item) => item.id !== row.id) }))} aria-label={`Hapus baris ${label.toLowerCase()}`} title={rows.length === 1 ? 'Sisakan satu baris' : `Hapus ${label.toLowerCase()}`}><Trash2 size={17} /></button></div>)}</section>
  }

  return <Dialog title={`${editing ? 'Edit catatan panen' : 'Catat panen'} · ${farmName}`} onClose={onClose} wide><form onSubmit={onSubmit} className="space-y-5">
    <div className="rounded-xl bg-plantation-50 px-4 py-3 text-sm text-plantation-900">Upah pengurus 10% dihitung dari <strong>(hasil buah + hasil brondolan + hasil ketek) − pemakaian utama</strong>. Pemakaian tambahan mengurangi hasil akhir, tetapi tidak mengubah hitungan upah.</div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal panen *"><input type="date" required className="input" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field><Field label="Pengurus panen *"><select required className="input" value={form.manager} onChange={(event) => setForm({ ...form, manager: event.target.value })}><option value="">Pilih pengurus</option>{MANAGERS.map((manager) => <option key={manager.value} value={manager.value}>{manager.label}</option>)}</select></Field></div>
    <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-display text-xl text-plantation-950">Hasil panen</h3><p className="mt-1 text-sm text-ink-500">Tambahkan baris sebanyak yang diperlukan. Setiap baris punya harga per kg sendiri.</p></div><p className="text-sm text-ink-500">Total bersih <strong className="text-ink-800">{netKg.toLocaleString('id-ID')} kg</strong></p></div>{renderYieldRows('fruitRows', 'Buah')}{renderYieldRows('brondolanRows', 'Brondolan')}{renderYieldRows('ketekRows', 'Ketek')}</div>
    <section className="rounded-xl border border-ink-900/10 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-ink-800">Pemakaian hasil panen</h3><p className="mt-1 text-xs text-ink-500">Pemakaian utama wajib dan mengurangi hasil panen sebelum upah 10% dihitung. Pemakaian tambahan tidak masuk hitungan upah.</p></div><button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setForm((current) => ({ ...current, uses: [...current.uses, newUse()] }))}><Plus size={15} /> Tambah pemakaian</button></div>
      <div className="space-y-3">{form.uses.map((item, index) => <div key={item.id} className="grid items-end gap-2 sm:grid-cols-[1fr_190px_auto]"><Field label={index === 0 ? 'Pemakaian utama *' : `Pemakaian tambahan · ${index + 1}`}><input required={index === 0} className="input" value={item.purpose} onChange={(event) => updateUse(item.id, 'purpose', event.target.value)} placeholder={index === 0 ? 'Wajib, contoh: hasil panen untuk kebutuhan utama' : 'Contoh: pupuk kebun'} /></Field><Field label="Nominal (Rp)"><input required={index === 0} inputMode="numeric" className="input" value={item.amount} onChange={(event) => updateUse(item.id, 'amount', event.target.value)} placeholder="Contoh: 500.000" /></Field><button type="button" disabled={index === 0} className="mb-1 inline-flex h-10 items-center justify-center rounded-lg px-3 text-ink-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" onClick={() => setForm((current) => ({ ...current, uses: current.uses.filter((use) => use.id !== item.id) }))} aria-label="Hapus pemakaian" title={index === 0 ? 'Pemakaian utama wajib' : 'Hapus pemakaian'}><Trash2 size={17} /></button></div>)}</div>
    </section>
    <FarmShareFields count={form.shareCount} names={form.shareNames} onCountChange={(count) => setForm((current) => ({ ...current, shareCount: count, shareNames: Array.from({ length: count }, (_, index) => current.shareNames?.[index] || '') }))} onNameChange={(index, name) => setForm((current) => ({ ...current, shareNames: current.shareNames.map((value, itemIndex) => itemIndex === index ? name : value) }))} />
    <Field label="Catatan panen"><textarea className="input min-h-20" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Keterangan tambahan (opsional)" /></Field>
    <section className="overflow-hidden rounded-xl border border-plantation-900/10 bg-paper-50"><div className="border-b border-ink-900/10 px-4 py-3"><h3 className="font-semibold text-ink-800">Pratinjau pembagian hasil</h3><p className="mt-1 text-xs text-ink-500">Upah 10% dihitung dari total hasil panen setelah dikurangi pemakaian utama.</p></div><div className="space-y-2 px-4 py-3 text-sm">{fruitRows.filter((row) => row.netKg || row.pricePerKg).map((row, index) => <PreviewRow key={row.id} label={`Buah ${index + 1} · ${row.netKg.toLocaleString('id-ID')} kg × ${money(row.pricePerKg)}`} value={money(Math.round(row.netKg * row.pricePerKg))} />)}{brondolanRows.filter((row) => row.netKg || row.pricePerKg).map((row, index) => <PreviewRow key={row.id} label={`Brondolan ${index + 1} · ${row.netKg.toLocaleString('id-ID')} kg × ${money(row.pricePerKg)}`} value={money(Math.round(row.netKg * row.pricePerKg))} />)}{ketekRows.filter((row) => row.netKg || row.pricePerKg).map((row, index) => <PreviewRow key={row.id} label={`Ketek ${index + 1} · ${row.netKg.toLocaleString('id-ID')} kg × ${money(row.pricePerKg)}`} value={money(Math.round(row.netKg * row.pricePerKg))} />)}<PreviewRow label="Total hasil panen" value={money(gross)} /><PreviewRow label="Total pemakaian (utama + tambahan)" value={`− ${money(primaryUse + additionalUseTotal)}`} /><PreviewRow label={`Upah pengurus · ${form.manager && form.manager !== 'none' ? '10% dari hasil setelah pemakaian utama' : 'tidak ada pengurus'}`} value={`− ${money(wage)}`} /><div className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-3"><span className="font-semibold text-ink-700">Hasil akhir</span><strong className={`font-display text-2xl ${result < 0 ? 'text-red-700' : 'text-plantation-900'}`}>{money(result)}</strong></div>{previewShares.length > 0 && <div className="space-y-1 border-t border-ink-900/10 pt-3">{previewShares.map((share, index) => <PreviewRow key={`${share.name}-${index}`} label={`Bagian ${share.name || `penerima ${index + 1}`}`} value={money(share.amount)} />)}</div>}</div></section>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <button className="btn-primary w-full"><Sprout size={16} /> {editing ? 'Simpan perubahan' : 'Simpan catatan panen'}</button>
  </form></Dialog>
}

function PreviewRow({ label, value }) { return <div className="flex justify-between gap-4 text-ink-600"><span>{label}</span><span className="whitespace-nowrap font-medium text-ink-800">{value}</span></div> }
function Stat({ icon, label, value, delay = 0 }) { return <div className="stat-card card group flex items-center gap-3 p-4" style={{ '--stat-delay': `${delay}ms` }}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plantation-700/10 text-plantation-700 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{icon}</span><div className="min-w-0"><p className="text-xs text-ink-500">{label}</p><p className="mt-0.5 truncate font-display text-lg text-plantation-950">{value}</p></div></div> }
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }
function Dialog({ title, onClose, children, wide = false, scrollable = false }) { return <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-y-contain bg-ink-950/45 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur-sm sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className={`mx-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} ${scrollable ? 'flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden' : ''} rounded-2xl bg-white p-4 shadow-xl sm:p-6`}><div className="mb-5 flex shrink-0 items-center justify-between gap-3"><h2 className="font-display text-xl text-plantation-950">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-paper-100" aria-label="Tutup"><X size={18} /></button></div>{scrollable ? <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">{children}</div> : children}</section></div> }
