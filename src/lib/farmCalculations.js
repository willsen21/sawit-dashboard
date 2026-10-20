export function calculateFarmHarvest({ netKg, pricePerKg, fruitNetKg, fruitPricePerKg, brondolanNetKg, brondolanPricePerKg, ketekNetKg, ketekPricePerKg, fruitRows, brondolanRows, ketekRows, uses = [], manager }) {
  const hasYieldRows = Array.isArray(fruitRows) || Array.isArray(brondolanRows) || Array.isArray(ketekRows)
  const hasSeparateYields = hasYieldRows || fruitNetKg != null || brondolanNetKg != null || ketekNetKg != null
  const fruitYieldRows = Array.isArray(fruitRows)
    ? fruitRows
    : fruitNetKg == null ? [] : [{ netKg: fruitNetKg, pricePerKg: fruitPricePerKg }]
  const brondolanYieldRows = Array.isArray(brondolanRows)
    ? brondolanRows
    : brondolanNetKg == null ? [] : [{ netKg: brondolanNetKg, pricePerKg: brondolanPricePerKg }]
  const ketekYieldRows = Array.isArray(ketekRows)
    ? ketekRows
    : ketekNetKg == null ? [] : [{ netKg: ketekNetKg, pricePerKg: ketekPricePerKg }]
  const fruitKg = hasYieldRows ? fruitYieldRows.reduce((sum, row) => sum + (Number(row.netKg) || 0), 0) : Number(fruitNetKg) || 0
  const brondolanKg = hasYieldRows ? brondolanYieldRows.reduce((sum, row) => sum + (Number(row.netKg) || 0), 0) : Number(brondolanNetKg) || 0
  const ketekKg = hasYieldRows ? ketekYieldRows.reduce((sum, row) => sum + (Number(row.netKg) || 0), 0) : Number(ketekNetKg) || 0
  const fruitTotal = hasYieldRows
    ? fruitYieldRows.reduce((sum, row) => sum + Math.round((Number(row.netKg) || 0) * (Number(row.pricePerKg) || 0)), 0)
    : Math.round((hasSeparateYields ? fruitKg : Number(netKg) || 0) * (hasSeparateYields ? Number(fruitPricePerKg) || 0 : Number(pricePerKg) || 0))
  const brondolanTotal = hasYieldRows
    ? brondolanYieldRows.reduce((sum, row) => sum + Math.round((Number(row.netKg) || 0) * (Number(row.pricePerKg) || 0)), 0)
    : hasSeparateYields ? Math.round(brondolanKg * (Number(brondolanPricePerKg) || 0)) : 0
  const ketekTotal = hasYieldRows
    ? ketekYieldRows.reduce((sum, row) => sum + Math.round((Number(row.netKg) || 0) * (Number(row.pricePerKg) || 0)), 0)
    : hasSeparateYields ? Math.round(ketekKg * (Number(ketekPricePerKg) || 0)) : 0
  const totalNetKg = hasYieldRows ? fruitKg + brondolanKg + ketekKg : hasSeparateYields ? fruitKg + brondolanKg + ketekKg : Number(netKg) || 0
  const grossTotal = fruitTotal + brondolanTotal + ketekTotal
  const useTotal = uses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const primaryUse = Number(uses[0]?.amount) || 0
  const wageBase = Math.max(0, grossTotal - primaryUse)
  const managerWage = manager && manager !== 'none'
    ? Math.round(wageBase * 0.1)
    : 0
  return { grossTotal, fruitTotal, brondolanTotal, ketekTotal, totalNetKg, primaryUse, wageBase, useTotal, additionalUseTotal: useTotal - primaryUse, managerWage, finalTotal: grossTotal - useTotal - managerWage }
}

export function getFarmHarvestTotals(record) {
  const calculated = calculateFarmHarvest(record)
  const hasCalculationInputs = Array.isArray(record.fruitRows) || Array.isArray(record.brondolanRows) || Array.isArray(record.ketekRows) || record.fruitNetKg != null || record.brondolanNetKg != null || record.ketekNetKg != null || (Number(record.netKg) > 0 && Number(record.pricePerKg) > 0)
  if (hasCalculationInputs) {
    return {
      grossTotal: calculated.grossTotal,
      fruitTotal: calculated.fruitTotal,
      brondolanTotal: calculated.brondolanTotal,
      ketekTotal: calculated.ketekTotal,
      useTotal: calculated.useTotal,
      managerWage: calculated.managerWage,
      finalTotal: calculated.finalTotal,
    }
  }
  const grossTotal = Number(record.grossTotal ?? calculated.grossTotal) || 0
  const useTotal = Number(record.useTotal ?? calculated.useTotal) || 0
  const managerWage = Number(record.managerWage ?? calculated.managerWage) || 0
  const finalTotal = Number(record.finalTotal ?? record.total ?? (grossTotal - useTotal - managerWage)) || 0
  return { grossTotal, useTotal, managerWage, finalTotal }
}

export function splitFarmResultEqually(total, names = []) {
  const recipients = names.map((name) => String(name || '').trim()).filter(Boolean)
  if (!recipients.length) return []
  const amount = Math.max(0, Math.round(Number(total) || 0))
  const baseShare = Math.floor(amount / recipients.length)
  const remainder = amount % recipients.length
  return recipients.map((name, index) => ({ name, amount: baseShare + (index < remainder ? 1 : 0) }))
}
