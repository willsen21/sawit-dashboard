export function calculateFarmHarvest({ netKg, pricePerKg, uses = [], manager }) {
  const grossTotal = Math.round((Number(netKg) || 0) * (Number(pricePerKg) || 0))
  const useTotal = uses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const managerWage = manager && manager !== 'none'
    ? Math.round(Math.max(0, grossTotal - useTotal) * 0.1)
    : 0
  return { grossTotal, useTotal, managerWage, finalTotal: grossTotal - useTotal - managerWage }
}

export function getFarmHarvestTotals(record) {
  const calculated = calculateFarmHarvest(record)
  const grossTotal = Number(record.grossTotal ?? calculated.grossTotal) || 0
  const useTotal = Number(record.useTotal ?? calculated.useTotal) || 0
  const managerWage = Number(record.managerWage ?? calculated.managerWage) || 0
  const finalTotal = Number(record.finalTotal ?? record.total ?? (grossTotal - useTotal - managerWage)) || 0
  return { grossTotal, useTotal, managerWage, finalTotal }
}
