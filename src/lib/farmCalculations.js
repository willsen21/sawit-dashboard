export function calculateFarmHarvest({ netKg, pricePerKg, uses = [], manager }) {
  const grossTotal = Math.round((Number(netKg) || 0) * (Number(pricePerKg) || 0))
  const useTotal = uses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const primaryUse = Number(uses[0]?.amount) || 0
  const wageBase = Math.max(0, grossTotal - primaryUse)
  const managerWage = manager && manager !== 'none'
    ? Math.round(wageBase * 0.1)
    : 0
  return { grossTotal, primaryUse, wageBase, useTotal, additionalUseTotal: useTotal - primaryUse, managerWage, finalTotal: grossTotal - useTotal - managerWage }
}

export function getFarmHarvestTotals(record) {
  const calculated = calculateFarmHarvest(record)
  const hasCalculationInputs = Number(record.netKg) > 0 && Number(record.pricePerKg) > 0
  if (hasCalculationInputs) {
    return {
      grossTotal: calculated.grossTotal,
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
