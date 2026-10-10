import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { loadItem, saveItem } from '../lib/storage'
import { todayKey } from '../lib/dateUtils'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DataContext = createContext(null)

const DEFAULT_INITIAL_CASH = 0
const COLLECTION_NAMES = ['suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs', 'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules', 'operationalExpenses', 'payrolls', 'privateFarms']
const CLOUD_DATA_CUTOFF = '2026-10-10'

function keepCloudRecord(collection, item) {
  if (!item || typeof item !== 'object') return false
  if (collection === 'privateFarms') {
    return {
      ...item,
      records: (Array.isArray(item.records) ? item.records : []).filter((record) => {
        const oldDate = record?.date && record.date < CLOUD_DATA_CUTOFF
        const oldCreation = !record?.createdAt || record.createdAt.slice(0, 10) < CLOUD_DATA_CUTOFF
        return !oldDate || !oldCreation
      }),
    }
  }
  if (collection === 'payrolls' && typeof item.period === 'string') {
    return item.period.slice(0, 7) >= CLOUD_DATA_CUTOFF.slice(0, 7) ? item : false
  }

  const recordDate = typeof item.date === 'string'
    ? item.date
    : typeof item.createdAt === 'string'
      ? item.createdAt.slice(0, 10)
      : ''
  const oldCreation = !item.createdAt || item.createdAt.slice(0, 10) < CLOUD_DATA_CUTOFF
  return !recordDate || recordDate >= CLOUD_DATA_CUTOFF || !oldCreation ? item : false
}

export function DataProvider({ children }) {
  const { currentUser, authReady } = useAuth()
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
  const [cloudReady, setCloudReady] = useState(!isSupabaseConfigured)
  const [cloudError, setCloudError] = useState('')
  const cloudBaseline = useRef({})
  const collectionSetters = {
    suppliers: setSuppliers, transactions: setTransactions, dailyCash: setDailyCash,
    topups: setTopups, cashLoans: setCashLoans, auditLogs: setAuditLogs,
    cancellationRequests: setCancellationRequests, cashUnlockRequests: setCashUnlockRequests,
    harvestSchedules: setHarvestSchedules, operationalExpenses: setOperationalExpenses,
    payrolls: setPayrolls, privateFarms: setPrivateFarms,
  }
  const collectionValues = { suppliers, transactions, dailyCash, topups, cashLoans, auditLogs, cancellationRequests, cashUnlockRequests, harvestSchedules, operationalExpenses, payrolls, privateFarms }
  const collectionValuesRef = useRef(collectionValues)
  collectionValuesRef.current = collectionValues

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
    const syncStorageChange = (event) => {
      if (isSupabaseConfigured) return
      if (!event.key?.startsWith('kebunkas_') || event.newValue === null) return
      const setter = collectionSetters[event.key.slice('kebunkas_'.length)]
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

  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (!authReady) return
    if (!currentUser) { setCloudReady(false); return }
    let active = true
    let channel
    setCloudReady(false)
    setCloudError('')

    async function hydrateCloudData() {
      const { data, error } = await supabase.from('app_records').select('collection, record_id, data')
      if (error) throw error
      const grouped = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, []]))
      for (const row of data || []) if (grouped[row.collection]) grouped[row.collection].push(row.data)

      // Merge the legacy local cache once on the first owner login; cloud records win on duplicate IDs.
      const localMigrationDone = window.localStorage.getItem('kebunkas_cloud_migration_done') === 'true'
      if (currentUser.role === 'owner' && !localMigrationDone) {
        const additions = []
        for (const name of COLLECTION_NAMES) {
          const knownIds = new Set(grouped[name].map((item) => String(item.id)))
          const localItems = (collectionValuesRef.current[name] || []).map((item) => keepCloudRecord(name, item)).filter(Boolean)
          const missing = localItems.filter((item) => item?.id && !knownIds.has(String(item.id)))
          if (missing.length) {
            grouped[name] = [...grouped[name], ...missing]
            additions.push(...missing.map((item) => ({ collection: name, record_id: String(item.id), data: item })))
          }
        }
        if (additions.length) {
          const { error: migrateError } = await supabase.from('app_records').upsert(additions, { onConflict: 'collection,record_id' })
          if (migrateError) throw migrateError
        }
        window.localStorage.setItem('kebunkas_cloud_migration_done', 'true')
      }

      if (!active) return
      const rawCloudData = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, [...grouped[name]]]))
      for (const name of COLLECTION_NAMES) {
        grouped[name] = grouped[name].map((item) => keepCloudRecord(name, item)).filter(Boolean)
      }
      cloudBaseline.current = Object.fromEntries(COLLECTION_NAMES.map((name) => {
        // Owners can clean old rows from Supabase on sync. Admins only hide them
        // locally because their RLS permissions correctly prevent deletion.
        const baselineItems = currentUser.role === 'owner' ? rawCloudData[name] : grouped[name]
        return [name, new Map(baselineItems.map((item) => [String(item.id), item]))]
      }))
      for (const name of COLLECTION_NAMES) collectionSetters[name](grouped[name])
      setCloudReady(true)

      channel = supabase.channel(`kebunkas-records-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_records' }, (payload) => {
          const row = payload.new?.collection ? payload.new : payload.old
          if (!row?.collection || !collectionSetters[row.collection]) return
          const collection = row.collection
          const id = String((payload.new?.record_id || payload.old?.record_id || ''))
          if (!id) return
          const baseline = new Map(cloudBaseline.current[collection] || [])
          const current = new Map(baseline)
          if (payload.eventType === 'DELETE') { baseline.delete(id); current.delete(id) }
          else { baseline.set(id, payload.new.data); current.set(id, payload.new.data) }
          cloudBaseline.current = { ...cloudBaseline.current, [collection]: baseline }
          collectionSetters[collection]([...current.values()])
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setCloudError('Koneksi sinkronisasi terputus. Muat ulang halaman untuk menyambungkan kembali.')
        })
    }

    hydrateCloudData().catch((error) => {
      console.error('Gagal memuat data Supabase:', error)
      if (active) { setCloudError('Data cloud belum dapat dimuat. Periksa konfigurasi dan jalankan supabase/schema.sql.'); setCloudReady(false) }
    })
    return () => { active = false; if (channel) supabase.removeChannel(channel) }
  }, [authReady, currentUser?.id, currentUser?.role])

  function syncCollectionToCloud(collection, items) {
    if (!isSupabaseConfigured || !cloudReady || !currentUser || !Array.isArray(items)) return
    const previous = cloudBaseline.current[collection] || new Map()
    const next = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]))
    const changed = [...next.entries()].filter(([id, item]) => JSON.stringify(previous.get(id)) !== JSON.stringify(item))
    const removed = [...previous.keys()].filter((id) => !next.has(id))
    if (!changed.length && !removed.length) return
    // Optimistic per-record baseline keeps unrelated edits on different devices from replacing an entire collection.
    cloudBaseline.current = { ...cloudBaseline.current, [collection]: next }
    const rows = changed.map(([id, item]) => ({ collection, record_id: id, data: item }))
    Promise.all([
      rows.length ? supabase.from('app_records').upsert(rows, { onConflict: 'collection,record_id' }) : Promise.resolve({ error: null }),
      removed.length ? supabase.from('app_records').delete().eq('collection', collection).in('record_id', removed) : Promise.resolve({ error: null }),
    ]).then((results) => {
      const failure = results.find((result) => result.error)?.error
      if (failure) {
        console.error(`Gagal menyimpan ${collection} ke Supabase:`, failure)
        cloudBaseline.current = { ...cloudBaseline.current, [collection]: previous }
        setCloudError('Sebagian perubahan belum tersimpan ke cloud. Periksa koneksi sebelum berpindah perangkat.')
      } else setCloudError('')
    })
  }

  useEffect(() => { syncCollectionToCloud('suppliers', suppliers) }, [suppliers, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('transactions', transactions) }, [transactions, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('dailyCash', dailyCash) }, [dailyCash, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('topups', topups) }, [topups, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('cashLoans', cashLoans) }, [cashLoans, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('auditLogs', auditLogs) }, [auditLogs, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('cancellationRequests', cancellationRequests) }, [cancellationRequests, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('cashUnlockRequests', cashUnlockRequests) }, [cashUnlockRequests, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('harvestSchedules', harvestSchedules) }, [harvestSchedules, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('operationalExpenses', operationalExpenses) }, [operationalExpenses, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('payrolls', payrolls) }, [payrolls, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('privateFarms', privateFarms) }, [privateFarms, cloudReady, currentUser?.id])

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
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengatur kas awal secara langsung.' }
    setDailyCash((prev) => {
      const existing = prev.find((d) => d.date === dateKey)
      if (existing) {
        return prev.map((d) => (d.date === dateKey ? { ...d, initialAmount: amount, createdAt: new Date().toISOString() } : d))
      }
      return [...prev, { id: `dc-${dateKey}`, date: dateKey, adminId, initialAmount: amount, status: 'open', createdAt: new Date().toISOString() }]
    })
    addAuditLog({ action: 'Mengatur kas awal', actorId: adminId, detail: `${dateKey}: Rp${Number(amount).toLocaleString('id-ID')}` })
    return { ok: true }
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

  function requestCashLoanDeletion({ cashLoanId, reason, requestedBy }) {
    const loan = cashLoans.find((item) => item.id === cashLoanId)
    if (!loan) return { ok: false, message: 'Pinjaman tidak ditemukan.' }
    const exists = cancellationRequests.some((request) => request.kind === 'cashLoanDeletion' && request.cashLoanId === cashLoanId && request.status === 'pending')
    if (exists) return { ok: false, message: 'Permintaan penghapusan pinjaman ini masih menunggu persetujuan owner.' }
    if (!reason?.trim()) return { ok: false, message: 'Alasan penghapusan wajib diisi.' }
    const request = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'cashLoanDeletion',
      cashLoanId,
      reason: reason.trim(),
      requestedBy,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setCancellationRequests((prev) => [request, ...prev])
    addAuditLog({ action: 'Mengajukan penghapusan pinjaman kas', actorId: requestedBy, detail: `${loan.name}: Rp${Number(loan.amount).toLocaleString('id-ID')} · ${reason.trim()}` })
    return { ok: true }
  }

  function requestCashInitialEdit({ date, amount, reason, requestedBy }) {
    if (currentUser?.role !== 'admin') return { ok: false, message: 'Pengajuan perubahan kas hanya tersedia untuk admin.' }
    const cash = dailyCash.find((item) => item.date === date)
    const newAmount = Number(amount)
    if (!Number.isFinite(newAmount) || newAmount < 0) return { ok: false, message: 'Kas awal harus 0 atau lebih.' }
    if (!reason?.trim()) return { ok: false, message: 'Alasan perubahan wajib diisi.' }
    const exists = cancellationRequests.some((request) => request.kind === 'cashInitialEdit' && request.date === date && request.status === 'pending')
    if (exists) return { ok: false, message: 'Permintaan perubahan kas untuk tanggal ini masih menunggu owner.' }
    const request = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'cashInitialEdit',
      date,
      oldAmount: cash ? Number(cash.initialAmount) || 0 : null,
      newAmount,
      createIfMissing: !cash,
      reason: reason.trim(),
      requestedBy,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setCancellationRequests((prev) => [request, ...prev])
    addAuditLog({ action: 'Mengajukan perubahan kas awal', actorId: requestedBy, detail: `${date}: ${cash ? `Rp${request.oldAmount.toLocaleString('id-ID')}` : 'belum diatur'} → Rp${newAmount.toLocaleString('id-ID')} · ${reason.trim()}` })
    return { ok: true }
  }

  // ---- Transaksi ----
  function addTransaction(tx) {
    const grossKg = Number(tx.grossKg ?? tx.weightKg) || 0
    const netKg = Number(tx.netKg ?? tx.weightKg) || 0
    const total = Math.round(netKg * Number(tx.pricePerKg))
    const countToday = transactions.filter((item) => item.date === tx.date).length + 1
    const generatedNota = `PB-${tx.date.replaceAll('-', '')}-${String(countToday).padStart(3, '0')}`
    const record = { id: `t-${Date.now()}`, status: 'open', ...tx, grossKg, netKg, weightKg: netKg, total, notaNumber: generatedNota, createdAt: new Date().toISOString() }
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
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat memutuskan permintaan.' }
    const request = cancellationRequests.find((item) => item.id === requestId)
    if (!request || request.status !== 'pending') return { ok: false, message: 'Permintaan sudah diproses atau tidak ditemukan.' }
    const approved = decision === 'approved'
    setCancellationRequests((prev) => prev.map((item) => item.id === requestId ? { ...item, status: approved ? 'approved' : 'rejected', resolvedBy: ownerId, resolvedAt: new Date().toISOString() } : item))
    if (request.kind === 'cashLoanDeletion') {
      const loan = cashLoans.find((item) => item.id === request.cashLoanId)
      if (approved && loan) setCashLoans((prev) => prev.filter((item) => item.id !== request.cashLoanId))
      addAuditLog({
        action: approved ? 'Menyetujui penghapusan pinjaman kas' : 'Menolak penghapusan pinjaman kas',
        actorId: ownerId,
        detail: `${loan ? `${loan.name}: Rp${Number(loan.amount).toLocaleString('id-ID')} · ` : ''}${request.reason}`,
      })
      return { ok: true }
    }
    if (request.kind === 'cashInitialEdit') {
      if (approved) {
        setDailyCash((prev) => {
          const existing = prev.find((cash) => cash.date === request.date)
          if (existing) return prev.map((cash) => cash.date === request.date ? { ...cash, initialAmount: Number(request.newAmount) || 0, createdAt: new Date().toISOString() } : cash)
          return [...prev, { id: `dc-${request.date}`, date: request.date, adminId: request.requestedBy, initialAmount: Number(request.newAmount) || 0, status: 'open', createdAt: new Date().toISOString() }]
        })
      }
      addAuditLog({
        action: approved ? 'Menyetujui perubahan kas awal' : 'Menolak perubahan kas awal',
        actorId: ownerId,
        detail: `${request.date}: ${request.oldAmount === null ? 'belum diatur' : `Rp${Number(request.oldAmount).toLocaleString('id-ID')}`} → Rp${Number(request.newAmount).toLocaleString('id-ID')} · ${request.reason}`,
      })
      return { ok: true }
    }
    if (approved) {
      setTransactions((prev) => prev.map((transaction) => transaction.id === request.transactionId ? { ...transaction, status: 'voided', voidedAt: new Date().toISOString(), voidedBy: ownerId } : transaction))
    }
    addAuditLog({ action: approved ? 'Menyetujui pembatalan transaksi' : 'Menolak pembatalan transaksi', actorId: ownerId, transactionId: request.transactionId, detail: request.reason })
    return { ok: true }
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
    const totalUsed = todaysTx.reduce((sum, t) => sum + (t.paymentMethod === 'transfer' ? 0 : Number(t.total)), 0)
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
    requestCashLoanDeletion,
    requestCashInitialEdit,
    getCashSummary,
    DEFAULT_INITIAL_CASH,
    today: todayKey(),
    cloudReady,
    cloudError,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData harus dipakai di dalam <DataProvider>')
  return ctx
}
