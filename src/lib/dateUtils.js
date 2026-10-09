// Semua tanggal disimpan sebagai string 'yyyy-MM-dd' (waktu lokal) agar mudah dibandingkan & diurutkan.

export function todayKey() {
  return toDateKey(new Date())
}

export function toDateKey(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatLongDate(key) {
  const d = parseDateKey(key)
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function formatShortDate(key) {
  const d = parseDateKey(key)
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export function monthLabel(key) {
  const d = parseDateKey(key)
  return `${BULAN[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`
}

// Senin sebagai awal minggu
export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, amount) {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

export function isWithinRange(key, startKey, endKey) {
  return key >= startKey && key <= endKey
}

export function isSameMonth(key, monthKey) {
  return key.slice(0, 7) === monthKey.slice(0, 7)
}

export function isSameYear(key, yearKey) {
  return key.slice(0, 4) === yearKey.slice(0, 4)
}

export function formatRupiah(value) {
  const n = Number(value) || 0
  return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export function formatKg(value) {
  const n = Number(value) || 0
  return n.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' kg'
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('id-ID')
}
