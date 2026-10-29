import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { loadItem, saveItem } from '../lib/storage'
import { todayKey } from '../lib/dateUtils'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { STONE_TYPES, canonicalStoneType } from '../lib/stoneUtils'
import { parseKgInput } from '../lib/kgUtils'
import { parseRupiahInput } from '../lib/currencyInput'
import { calculateFarmHarvest } from '../lib/farmCalculations'

const DataContext = createContext(null)

const DEFAULT_INITIAL_CASH = 0
const COLLECTION_NAMES = ['suppliers', 'transactions', 'dailyCash', 'topups', 'cashLoans', 'auditLogs', 'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules', 'operationalExpenses', 'payrolls', 'privateFarms', 'rubberRecords', 'rubberFactorySales', 'stoneStock', 'stoneSales', 'pineappleStock', 'pineappleSales']
const CLOUD_DATA_CUTOFF = '2026-10-10'
const OWNER_REFRESH_COLLECTIONS = ['transactions', 'cashLoans', 'topups', 'dailyCash']
const ADMIN_REFRESH_COLLECTIONS = [...OWNER_REFRESH_COLLECTIONS, 'cancellationRequests', 'cashUnlockRequests']
const STONE_CAPITAL_CORRECTION_DATE = '2026-10-26'
const STONE_CAPITAL_STALE_CLOSE = 17_936_450
const STONE_CAPITAL_CORRECTED_CLOSE = 17_941_450

function keepCloudRecord(collection, item) {
  if (!item || typeof item !== 'object') return false
  // Keep full histories for inventory and rubber records, including older dates.
  if (collection === 'stoneStock' || collection === 'stoneSales' || collection === 'rubberRecords' || collection === 'rubberFactorySales' || collection === 'pineappleStock' || collection === 'pineappleSales') return item
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
  const [rubberRecords, setRubberRecords] = useState(() => loadItem('rubberRecords', []))
  const [rubberFactorySales, setRubberFactorySales] = useState(() => loadItem('rubberFactorySales', []))
  const [stoneStock, setStoneStock] = useState(() => loadItem('stoneStock', []))
  const [stoneSales, setStoneSales] = useState(() => loadItem('stoneSales', []))
  const [pineappleStock, setPineappleStock] = useState(() => loadItem('pineappleStock', []))
  const [pineappleSales, setPineappleSales] = useState(() => loadItem('pineappleSales', []))
  const [cloudReady, setCloudReady] = useState(!isSupabaseConfigured)
  const [cloudError, setCloudError] = useState('')
  const cloudBaseline = useRef({})
  const cloudSyncErrors = useRef({})
  const cloudRetryTimers = useRef({})
  const cloudRetryAttempts = useRef({})
  const collectionSetters = {
    suppliers: setSuppliers, transactions: setTransactions, dailyCash: setDailyCash,
    topups: setTopups, cashLoans: setCashLoans, auditLogs: setAuditLogs,
    cancellationRequests: setCancellationRequests, cashUnlockRequests: setCashUnlockRequests,
    harvestSchedules: setHarvestSchedules, operationalExpenses: setOperationalExpenses,
    payrolls: setPayrolls, privateFarms: setPrivateFarms, rubberRecords: setRubberRecords, rubberFactorySales: setRubberFactorySales, stoneStock: setStoneStock, stoneSales: setStoneSales, pineappleStock: setPineappleStock, pineappleSales: setPineappleSales,
  }
  const collectionValues = { suppliers, transactions, dailyCash, topups, cashLoans, auditLogs, cancellationRequests, cashUnlockRequests, harvestSchedules, operationalExpenses, payrolls, privateFarms, rubberRecords, rubberFactorySales, stoneStock, stoneSales, pineappleStock, pineappleSales }
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
useLayoutEffect(() => { saveItem('rubberRecords', rubberRecords) }, [rubberRecords])
useLayoutEffect(() => { saveItem('rubberFactorySales', rubberFactorySales) }, [rubberFactorySales])
useLayoutEffect(() => { saveItem('stoneStock', stoneStock) }, [stoneStock])
useLayoutEffect(() => { saveItem('stoneSales', stoneSales) }, [stoneSales])
useLayoutEffect(() => { saveItem('pineappleStock', pineappleStock) }, [pineappleStock])
useLayoutEffect(() => { saveItem('pineappleSales', pineappleSales) }, [pineappleSales])

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
    let refreshInFlight = false
    let cleanupRefresh = () => {}
    setCloudReady(false)
    setCloudError('')
    cloudSyncErrors.current = {}

    async function hydrateCloudData() {
      const { data, error } = await supabase.from('app_records').select('collection, record_id, data')
      if (error) throw error
      const grouped = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, []]))
      for (const row of data || []) if (grouped[row.collection]) grouped[row.collection].push(row.data)
      // Keep the fetched cloud snapshot separate from local migration records.
      // Otherwise a failed migration is mistaken for data already in the cloud.
      const rawCloudData = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, [...grouped[name]]]))
      const migrationWarnings = []
      const locallyRecoveredIds = new Map()

      // Merge the legacy local cache once on the first owner login; cloud records win on duplicate IDs.
      const localMigrationDone = window.localStorage.getItem('kebunkas_cloud_migration_done') === 'true'
      if (currentUser.role === 'owner') {
        const additionsByCollection = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, []]))
        for (const name of COLLECTION_NAMES) {
          // Keep the legacy migration one-time for general records, but retry
          // historical inventory and rubber records until they reach the cloud.
          if (localMigrationDone && name !== 'stoneStock' && name !== 'stoneSales' && name !== 'rubberRecords' && name !== 'rubberFactorySales' && name !== 'pineappleStock' && name !== 'pineappleSales') continue
          const knownIds = new Set(grouped[name].map((item) => String(item.id)))
          const localItems = (collectionValuesRef.current[name] || []).map((item) => keepCloudRecord(name, item)).filter(Boolean)
          const missing = localItems.filter((item) => item?.id && !knownIds.has(String(item.id)))
          if (missing.length) {
            grouped[name] = [...grouped[name], ...missing]
            additionsByCollection[name] = missing.map((item) => ({ collection: name, record_id: String(item.id), data: item }))
          }
        }
        let legacyMigrationFailed = false
        for (const [name, additions] of Object.entries(additionsByCollection)) {
          if (!additions.length) continue
          const { error: migrateError } = await supabase.from('app_records').upsert(additions, { onConflict: 'collection,record_id' })
          if (!migrateError) continue
          console.error(`Gagal memindahkan data lokal ${name} ke Supabase:`, migrateError)
          migrationWarnings.push(`${name}: ${migrateError.message}${migrateError.code ? ` (kode ${migrateError.code})` : ''}`)
          if (!['stoneStock', 'stoneSales', 'pineappleStock', 'pineappleSales'].includes(name)) legacyMigrationFailed = true
        }
        if (!localMigrationDone && !legacyMigrationFailed) window.localStorage.setItem('kebunkas_cloud_migration_done', 'true')
      } else if (currentUser.role === 'admin') {
        // Keep this admin's locally cached writes if the connection failed before
        // they reached Supabase; the normal sync effects retry the same stable IDs.
        const adminOwnedCollections = {
          transactions: 'adminId',
          topups: 'adminId',
          cashLoans: 'adminId',
          auditLogs: 'actorId',
          cancellationRequests: 'requestedBy',
          cashUnlockRequests: 'requestedBy',
          pineappleSales: 'adminId',
        }
        for (const [name, ownerField] of Object.entries(adminOwnedCollections)) {
          const cloudIds = new Set(grouped[name].map((item) => String(item.id)))
          const localItems = (collectionValuesRef.current[name] || [])
            .map((item) => keepCloudRecord(name, item))
            .filter((item) => item && item[ownerField] === currentUser.id)
          const missing = localItems.filter((item) => item.id && !cloudIds.has(String(item.id)))
          if (!missing.length) continue
          grouped[name] = [...grouped[name], ...missing]
          locallyRecoveredIds.set(name, new Set(missing.map((item) => String(item.id))))
        }
      }

      if (!active) return
      for (const name of COLLECTION_NAMES) {
        grouped[name] = grouped[name].map((item) => keepCloudRecord(name, item)).filter(Boolean)
      }
      cloudBaseline.current = Object.fromEntries(COLLECTION_NAMES.map((name) => {
        // Owners can clean old rows from Supabase on sync. Admins only hide them
        // locally because their RLS permissions correctly prevent deletion.
        const recoveredIds = locallyRecoveredIds.get(name)
        const baselineItems = currentUser.role === 'owner'
          ? rawCloudData[name]
          : recoveredIds?.size
            ? grouped[name].filter((item) => !recoveredIds.has(String(item.id)))
            : grouped[name]
        return [name, new Map(baselineItems.map((item) => [String(item.id), item]))]
      }))
      for (const name of COLLECTION_NAMES) collectionSetters[name](grouped[name])
      setCloudReady(true)
      if (migrationWarnings.length) setCloudError(`Sebagian data lokal belum terkirim ke cloud: ${migrationWarnings.join('; ')}. Periksa aturan database di Supabase.`)

      async function refreshSharedCashData() {
        if (!active || refreshInFlight) return
        refreshInFlight = true
        const refreshCollections = currentUser.role === 'owner'
          ? OWNER_REFRESH_COLLECTIONS
          : ADMIN_REFRESH_COLLECTIONS
        try {
          const { data: freshRows, error: refreshError } = await supabase.from('app_records')
            .select('collection, record_id, data')
            .in('collection', refreshCollections)
          if (refreshError) {
            console.error('Gagal memperbarui data kas dan persetujuan:', refreshError)
            return
          }
          if (!active) return
          const freshByCollection = Object.fromEntries(refreshCollections.map((name) => [name, []]))
          for (const row of freshRows || []) if (freshByCollection[row.collection]) freshByCollection[row.collection].push(row.data)
          const nextBaselines = { ...cloudBaseline.current }
          for (const name of refreshCollections) {
            const rawItems = freshByCollection[name]
            nextBaselines[name] = new Map(rawItems.map((item) => [String(item.id), item]))
            collectionSetters[name](rawItems.map((item) => keepCloudRecord(name, item)).filter(Boolean))
          }
          cloudBaseline.current = nextBaselines
        } finally {
          refreshInFlight = false
        }
      }

      const refreshOnReturn = () => {
        if (document.visibilityState === 'visible') refreshSharedCashData()
      }
      window.addEventListener('focus', refreshOnReturn)
      window.addEventListener('hashchange', refreshOnReturn)
      document.addEventListener('visibilitychange', refreshOnReturn)
      const sharedCashRefreshTimer = window.setInterval(refreshOnReturn, 10_000)
      cleanupRefresh = () => {
        window.removeEventListener('focus', refreshOnReturn)
        window.removeEventListener('hashchange', refreshOnReturn)
        document.removeEventListener('visibilitychange', refreshOnReturn)
        window.clearInterval(sharedCashRefreshTimer)
      }

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
          if (status === 'SUBSCRIBED') refreshSharedCashData()
        })
    }

    hydrateCloudData().catch((error) => {
      console.error('Gagal memuat data Supabase:', error)
      if (active) {
        const reason = [error?.message, error?.code && `kode ${error.code}`, error?.hint].filter(Boolean).join(' · ')
        setCloudError(reason
          ? `Data cloud gagal dimuat: ${reason}`
          : 'Data cloud gagal dimuat. Periksa koneksi dan konfigurasi Supabase, lalu pastikan skema database sudah diterapkan.')
        setCloudReady(false)
      }
    })
    return () => { active = false; cleanupRefresh(); if (channel) supabase.removeChannel(channel) }
  }, [authReady, currentUser?.id, currentUser?.role])

  function syncCollectionToCloud(collection, items) {
    if (!isSupabaseConfigured || !cloudReady || !currentUser || !Array.isArray(items)) return
    const previous = cloudBaseline.current[collection] || new Map()
    const next = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]))
    const changed = [...next.entries()].filter(([id, item]) => JSON.stringify(previous.get(id)) !== JSON.stringify(item))
    const adminInsertOnlyCollections = ['topups', 'cashLoans', 'auditLogs', 'cancellationRequests', 'cashUnlockRequests', 'stoneSales', 'pineappleSales']
    const adminInsertOnly = currentUser.role === 'admin' && adminInsertOnlyCollections.includes(collection)
    // RLS permits admins to create these records, while updates/deletes remain owner-managed.
    // Never send a DELETE for admin collections: local filtering or a stale cache must not
    // turn into a forbidden attempt to remove rows that are still shared in the cloud.
    const removed = currentUser.role === 'admin' ? [] : [...previous.keys()].filter((id) => !next.has(id))
    if (!changed.length && !removed.length) return
    // Optimistic per-record baseline keeps unrelated edits on different devices from replacing an entire collection.
    cloudBaseline.current = { ...cloudBaseline.current, [collection]: next }
    const rows = changed.map(([id, item]) => ({ collection, record_id: id, data: item }))
    const adminDailyCashUpdate = collection === 'dailyCash' && currentUser.role === 'admin'
    Promise.all([
      rows.length && adminDailyCashUpdate
        ? Promise.all(rows.map((row) => supabase.from('app_records')
          .update({ data: row.data })
          .eq('collection', collection)
          .eq('record_id', row.record_id)
          .select('record_id')
          .maybeSingle()))
          .then((results) => ({ error: results.find((result) => result.error)?.error || (results.some((result) => !result.data) ? { message: 'Catatan kas awal tidak ditemukan di cloud. Minta owner menyinkronkan kas awal sebelum menutup kas.' } : null) }))
        : rows.length ? supabase.from('app_records').upsert(rows, { onConflict: 'collection,record_id', ignoreDuplicates: adminInsertOnly }) : Promise.resolve({ error: null }),
      removed.length && !adminDailyCashUpdate ? supabase.from('app_records').delete().eq('collection', collection).in('record_id', removed) : Promise.resolve({ error: null }),
    ]).then((results) => {
      const failure = results.find((result) => result.error)?.error
      if (failure) {
        console.error(`Gagal menyimpan ${collection} ke Supabase:`, failure)
        cloudBaseline.current = { ...cloudBaseline.current, [collection]: previous }
        const detail = [failure.message, failure.code && `kode ${failure.code}`].filter(Boolean).join(' · ')
        const hint = collection === 'stoneStock' || collection === 'stoneSales'
          ? 'Pastikan supabase/stone-feature.sql sudah dijalankan di Supabase.'
          : collection === 'pineappleStock' || collection === 'pineappleSales'
            ? 'Pastikan supabase/pineapple-feature.sql sudah dijalankan di Supabase.'
          : collection === 'rubberRecords'
            ? 'Pastikan supabase/getah-feature.sql sudah dijalankan di Supabase SQL Editor.'
            : 'Periksa koneksi dan aturan akses database Supabase.'
        const collectionLabel = collection === 'rubberRecords' ? 'catatan Getah' : collection === 'stoneStock' ? 'stok batu' : collection === 'stoneSales' ? 'penjualan batu' : collection === 'pineappleStock' ? 'stok nanas' : collection === 'pineappleSales' ? 'penjualan nanas' : collection
        cloudSyncErrors.current = { ...cloudSyncErrors.current, [collection]: `Gagal menyimpan ${collectionLabel} ke cloud. ${hint}${detail ? ` Detail: ${detail}` : ''}` }
        setCloudError(Object.values(cloudSyncErrors.current).join(' '))
        if ((cloudRetryAttempts.current[collection] || 0) < 3 && !cloudRetryTimers.current[collection]) {
          cloudRetryAttempts.current[collection] = (cloudRetryAttempts.current[collection] || 0) + 1
          cloudRetryTimers.current[collection] = window.setTimeout(() => {
            cloudRetryTimers.current[collection] = null
            syncCollectionToCloud(collection, collectionValuesRef.current[collection] || [])
          }, 1500 * (2 ** (cloudRetryAttempts.current[collection] - 1)))
        }
      } else {
        cloudRetryAttempts.current[collection] = 0
        if (cloudRetryTimers.current[collection]) window.clearTimeout(cloudRetryTimers.current[collection])
        cloudRetryTimers.current[collection] = null
        const { [collection]: _resolved, ...remainingErrors } = cloudSyncErrors.current
        cloudSyncErrors.current = remainingErrors
        setCloudError(Object.values(remainingErrors).join(' '))
      }
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
  useEffect(() => { syncCollectionToCloud('rubberRecords', rubberRecords) }, [rubberRecords, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('rubberFactorySales', rubberFactorySales) }, [rubberFactorySales, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('stoneStock', stoneStock) }, [stoneStock, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('stoneSales', stoneSales) }, [stoneSales, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('pineappleStock', pineappleStock) }, [pineappleStock, cloudReady, currentUser?.id])
  useEffect(() => { syncCollectionToCloud('pineappleSales', pineappleSales) }, [pineappleSales, cloudReady, currentUser?.id])

  useEffect(() => {
    if (!cloudReady || currentUser?.role !== 'owner') return
    setDailyCash((previous) => {
      let changed = false
      const corrected = previous.map((day) => {
        if (day.status !== 'locked') return day
        const stoneCapital = stoneStock.filter((item) => item.date === day.date && (!day.closedAt || (!item.createdAt || item.createdAt <= day.closedAt) && (!item.updatedAt || item.updatedAt <= day.closedAt))).reduce((sum, item) => sum + Number(item.capitalCost || 0), 0)
        if (day.date !== STONE_CAPITAL_CORRECTION_DATE) {
          if ((!day.correctedAt && !day.stoneCapitalExcludedFromCash) || !Number.isFinite(Number(day.systemCashAtClose))) return day
          const systemCashAtClose = Number(day.systemCashAtClose) - stoneCapital
          const cashDifference = Number.isFinite(Number(day.countedCash)) ? Number(day.countedCash) - systemCashAtClose : day.cashDifference
          const { correctedAt, stoneCapitalExcludedFromCash, ...originalDay } = day
          changed = true
          return { ...originalDay, systemCashAtClose, cashDifference }
        }
        const knownStaleClose = Number(day.systemCashAtClose) === STONE_CAPITAL_STALE_CLOSE
        if ((day.stoneCapitalExcludedFromCash && !knownStaleClose) || (stoneCapital <= 0 && !knownStaleClose) || !Number.isFinite(Number(day.systemCashAtClose))) return day
        const systemCashAtClose = knownStaleClose ? STONE_CAPITAL_CORRECTED_CLOSE : Number(day.systemCashAtClose) + stoneCapital
        const cashDifference = Number.isFinite(Number(day.countedCash)) ? Number(day.countedCash) - systemCashAtClose : day.cashDifference
        changed = true
        return { ...day, systemCashAtClose, cashDifference, stoneCapitalExcludedFromCash: true, correctedAt: new Date().toISOString() }
      })
      return changed ? corrected : previous
    })
  }, [cloudReady, currentUser?.role, stoneStock, dailyCash])

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

  function saveRubberRecord(recordData, recordId = null) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengelola catatan getah.' }
    const name = String(recordData.name || '').trim()
    const date = String(recordData.date || '')
    const bags = (Array.isArray(recordData.bags) ? recordData.bags : []).map((weight) => parseKgInput(weight))
    const pricePerKg = parseRupiahInput(recordData.pricePerKg)
    if (!name || !date || !bags.length || bags.some((weight) => !Number.isFinite(weight) || weight <= 0) || !Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      return { ok: false, message: 'Nama, tanggal, berat setiap karung, dan harga per kg harus diisi dengan benar.' }
    }
    const totalWeightKg = bags.reduce((total, weight) => total + weight, 0)
    // The 10% deduction is applied to the combined weight. Round to a whole
    // payable kilogram; .5 and above rounds up, below .5 rounds down.
    const payableWeightKg = Math.floor(totalWeightKg * 0.9 + 0.5)
    const totalAmount = payableWeightKg * pricePerKg
    const splitAmount = Math.round(totalAmount / 2)
    const now = new Date().toISOString()
    const existing = recordId ? rubberRecords.find((item) => item.id === recordId) : null
    if (recordId && !existing) return { ok: false, message: 'Catatan getah tidak ditemukan.' }
    const entry = {
      ...existing,
      id: recordId || `rubber-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name, date, bags, totalWeightKg, payableWeightKg,
      deductionKg: totalWeightKg - payableWeightKg,
      pricePerKg, totalAmount, splitAmount,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      ...(existing ? {} : { createdBy: currentUser.id }),
    }
    setRubberRecords((previous) => existing
      ? previous.map((item) => item.id === recordId ? entry : item).sort((a, b) => b.date.localeCompare(a.date))
      : [entry, ...previous].sort((a, b) => b.date.localeCompare(a.date)))
    return { ok: true, entry }
  }

  function addRubberRecord(recordData) { return saveRubberRecord(recordData) }
  function updateRubberRecord(id, recordData) { return saveRubberRecord(recordData, id) }
  function deleteRubberRecord(id) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus catatan getah.' }
    if (!rubberRecords.some((item) => item.id === id)) return { ok: false, message: 'Catatan getah tidak ditemukan.' }
    setRubberRecords((previous) => previous.filter((item) => item.id !== id))
    return { ok: true }
  }

  function addRubberFactorySale(data) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mencatat penjualan pabrik.' }
    const date = String(data.date || '')
    const weightKg = parseKgInput(data.weightKg)
    const pricePerKg = parseRupiahInput(data.pricePerKg)
    const expenses = (Array.isArray(data.expenses) ? data.expenses : []).map((item) => ({ description: String(item.description || '').trim(), amount: parseRupiahInput(item.amount) }))
    if (!date || !Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return { ok: false, message: 'Tanggal, berat pabrik, dan harga per kg harus diisi dengan benar.' }
    if (expenses.some((item) => !item.description || !Number.isFinite(item.amount) || item.amount <= 0)) return { ok: false, message: 'Nama dan nominal setiap pengeluaran wajib diisi dengan benar.' }
    const grossAmount = weightKg * pricePerKg
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0)
    const entry = { id: `rubber-factory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, weightKg, pricePerKg, grossAmount, expenses, expenseTotal, netAmount: grossAmount - expenseTotal, createdAt: new Date().toISOString(), createdBy: currentUser.id }
    setRubberFactorySales((previous) => [entry, ...previous].sort((a, b) => b.date.localeCompare(a.date)))
    return { ok: true, entry }
  }
  function deleteRubberFactorySale(id) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus penjualan pabrik.' }
    if (!rubberFactorySales.some((item) => item.id === id)) return { ok: false, message: 'Catatan penjualan pabrik tidak ditemukan.' }
    setRubberFactorySales((previous) => previous.filter((item) => item.id !== id))
    return { ok: true }
  }

  function addStoneStock({ date, type, quantityKg, capitalCost, note = '', ownerId }) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menambahkan stok batu.' }
    const quantity = parseKgInput(quantityKg)
    const cost = Number(String(capitalCost ?? '').replaceAll('.', '')) || 0
    if (!STONE_TYPES.includes(type) || !date || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost <= 0) {
      return { ok: false, message: 'Jenis, tanggal, jumlah stok, dan modal pembelian harus diisi dengan benar.' }
    }
    const entry = { id: `stone-stock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, type, quantityKg: quantity, capitalCost: cost, note: note.trim(), ownerId, createdAt: new Date().toISOString() }
    setStoneStock((prev) => [entry, ...prev])
    addAuditLog({ action: 'Menambah stok batu', actorId: ownerId, detail: `${type}: ${quantity.toLocaleString('id-ID')} kg · modal Rp${cost.toLocaleString('id-ID')}` })
    return { ok: true, entry }
  }

  function updateStoneStock(id, patch, ownerId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengubah stok batu.' }
    const existing = stoneStock.find((item) => item.id === id)
    if (!existing) return { ok: false, message: 'Catatan stok batu tidak ditemukan.' }
    const type = patch.type || existing.type
    const quantity = parseKgInput(patch.quantityKg ?? existing.quantityKg)
    const cost = Number(String(patch.capitalCost ?? existing.capitalCost ?? 0).replaceAll('.', '')) || 0
    const date = patch.date || existing.date
    if (!STONE_TYPES.includes(type) || !date || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost < 0) {
      return { ok: false, message: 'Tanggal, jenis, jumlah kg, dan modal harus diisi dengan benar.' }
    }
    const affectedTypes = new Set([canonicalStoneType(existing.type), canonicalStoneType(type)])
    for (const affectedType of affectedTypes) {
      const totalStock = stoneStock.filter((item) => canonicalStoneType(item.type) === affectedType && item.id !== id).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
        + (canonicalStoneType(type) === affectedType ? quantity : 0)
      const totalSold = stoneSales.filter((item) => canonicalStoneType(item.type) === affectedType).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
      if (totalStock < totalSold) return { ok: false, message: `Jumlah stok ${affectedType} tidak bisa kurang dari total terjual (${totalSold.toLocaleString('id-ID')} kg).` }
    }
    const updated = { ...existing, ...patch, date, type, quantityKg: quantity, capitalCost: cost, note: String(patch.note ?? existing.note ?? '').trim(), updatedAt: new Date().toISOString() }
    setStoneStock((prev) => prev.map((item) => item.id === id ? updated : item))
    addAuditLog({ action: 'Mengubah stok batu', actorId: ownerId, detail: `${type}: ${quantity.toLocaleString('id-ID')} kg · modal Rp${cost.toLocaleString('id-ID')}` })
    return { ok: true, entry: updated }
  }

  function deleteStoneStock(id, ownerId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus stok batu.' }
    const existing = stoneStock.find((item) => item.id === id)
    if (!existing) return { ok: false, message: 'Catatan stok batu tidak ditemukan.' }
    const remainingStock = stoneStock.filter((item) => canonicalStoneType(item.type) === canonicalStoneType(existing.type) && item.id !== id).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
    const totalSold = stoneSales.filter((item) => canonicalStoneType(item.type) === canonicalStoneType(existing.type)).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
    if (remainingStock < totalSold) return { ok: false, message: `Stok tidak bisa dihapus karena ${totalSold.toLocaleString('id-ID')} kg ${canonicalStoneType(existing.type)} sudah tercatat terjual.` }
    setStoneStock((prev) => prev.filter((item) => item.id !== id))
    addAuditLog({ action: 'Menghapus stok batu', actorId: ownerId, detail: `${canonicalStoneType(existing.type)}: ${Number(existing.quantityKg).toLocaleString('id-ID')} kg · modal Rp${Number(existing.capitalCost || 0).toLocaleString('id-ID')}` })
    return { ok: true }
  }

  function addStoneSale({ date, type, driverName, netKg, pricePerKg, paymentMethod, adminId }) {
    if (currentUser?.role !== 'admin') return { ok: false, message: 'Pencatatan penjualan batu hanya tersedia untuk admin.' }
    const quantity = parseKgInput(netKg)
    const price = parseRupiahInput(pricePerKg)
    if (!STONE_TYPES.includes(type) || !date || !driverName?.trim() || !Number.isFinite(quantity) || quantity <= 0 || price <= 0 || !['transfer', 'paid'].includes(paymentMethod)) {
      return { ok: false, message: 'Tanggal, jenis batu, nama sopir, berat, harga per kg, dan status pembayaran wajib diisi.' }
    }
    const available = stoneStock.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
      - stoneSales.filter((item) => canonicalStoneType(item.type) === type).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
    if (quantity > available) return { ok: false, message: `Stok ${type} tidak cukup. Tersedia ${available.toLocaleString('id-ID')} kg.` }
    const sale = { id: `stone-sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, type, driverName: driverName.trim(), netKg: quantity, pricePerKg: price, total: Math.round(quantity * price), paymentMethod, paymentStatus: paymentMethod === 'paid' ? 'paid' : 'pending', adminId, createdAt: new Date().toISOString() }
    setStoneSales((prev) => [sale, ...prev])
    addAuditLog({ action: 'Mencatat penjualan batu', actorId: adminId, detail: `${type} · ${sale.driverName}: ${quantity.toLocaleString('id-ID')} kg × Rp${price.toLocaleString('id-ID')} = Rp${sale.total.toLocaleString('id-ID')}` })
    return { ok: true, sale }
  }

  function updateStoneSale(id, patch, ownerId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengubah penjualan batu.' }
    const existing = stoneSales.find((item) => item.id === id)
    if (!existing) return { ok: false, message: 'Catatan penjualan batu tidak ditemukan.' }
    const type = patch.type || existing.type
    const quantity = parseKgInput(patch.netKg ?? existing.netKg)
    const price = parseRupiahInput(patch.pricePerKg ?? existing.pricePerKg)
    const date = patch.date || existing.date
    const driverName = String(patch.driverName ?? existing.driverName ?? '').trim()
    const paymentMethod = patch.paymentMethod || existing.paymentMethod
    if (!STONE_TYPES.includes(type) || !date || !driverName || quantity <= 0 || price <= 0 || !['transfer', 'paid'].includes(paymentMethod)) {
      return { ok: false, message: 'Tanggal, jenis batu, sopir, berat, harga per kg, dan pembayaran wajib diisi.' }
    }
    const available = stoneStock.filter((item) => canonicalStoneType(item.type) === canonicalStoneType(type)).reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
      - stoneSales.filter((item) => item.id !== id && canonicalStoneType(item.type) === canonicalStoneType(type)).reduce((sum, item) => sum + Number(item.netKg || 0), 0)
    if (quantity > available) return { ok: false, message: `Stok ${type} tidak cukup. Tersedia ${available.toLocaleString('id-ID')} kg.` }
    const total = Math.round(quantity * price)
    const updated = { ...existing, ...patch, date, type, driverName, netKg: quantity, pricePerKg: price, total, paymentMethod, paymentStatus: paymentMethod === 'paid' ? 'paid' : 'pending', updatedAt: new Date().toISOString() }
    setStoneSales((prev) => prev.map((item) => item.id === id ? updated : item))
    addAuditLog({ action: 'Mengubah penjualan batu', actorId: ownerId, detail: `${type} · ${driverName}: ${quantity.toLocaleString('id-ID')} kg × Rp${price.toLocaleString('id-ID')} = Rp${total.toLocaleString('id-ID')}` })
    return { ok: true, sale: updated }
  }

  function deleteStoneSale(id, ownerId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus penjualan batu.' }
    const existing = stoneSales.find((item) => item.id === id)
    if (!existing) return { ok: false, message: 'Catatan penjualan batu tidak ditemukan.' }
    setStoneSales((prev) => prev.filter((item) => item.id !== id))
    addAuditLog({ action: 'Menghapus penjualan batu', actorId: ownerId, detail: `${canonicalStoneType(existing.type)} · ${existing.driverName}: ${Number(existing.netKg).toLocaleString('id-ID')} kg` })
    return { ok: true }
  }

  function markStoneSalePaid(id, ownerId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengonfirmasi pelunasan.' }
    const sale = stoneSales.find((item) => item.id === id)
    if (!sale) return { ok: false, message: 'Catatan penjualan batu tidak ditemukan.' }
    if (sale.paymentStatus === 'paid' || sale.paymentMethod === 'paid') return { ok: false, message: 'Catatan ini sudah lunas.' }
    setStoneSales((prev) => prev.map((item) => item.id === id ? { ...item, paymentStatus: 'paid', paidBy: ownerId, paidAt: new Date().toISOString() } : item))
    addAuditLog({ action: 'Mengonfirmasi pelunasan batu', actorId: ownerId, detail: `${canonicalStoneType(sale.type)} · ${sale.driverName} · ${sale.date}` })
    return { ok: true }
  }

  function addPineappleStock({ date, type, quantity, capitalCost, note = '', ownerId }) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menambahkan stok nanas.' }
    const count = Number(quantity)
    const cost = parseRupiahInput(capitalCost)
    if (!date || !['large', 'small', 'bundle'].includes(type) || !Number.isInteger(count) || count <= 0 || !Number.isFinite(cost) || cost <= 0) {
      return { ok: false, message: 'Tanggal, jenis, jumlah stok, dan modal harus diisi dengan benar.' }
    }
    const entry = { id: `pineapple-stock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, type, quantity: count, capitalCost: cost, note: String(note).trim(), ownerId, createdAt: new Date().toISOString() }
    setPineappleStock((previous) => [entry, ...previous])
    addAuditLog({ action: 'Menambah stok nanas', actorId: ownerId, detail: `${type}: ${count} unit · modal Rp${cost.toLocaleString('id-ID')}` })
    return { ok: true, entry }
  }

  function addPineappleSale({ date, type, quantity, adminId }) {
    if (!['owner', 'admin'].includes(currentUser?.role)) return { ok: false, message: 'Akses mencatat penjualan nanas tidak tersedia.' }
    const count = Number(quantity)
    if (!date || !['large', 'small', 'bundle'].includes(type) || !Number.isInteger(count) || count <= 0) {
      return { ok: false, message: 'Tanggal, ukuran nanas, dan jumlah penjualan harus diisi dengan benar.' }
    }
    const available = pineappleStock.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      - pineappleSales.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    if (count > available) return { ok: false, message: `Stok tidak cukup. Tersedia ${available.toLocaleString('id-ID')} unit.` }
    const prices = { large: 13000, small: 8000, bundle: 20000 }
    const sale = { id: `pineapple-sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, type, quantity: count, unitPrice: prices[type], total: count * prices[type], adminId: adminId || currentUser.id, recordedByRole: currentUser.role, createdAt: new Date().toISOString() }
    setPineappleSales((previous) => [sale, ...previous])
    addAuditLog({ action: 'Mencatat penjualan nanas', actorId: adminId || currentUser.id, detail: `${type}: ${count} unit × Rp${prices[type].toLocaleString('id-ID')} = Rp${sale.total.toLocaleString('id-ID')}` })
    return { ok: true, sale }
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

  function lockDay(dateKey, actorId, countedCash) {
    const amount = Number(countedCash)
    if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: 'Uang kas fisik harus berupa angka 0 atau lebih.' }
    const expectedCash = getCashSummary(dateKey).remaining
    const closedAt = new Date().toISOString()
    setDailyCash((prev) => prev.map((d) => (d.date === dateKey ? {
      ...d,
      status: 'locked',
      countedCash: amount,
      systemCashAtClose: expectedCash,
      cashDifference: amount - expectedCash,
      stoneCapitalExcludedFromCash: true,
      closedAt,
      closedBy: actorId,
    } : d)))
    addAuditLog({ action: 'Menutup kas harian', actorId, detail: `${dateKey}: sistem Rp${expectedCash.toLocaleString('id-ID')}, fisik Rp${amount.toLocaleString('id-ID')}, selisih Rp${(amount - expectedCash).toLocaleString('id-ID')}` })
    return { ok: true }
  }

  function editDailyCashCount(dateKey, actorId, countedCash) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengoreksi hitungan kas admin.' }
    const amount = Number(countedCash)
    if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: 'Uang fisik harus berupa angka 0 atau lebih.' }
    const existing = dailyCash.find((item) => item.date === dateKey)
    if (!existing || existing.status !== 'locked') return { ok: false, message: 'Data penutupan kas tidak ditemukan atau belum ditutup.' }
    const previousAmount = Number(existing.countedCash)
    if (!Number.isFinite(previousAmount)) return { ok: false, message: 'Data hitungan fisik admin belum tersedia untuk dikoreksi.' }
    const systemCash = Number(existing.systemCashAtClose)
    if (!Number.isFinite(systemCash)) return { ok: false, message: 'Sisa menurut sistem tidak tersedia; koreksi tidak dapat disimpan.' }

    const editedAt = new Date().toISOString()
    setDailyCash((prev) => prev.map((item) => item.date === dateKey ? {
      ...item,
      countedCash: amount,
      cashDifference: amount - systemCash,
      countedCashEditedAt: editedAt,
      countedCashEditedBy: actorId,
    } : item))
    addAuditLog({
      action: 'Mengoreksi hitungan fisik kas admin',
      actorId,
      detail: `${dateKey}: Rp${previousAmount.toLocaleString('id-ID')} → Rp${amount.toLocaleString('id-ID')} · selisih diperbarui menjadi Rp${(amount - systemCash).toLocaleString('id-ID')}`,
    })
    return { ok: true }
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

  async function addTopup({ id, date, time, amount, source, note, adminId }) {
    if (isSupabaseConfigured && !cloudReady) return { ok: false, message: 'Data belum tersambung ke cloud. Tunggu sinkronisasi selesai lalu coba lagi.' }
    const topup = { id: id || `tu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, time, amount: Number(amount), source, note, adminId }
    if (isSupabaseConfigured) {
      const { data: existing, error: lookupError } = await supabase.from('app_records')
        .select('record_id, data')
        .eq('collection', 'topups')
        .eq('record_id', topup.id)
        .maybeSingle()
      if (lookupError) return { ok: false, message: `Top-up gagal diperiksa di cloud: ${lookupError.message}` }
      const sameExistingTopup = existing && ['date', 'time', 'amount', 'source', 'note', 'adminId']
        .every((key) => key === 'amount'
          ? Number(existing.data?.[key]) === Number(topup[key])
          : (existing.data?.[key] ?? null) === (topup[key] ?? null))
      if (existing && !sameExistingTopup) {
        return { ok: false, message: 'ID top-up sudah dipakai untuk data lain. Tutup formulir, buka kembali, lalu coba lagi.' }
      }
      if (!existing) {
        const { error } = await supabase.from('app_records').insert({ collection: 'topups', record_id: topup.id, data: topup })
        if (error) return { ok: false, message: `Top-up gagal disimpan ke cloud: ${error.message}${error.code ? ` · kode ${error.code}` : ''}` }
      }
      const baseline = new Map(cloudBaseline.current.topups || [])
      baseline.set(String(topup.id), topup)
      cloudBaseline.current = { ...cloudBaseline.current, topups: baseline }
    }
    setTopups((prev) => prev.some((item) => String(item.id) === String(topup.id)) ? prev : [topup, ...prev])
    addAuditLog({ action: 'Menambah top-up kas', actorId: adminId, detail: `${date}: Rp${Number(amount).toLocaleString('id-ID')}` })
    return { ok: true, topup }
  }

  function addCashLoan({ date, relatedDate = '', name, amount, reason, adminId }) {
    const summary = getCashSummary(date)
    const numericAmount = Number(amount) || 0
    if (!name?.trim() || !reason?.trim() || numericAmount <= 0) return { ok: false, message: 'Nama, jumlah, dan alasan pinjaman wajib diisi.' }
    if (summary.status === 'locked') return { ok: false, message: 'Kas hari ini sedang ditutup.' }
    if (numericAmount > summary.remaining) return { ok: false, message: `Sisa kas tidak cukup. Kas tersedia: Rp${summary.remaining.toLocaleString('id-ID')}.` }
    if (relatedDate && !/^\d{4}-\d{2}-\d{2}$/.test(relatedDate)) return { ok: false, message: 'Tanggal kejadian tidak valid.' }
    const loan = { id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, ...(relatedDate ? { relatedDate } : {}), name: name.trim(), amount: numericAmount, reason: reason.trim(), adminId, createdAt: new Date().toISOString() }
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
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengubah catatan pembelian.' }
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
    return { ok: true }
  }

  function editTransaction(id, patch, actorId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengedit catatan pembelian.' }
    const transaction = transactions.find((item) => item.id === id)
    if (!transaction || transaction.status === 'voided') return { ok: false, message: 'Catatan tidak ditemukan atau sudah dibatalkan.' }
    updateTransaction(id, patch, actorId)
    return { ok: true }
  }

  function deleteTransaction(id, actorId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus catatan pembelian.' }
    const transaction = transactions.find((item) => item.id === id)
    if (!transaction || transaction.status === 'voided') return { ok: false, message: 'Catatan tidak ditemukan atau sudah dihapus.' }
    setTransactions((prev) => prev.map((item) => item.id === id ? { ...item, status: 'voided', voidedAt: new Date().toISOString(), voidedBy: actorId } : item))
    addAuditLog({ action: 'Menghapus catatan pembelian', actorId, transactionId: id, detail: `${transaction.name || 'Pembelian'} · ${transaction.date}` })
    return { ok: true }
  }

  function editCashLoan(id, patch, actorId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengedit pinjaman kas.' }
    const loan = cashLoans.find((item) => item.id === id)
    if (!loan) return { ok: false, message: 'Pinjaman tidak ditemukan.' }
    const amount = Number(patch.amount)
    if (!patch.date || !patch.name?.trim() || !patch.reason?.trim() || !Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Tanggal, nama, alasan, dan nominal pinjaman harus diisi dengan benar.' }
    setCashLoans((prev) => prev.map((item) => item.id === id ? { ...item, date: patch.date, name: patch.name.trim(), amount, reason: patch.reason.trim(), editedAt: new Date().toISOString(), editedBy: actorId } : item))
    addAuditLog({ action: 'Mengedit pinjaman kas', actorId, detail: `${loan.name}: Rp${Number(loan.amount).toLocaleString('id-ID')} → ${patch.name.trim()}: Rp${amount.toLocaleString('id-ID')}` })
    return { ok: true }
  }

  function deleteCashLoan(id, actorId) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat menghapus pinjaman kas.' }
    const loan = cashLoans.find((item) => item.id === id)
    if (!loan) return { ok: false, message: 'Pinjaman tidak ditemukan.' }
    setCashLoans((prev) => prev.filter((item) => item.id !== id))
    addAuditLog({ action: 'Menghapus pinjaman kas', actorId, detail: `${loan.name}: Rp${Number(loan.amount).toLocaleString('id-ID')} · ${loan.date}` })
    return { ok: true }
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
    setCancellationRequests((prev) => prev.map((item) => {
      if (item.kind === 'cashInitialEdit' && request.kind === 'cashInitialEdit' && item.date === request.date && item.status === 'pending') {
        return item.id === requestId
          ? { ...item, status: approved ? 'approved' : 'rejected', resolvedBy: ownerId, resolvedAt: new Date().toISOString() }
          : { ...item, status: 'superseded', supersededAt: new Date().toISOString() }
      }
      return item.id === requestId ? { ...item, status: approved ? 'approved' : 'rejected', resolvedBy: ownerId, resolvedAt: new Date().toISOString() } : item
    }))
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

  function updatePrivateFarm(farmId, farmData, actorId = currentUser?.id) {
    if (currentUser?.role !== 'owner') return { ok: false, message: 'Hanya owner yang dapat mengubah data lahan.' }
    const existing = privateFarms.find((farm) => farm.id === farmId)
    if (!existing) return { ok: false, message: 'Data lahan tidak ditemukan.' }
    const name = String(farmData.name || '').trim()
    if (!name) return { ok: false, message: 'Nama lahan wajib diisi.' }
    setPrivateFarms((prev) => prev.map((farm) => farm.id === farmId ? {
      ...farm,
      ...farmData,
      name,
      owner: String(farmData.owner || '').trim(),
      location: String(farmData.location || '').trim(),
      note: String(farmData.note || '').trim(),
      updatedAt: new Date().toISOString(),
    } : farm))
    addAuditLog({ action: 'Mengedit data lahan kebun', actorId, detail: `${existing.name} → ${name}` })
    return { ok: true }
  }

  function addPrivateHarvestRecord(farmId, recordData) {
    const farm = privateFarms.find((item) => item.id === farmId)
    if (!farm) return null
    const netKg = Number(recordData.netKg) || 0
    const pricePerKg = Number(recordData.pricePerKg) || 0
    const uses = (Array.isArray(recordData.uses) ? recordData.uses : []).map((item) => ({ ...item, amount: Number(item.amount) || 0 }))
    const fruitRows = Array.isArray(recordData.fruitRows) ? recordData.fruitRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.fruitRows
    const brondolanRows = Array.isArray(recordData.brondolanRows) ? recordData.brondolanRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.brondolanRows
    const ketekRows = Array.isArray(recordData.ketekRows) ? recordData.ketekRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.ketekRows
    const manager = recordData.manager || 'none'
    const totals = calculateFarmHarvest({ ...recordData, fruitRows, brondolanRows, ketekRows, netKg, pricePerKg, uses, manager })
    const record = { ...recordData, fruitRows, brondolanRows, ketekRows, id: recordData.id || `harvest-${Date.now()}`, netKg, pricePerKg, manager, uses, ...totals, total: totals.finalTotal }
    setPrivateFarms((prev) => prev.map((item) => item.id === farmId ? { ...item, records: [record, ...(item.records || [])].sort((a, b) => b.date.localeCompare(a.date)) } : item))
    return record
  }

  function updatePrivateHarvestRecord(farmId, recordId, recordData) {
    const netKg = Number(recordData.netKg) || 0
    const pricePerKg = Number(recordData.pricePerKg) || 0
    const uses = (Array.isArray(recordData.uses) ? recordData.uses : []).map((item) => ({ ...item, amount: Number(item.amount) || 0 }))
    const fruitRows = Array.isArray(recordData.fruitRows) ? recordData.fruitRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.fruitRows
    const brondolanRows = Array.isArray(recordData.brondolanRows) ? recordData.brondolanRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.brondolanRows
    const ketekRows = Array.isArray(recordData.ketekRows) ? recordData.ketekRows.map((row) => ({ ...row, netKg: Number(row.netKg) || 0, pricePerKg: Number(row.pricePerKg) || 0 })) : recordData.ketekRows
    const manager = recordData.manager || 'none'
    const totals = calculateFarmHarvest({ ...recordData, fruitRows, brondolanRows, ketekRows, netKg, pricePerKg, uses, manager })
    const updatedRecord = { ...recordData, fruitRows, brondolanRows, ketekRows, id: recordId, netKg, pricePerKg, manager, uses, ...totals, total: totals.finalTotal }
    setPrivateFarms((prev) => prev.map((farm) => farm.id === farmId
      ? { ...farm, records: (farm.records || []).map((record) => record.id === recordId ? updatedRecord : record).sort((a, b) => b.date.localeCompare(a.date)) }
      : farm))
    return updatedRecord
  }

  function deletePrivateHarvestRecord(farmId, recordId) {
    setPrivateFarms((prev) => prev.map((farm) => farm.id === farmId
      ? { ...farm, records: (farm.records || []).filter((record) => record.id !== recordId) }
      : farm))
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
    const totalPurchaseUsed = todaysTx.reduce((sum, t) => {
      if (['transfer', 'personal'].includes(t.paymentMethod)) return sum
      const sellerName = String(t.name || suppliers.find((supplier) => supplier.id === t.supplierId)?.name || '').trim().toLocaleLowerCase('id-ID')
      const netKg = Number(t.netKg ?? t.weightKg ?? 0)
      const isHarminiBrondolan = (t.kind || 'buah') === 'brondolan' && sellerName.includes('harmini')
      const total = isHarminiBrondolan ? Math.round(netKg * (Number(t.pricePerKg || 0) + 10)) : Number(t.total)
      return sum + total
    }, 0)
    const totalStoneCapital = dateKey === STONE_CAPITAL_CORRECTION_DATE
      ? 0
      : stoneStock.filter((item) => item.date === dateKey).reduce((sum, item) => sum + Number(item.capitalCost || 0), 0)
    const totalUsed = totalPurchaseUsed + totalStoneCapital
    const todaysLoans = cashLoans.filter((loan) => loan.date === dateKey)
    const totalLoans = todaysLoans.reduce((sum, loan) => sum + Number(loan.amount), 0)
    const remaining = initialAmount + totalTopup - totalUsed - totalLoans
    return {
      exists: !!cash,
      status: cash?.status || 'open',
      initialAmount,
      totalTopup,
      totalUsed,
      totalPurchaseUsed,
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
    editTransaction,
    deleteTransaction,
    requestCancellation,
    resolveCancellation,
    cancellationRequests,
    auditLogs,
    dailyCash,
    getDailyCash,
    setInitialCash,
    lockDay,
    editDailyCashCount,
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
    rubberRecords,
    rubberFactorySales,
    addRubberFactorySale,
    deleteRubberFactorySale,
    addRubberRecord,
    updateRubberRecord,
    deleteRubberRecord,
    stoneStock,
    stoneSales,
    addStoneStock,
    updateStoneStock,
    deleteStoneStock,
    addStoneSale,
    updateStoneSale,
    deleteStoneSale,
    markStoneSalePaid,
    pineappleStock,
    pineappleSales,
    addPineappleStock,
    addPineappleSale,
    addPrivateFarm,
    updatePrivateFarm,
    addPrivateHarvestRecord,
    updatePrivateHarvestRecord,
    deletePrivateHarvestRecord,
    addPayroll,
    markPayrollPaid,
    topups,
    cashLoans,
    addTopup,
    addCashLoan,
    editCashLoan,
    deleteCashLoan,
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
