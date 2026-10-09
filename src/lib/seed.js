import { addDays, toDateKey } from './dateUtils'

export const SEED_USERS = [
  { id: 'u-owner-1', role: 'owner', username: 'papa', password: 'kebun2026', name: 'Papa', active: true },
  { id: 'u-admin-1', role: 'admin', username: 'admin1', password: 'admin123', name: 'Budi Santoso', active: true },
]

export const SEED_SUPPLIERS = [
  { id: 's-1', name: 'Pak Slamet', contact: '0813-0000-0001', kebun: 'Blok Utara' },
  { id: 's-2', name: 'Pak Wayan', contact: '0813-0000-0002', kebun: 'Blok Selatan' },
  { id: 's-3', name: 'Bu Marni', contact: '0813-0000-0003', kebun: 'Blok Timur' },
  { id: 's-4', name: 'Pak Herman', contact: '0813-0000-0004', kebun: 'Blok Barat' },
]

// Membuat riwayat transaksi contoh untuk 45 hari terakhir supaya grafik & rekap
// langsung terlihat isinya saat pertama kali dibuka (data demo, bukan data asli).
function buildSeedTransactions() {
  const rows = []
  const cvs = ['Sinar Mandiri', 'Jaya Agung']
  let counter = 1
  const today = new Date()

  for (let offset = 45; offset >= 1; offset--) {
    const date = addDays(today, -offset)
    const dateKey = toDateKey(date)
    const txCountToday = 2 + Math.floor(Math.random() * 4) // 2-5 transaksi per hari

    for (let i = 0; i < txCountToday; i++) {
      const supplier = SEED_SUPPLIERS[Math.floor(Math.random() * SEED_SUPPLIERS.length)]
      const weight = Math.round((300 + Math.random() * 900) * 10) / 10
      const price = 2100 + Math.floor(Math.random() * 500) // harga per kg fluktuatif
      rows.push({
        id: `t-seed-${counter}`,
        date: dateKey,
        time: `${String(7 + Math.floor(Math.random() * 9)).padStart(2, '0')}:${String(
          Math.floor(Math.random() * 60)
        ).padStart(2, '0')}`,
        supplierId: supplier.id,
        cv: cvs[Math.floor(Math.random() * cvs.length)],
        weightKg: weight,
        pricePerKg: price,
        total: Math.round(weight * price),
        notaNumber: `NT-${dateKey.replaceAll('-', '')}-${i + 1}`,
        note: '',
        adminId: 'u-admin-1',
        status: 'locked',
      })
      counter++
    }
  }
  return rows
}

export const SEED_TRANSACTIONS = buildSeedTransactions()

export const SEED_DAILY_CASH = (() => {
  const today = new Date()
  const rows = []
  for (let offset = 45; offset >= 1; offset--) {
    const dateKey = toDateKey(addDays(today, -offset))
    rows.push({ id: `dc-${dateKey}`, date: dateKey, adminId: 'u-admin-1', initialAmount: 100_000_000, status: 'locked' })
  }
  return rows
})()

export const SEED_TOPUPS = []
