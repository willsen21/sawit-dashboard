import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { loadItem, saveItem } from '../lib/storage'
import { todayKey } from '../lib/dateUtils'

const DataContext = createContext(null)

const DEFAULT_INITIAL_CASH = 0

export function DataProvider({ children }) {
  const [suppliers, setSuppliers] = useState(() => loadItem('suppliers', []))
  const [transactions, setTransactions] = useState(() => loadItem('transactions', []))
  const [dailyCash, setDailyCash] = useState(() => loadItem('dailyCash', []))
  const [topups, setTopups] = useState(() => loadItem('topups', []))
  const [cashLoans, setCashLoans] = useState(() => loadItem('cashLoans', []))
  const [auditLogs, setAuditLogs] = useState(() => loadItem('auditLogs', []))
  const [cancellationRequests, setCancellationRequests] = useState(() => loadItem('cancellationRequests', []))
  const [cashUnlockRequests, setCashUnlockRequests] = useState(() => loadItem('cashUnlockRequests', []))
  const [harvestSchedules, setHarvestSchedules] = useState(() => loadItem('harvestSchedules', []))
  const [operationalExpenses, setOperationalExpenses] = useState(() => loadItem('operationalExpenses', []))
  const [payrolls, setPayrolls] = useState(() => loadItem('payrolls', []))
  const [privateFarms, setPrivateFarms] = useState(() => loadItem('privateFarms', []))

  useLayoutEffect(() => {
  saveItem('suppliers', suppliers)
}, [suppliers])
useLayoutEffect(() => {
  saveItem('transactions', transactions)
}, [transactions])
useLayoutEffect(() => {
  saveItem('dailyCash', dailyCash)
}, [dailyCash])
useLayoutEffect(() => {
  saveItem('topups', topups)
}, [topups])
useLayoutEffect(() => {
  saveItem('cashLoans', cashLoans)
}, [cashLoans])
useLayoutEffect(() => {
  saveItem('auditLogs', auditLogs)
}, [auditLogs])
useLayoutEffect(() => {
  saveItem('cancellationRequests', cancellationRequests)
}, [cancellationRequests])
useLayoutEffect(() => {
  saveItem('cashUnlockRequests', cashUnlockRequests)
}, [cashUnlockRequests])
useLayoutEffect(() => {
  saveItem('harvestSchedules', harvestSchedules)
}, [harvestSchedules])
useLayoutEffect(() => {
  saveItem('operationalExpenses', operationalExpenses)
}, [operationalExpenses])
useLayoutEffect(() => {
  saveItem('payrolls', payrolls)
}, [payrolls])
useLayoutEffect(() => {
  saveItem('privateFarms', privateFarms)
}, [privateFarms])

  useEffect(() => {
    const setters = {
      suppliers: setSuppliers,
      transactions: setTransactions,
      dailyCash: setDailyCash,
      topups: setTopups,
      cashLoans: setCashLoans,
      auditLogs: setAuditLogs,
      cancellationRequests: setCancellationRequests,
      cashUnlockRequests: setCashUnlockRequests,
      harvestSchedules: setHarvestSchedules,
      operationalExpenses: setOperationalExpenses,
      payrolls: setPayrolls,
      privateFarms: setPrivateFarms,
    }
    const syncStorageChange = (event) => {
      if (!event.key?.startsWith('kebunkas_') || event.newValue === null) return
      const setter = setters[event.key.slice('kebunkas_'.length)]
      if (!setter) return
      try {
        setter(JSON.parse(event.newValue))
      } catch (error) {
        console.error('Gagal menyinkronkan perubahan antar-tab:', error)
      }
    }
    window.addEventListener('storage', syncStorageChange)
    return () => window.removeEventListener('storage', syncStorageChange)
  }, [])

  function addAuditLog({ action, actorId, transactionId = null, detail }) {
    setAuditLogs((prev) => [{
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      actorId,
      transactionId,
      detail,
      createdAt: new Date().toISOString(),
    }, ...prev])
  }

  // ---- Supplier ----
  function addSupplier({ name, contact, kebun }) {
    const supplier = { id: `s-${Date.now()}`, name, contact, kebun }
    setSuppliers((prev) => [...prev, supplier])
    return supplier
  }

  function removeSupplier(id) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }

  // ---- Kas harian ----
  function getDailyCash(dateKey) {
    return dailyCash.find((d) => d.date === dateKey) || null
  }

  function setInitialCash(dateKey, adminId, amount) {
    setDailyCash((prev) => {
      const existing = prev.find((d) => d.date === dateKey)
      if (existing) {
        return prev.map((d) => (d.date === dateKey ? { ...d, initialAmount: amount } : d))
      }
      return [...prev, { id: `dc-${dateKey}`, date: dateKey, adminId, initialAmount: amount, status: 'open' }]
    })
    addAuditLog({ action: 'Mengatur kas awal', actorId: adminId, detail: `${dateKey}: Rp${Number(amount).toLocaleString('id-ID')}` })
  }

  function lockDay(dateKey, actorId) {
    setDailyCash((prev) => prev.map((d) => (d.date === dateKey ? { ...d, status: 'locked' } : d)))
    addAuditLog({ action: 'Menutup kas harian', actorId, detail: dateKey })
  }

  function unlockDay(dateKey, actorId) {
    setDailyCash((prev) => prev.map((d) => (d.date === dateKey ? { ...d, status: 'open' } : d)))
    addAuditLog({ action: 'Membuka kembali kas', actorId, detail: dateKey })
  }

  function requestCashUnlock({ date, reason, requestedBy }) {
    const exists = cashUnlockRequests.some((request) => request.date === date && request.status === 'pending')
    if (exists) return { ok: false, message: 'Permintaan buka kas untuk hari ini masih menunggu persetujuan owner.' }
    const request = { id: `cu-${Date.now()}`, date, reason: reason.trim(), requestedBy, status: 'pending', createdAt: new Date().toISOString() }
    setCashUnlockRequests((prev) => [request, ...prev])
    addAuditLog({ action: 'Mengajukan buka kas', actorId: requestedBy, detail: `${date}: ${reason.trim()}` })
    return { ok: true }
  }

  function resolveCashUnlock(requestId, decision, ownerId) {
    const request = cashUnlockRequests.find((item) => item.id === requestId)
    if (!request || request.status !== 'pending') return
    const approved = decision === 'approved'
    setCashUnlockRequests((prev) => prev.map((item) => item.id === requestId ? { ...item, status: approved ? 'approved' : 'rejected', resolvedBy: ownerId, resolvedAt: new Date().toISOString() } : item))
    if (approved) setDailyCash((prev) => prev.map((day) => day.date === request.date ? { ...day, status: 'open' } : day))
    addAuditLog({ action: approved ? 'Menyetujui buka kas' : 'Menolak buka kas', actorId: ownerId, detail: `${request.date}: ${request.reason}` })
  }

  function addTopup({ date, time, amount, source, note, adminId }) {
    const topup = { id: `tu-${Date.now()}`, date, time, amount, source, note, adminId }
    setTopups((prev) => [...prev, topup])
    addAuditLog({ action: 'Menambah top-up kas', actorId: adminId, detail: `${date}: Rp${Number(amount).toLocaleString('id-ID')}` })
    return topup
  }

  function addCashLoan({ date, name, amount, reason, adminId }) {
    const summary = getCashSummary(date)
    const numericAmount = Number(amount) || 0
    if (!name?.trim() || !reason?.trim() || numericAmount <= 0) return { ok: false, message: 'Nama, jumlah, dan alasan pinjaman wajib diisi.' }
    if (summary.status === 'locked') return { ok: false, message: 'Kas hari ini sedang ditutup.' }
    if (numericAmount > summary.remaining) return { ok: false, message: `Sisa kas tidak cukup. Kas tersedia: Rp${summary.remaining.toLocaleString('id-ID')}.` }
    const loan = { id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, name: name.trim(), amount: numericAmount, reason: reason.trim(), adminId, createdAt: new Date().toISOString() }
    setCashLoans((prev) => [loan, ...prev])
    addAuditLog({ action: 'Mencatat pinjaman kas', actorId: adminId, detail: `${loan.name}: Rp${loan.amount.toLocaleString('id-ID')} · ${loan.reason}` })
    return { ok: true, loan }
  }

  // ---- Transaksi ----
  function addTransaction(tx) {
    const grossKg = Number(tx.grossKg ?? tx.weightKg) || 0
    const netKg = Number(tx.netKg ?? tx.weightKg) || 0
    const total = Math.round(netKg * Number(tx.pricePerKg))
    const countToday = transactions.filter((item) => item.date === tx.date).length + 1
    const generatedNota = `PB-${tx.date.replaceAll('-', '')}-${String(countToday).padStart(3, '0')}`
    const record = { id: `t-${Date.now()}`, status: 'open', ...tx, grossKg, netKg, weightKg: netKg, total, notaNumber: generatedNota }
    setTransactions((prev) => [record, ...prev])
    addAuditLog({ action: 'Mencatat pembelian', actorId: tx.adminId, transactionId: record.id, detail: `${record.notaNumber}: kotor ${grossKg.toLocaleString('id-ID')} kg, bersih ${netKg.toLocaleString('id-ID')} kg` })
    return record
  }

  function updateTransaction(id, patch, actorId = 'system') {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const merged = { ...t, ...patch }
        merged.netKg = Number(merged.netKg ?? merged.weightKg) || 0
        merged.grossKg = Number(merged.grossKg ?? merged.weightKg) || 0
        merged.weightKg = merged.netKg
        merged.total = Math.round(merged.netKg * Number(merged.pricePerKg))
        return merged
      })
    )
    addAuditLog({ action: 'Memperbarui transaksi', actorId, transactionId: id, detail: Object.keys(patch).join(', ') })
  }

  function requestCancellation({ transactionId, reason, requestedBy }) {
    const exists = cancellationRequests.some((request) => request.transactionId === transactionId && request.status === 'pending')
    if (exists) return { ok: false, message: 'Permintaan pembatalan untuk transaksi ini masih menunggu persetujuan.' }
    const request = { id: `cr-${Date.now()}`, transactionId, reason: reason.trim(), requestedBy, status: 'pending', createdAt: new Date().toISOString() }
    setCancellationRequests((prev) => [request, ...prev])
    addAuditLog({ action: 'Mengajukan pembatalan transaksi', actorId: requestedBy, transactionId, detail: reason.trim() })
    return { ok: true }
  }

  function resolveCancellation(requestId, decision, ownerId) {
    const request = cancellationRequests.find((item) => item.id === requestId)
    if (!request || request.status !== 'pending') return
    const approved = decision === 'approved'
    setCancellationRequests((prev) => prev.map((item) => item.id === requestId ? { ...item, status: approved ? 'approved' : 'rejected', resolvedBy: ownerId, resolvedAt: new Date().toISOString() } : item))
    if (approved) {
      setTransactions((prev) => prev.map((transaction) => transaction.id === request.transactionId ? { ...transaction, status: 'voided', voidedAt: new Date().toISOString(), voidedBy: ownerId } : transaction))
    }
    addAuditLog({ action: approved ? 'Menyetujui pembatalan transaksi' : 'Menolak pembatalan transaksi', actorId: ownerId, transactionId: request.transactionId, detail: request.reason })
  }

  // ---- Operasional kebun (khusus owner) ----
  function addPrivateFarm(farmData) {
    const farm = { ...farmData, id: `farm-${Date.now()}`, records: [], createdAt: new Date().toISOString() }
    setPrivateFarms((prev) => [farm, ...prev])
    return farm
  }

  function addPrivateHarvestRecord(farmId, recordData) {
    const farm = privateFarms.find((item) => item.id === farmId)
    if (!farm) return null
    const record = { ...recordData, id: `harvest-${Date.now()}` }
    setPrivateFarms((prev) => prev.map((item) => item.id === farmId ? { ...item, records: [record, ...(item.records || [])].sort((a, b) => b.date.localeCompare(a.date)) } : item))
    return record
  }

  function addHarvestSchedule({ date, farmId, farmName, block, pic, workers, estimatedKg, note, createdBy }) {
    const schedule = { id: `hs-${Date.now()}`, date, farmId: farmId || '', farmName: (farmName || block || '').trim(), block: (farmName || block || '').trim(), pic: pic.trim(), workers: Number(workers) || 0, estimatedKg: Number(estimatedKg) || 0, note: note.trim(), status: 'planned', createdBy, createdAt: new Date().toISOString() }
    setHarvestSchedules((prev) => [...prev, schedule].sort((a, b) => a.date.localeCompare(b.date)))
    addAuditLog({ action: 'Membuat jadwal panen', actorId: createdBy, detail: `${date} · ${schedule.block}` })
  }

  function updateHarvestScheduleStatus(id, status, actorId) {
    setHarvestSchedules((prev) => prev.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item))
    addAuditLog({ action: 'Memperbarui status jadwal panen', actorId, detail: status })
  }

  function addOperationalExpense({ date, category, amount, farmId, farmName, block, note, createdBy }) {
    const selectedFarm = privateFarms.find((item) => item.id === farmId)
    const expense = { id: `oe-${Date.now()}`, date, category, amount: Number(amount) || 0, farmId: farmId || '', farmName: (farmName || selectedFarm?.name || block || '').trim(), block: (farmName || selectedFarm?.name || block || '').trim(), note: note.trim(), status: 'pending', createdBy, createdAt: new Date().toISOString() }
    setOperationalExpenses((prev) => [expense, ...prev])
    addAuditLog({ action: 'Mencatat pengeluaran operasional', actorId: createdBy, detail: `${category}: Rp${expense.amount.toLocaleString('id-ID')}` })
  }

  function markOperationalExpensePaid(id, actorId) {
    setOperationalExpenses((prev) => prev.map((item) => item.id === id ? { ...item, status: 'paid', paidAt: new Date().toISOString(), paidBy: actorId } : item))
    addAuditLog({ action: 'Menandai pengeluaran sudah dibayar', actorId, detail: id })
  }

  function addPayroll({ period, employeeName, workDays, dailyRate, bonus, deduction, note, createdBy }) {
    const gross = (Number(workDays) || 0) * (Number(dailyRate) || 0) + (Number(bonus) || 0)
    const payroll = { id: `pr-${Date.now()}`, period, employeeName: employeeName.trim(), workDays: Number(workDays) || 0, dailyRate: Number(dailyRate) || 0, bonus: Number(bonus) || 0, deduction: Number(deduction) || 0, total: Math.max(0, gross - (Number(deduction) || 0)), note: note.trim(), status: 'pending', createdBy, createdAt: new Date().toISOString() }
    setPayrolls((prev) => [payroll, ...prev])
    addAuditLog({ action: 'Membuat draft gaji', actorId: createdBy, detail: `${payroll.employeeName}: Rp${payroll.total.toLocaleString('id-ID')}` })
  }

  function markPayrollPaid(id, actorId) {
    setPayrolls((prev) => prev.map((item) => item.id === id ? { ...item, status: 'paid', paidAt: new Date().toISOString(), paidBy: actorId } : item))
    addAuditLog({ action: 'Menandai gaji sudah dibayar', actorId, detail: id })
  }

  // ---- Ringkasan kas per tanggal ----
  function getCashSummary(dateKey) {
    const cash = getDailyCash(dateKey)
    const initialAmount = cash ? cash.initialAmount : DEFAULT_INITIAL_CASH
    const todaysTopups = topups.filter((t) => t.date === dateKey)
    const totalTopup = todaysTopups.reduce((sum, t) => sum + Number(t.amount), 0)
    const todaysTx = transactions.filter((t) => t.date === dateKey && t.status !== 'voided')
    const totalUsed = todaysTx.reduce((sum, t) => sum + Number(t.total), 0)
    const todaysLoans = cashLoans.filter((loan) => loan.date === dateKey)
    const totalLoans = todaysLoans.reduce((sum, loan) => sum + Number(loan.amount), 0)
    const remaining = initialAmount + totalTopup - totalUsed - totalLoans
    return {
      exists: !!cash,
      status: cash?.status || 'open',
      initialAmount,
      totalTopup,
      totalUsed,
      totalLoans,
      remaining,
      topups: todaysTopups,
      loans: todaysLoans,
      transactionCount: todaysTx.length,
    }
  }

  const supplierMap = useMemo(() => {
    const map = {}
    suppliers.forEach((s) => (map[s.id] = s))
    return map
  }, [suppliers])

  const value = {
    suppliers,
    supplierMap,
    addSupplier,
    removeSupplier,
    transactions,
    addTransaction,
    updateTransaction,
    requestCancellation,
    resolveCancellation,
    cancellationRequests,
    auditLogs,
    dailyCash,
    getDailyCash,
    setInitialCash,
    lockDay,
    unlockDay,
    requestCashUnlock,
    resolveCashUnlock,
    cashUnlockRequests,
    harvestSchedules,
    addHarvestSchedule,
    updateHarvestScheduleStatus,
    operationalExpenses,
    addOperationalExpense,
    markOperationalExpensePaid,
    payrolls,
    privateFarms,
    addPrivateFarm,
    addPrivateHarvestRecord,
    addPayroll,
    markPayrollPaid,
    topups,
    cashLoans,
    addTopup,
    addCashLoan,
    getCashSummary,
    DEFAULT_INITIAL_CASH,
    today: todayKey(),
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData harus dipakai di dalam <DataProvider>')
  return ctx
}
