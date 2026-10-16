export function reportedPurchasePrice(record, supplierMap = {}, reportKind = 'buah') {
  const name = String(record.name || supplierMap[record.supplierId]?.name || '').trim().toLocaleLowerCase('id-ID')
  return Number(record.pricePerKg || 0) + (reportKind === 'brondolan' && name.includes('harmini') ? 10 : 0)
}

export function reportedPurchaseTotal(record, supplierMap = {}, reportKind = 'buah') {
  const netKg = Number(record.netKg ?? record.weightKg ?? 0)
  return reportKind === 'brondolan' && Number(record.pricePerKg) > 0
    ? Math.round(netKg * reportedPurchasePrice(record, supplierMap, reportKind))
    : Number(record.total || 0)
}
