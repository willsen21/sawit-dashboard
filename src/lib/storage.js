const PREFIX = 'kebunkas_'
const BUSINESS_DATA_VERSION_KEY = `${PREFIX}business_data_version`
const EMPTY_BUSINESS_DATA_VERSION = 'empty-start-v1'
const BUSINESS_DATA_KEYS = [
  'suppliers', 'transactions', 'dailyCash', 'topups', 'auditLogs',
  'cancellationRequests', 'cashUnlockRequests', 'harvestSchedules',
  'operationalExpenses', 'payrolls', 'privateFarms',
]

// Reset sample/previous operational records once for this release. Login
// accounts and the current session are deliberately preserved.
export function resetBusinessDataForFreshStart() {
  try {
    if (window.localStorage.getItem(BUSINESS_DATA_VERSION_KEY) === EMPTY_BUSINESS_DATA_VERSION) return
    BUSINESS_DATA_KEYS.forEach((key) => window.localStorage.removeItem(PREFIX + key))
    window.localStorage.setItem(BUSINESS_DATA_VERSION_KEY, EMPTY_BUSINESS_DATA_VERSION)
  } catch (err) {
    console.error('Gagal mengosongkan data operasional:', err)
  }
}

export function loadItem(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    const value = JSON.parse(raw)

    // Data versi lama atau data yang diubah manual dapat memiliki bentuk yang
    // berbeda. Jangan teruskan nilai tersebut ke context karena akan membuat
    // React gagal dirender (misalnya saat memanggil `.filter()` pada bukan array).
    if (Array.isArray(fallback) && !Array.isArray(value)) return fallback
    if (fallback !== null && typeof fallback === 'object' && (value === null || typeof value !== 'object')) {
      return fallback
    }

    return value
  } catch (err) {
    console.error(`Gagal membaca "${key}" dari penyimpanan:`, err)
    return fallback
  }
}

export function saveItem(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`Gagal menyimpan "${key}" ke penyimpanan:`, err)
    return false
  }
}
