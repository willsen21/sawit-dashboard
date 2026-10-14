// Indonesian number input: dots group thousands and commas mark decimals.
export function formatKgInput(value) {
  const input = String(value ?? '').replace(/[^0-9,]/g, '')
  const comma = input.indexOf(',')
  const integer = (comma === -1 ? input : input.slice(0, comma)).replace(/^0+(?=\d)/, '')
  const fraction = comma === -1 ? null : input.slice(comma + 1).replace(/,/g, '').slice(0, 2)
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return fraction === null ? grouped : `${grouped},${fraction}`
}

export function parseKgInput(value) {
  return Number(String(value ?? '').replaceAll('.', '').replace(',', '.')) || 0
}
