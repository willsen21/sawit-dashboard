export function formatRupiahInput(value) {
  return String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseRupiahInput(value) {
  return Number(String(value ?? '').replaceAll('.', '')) || 0
}
