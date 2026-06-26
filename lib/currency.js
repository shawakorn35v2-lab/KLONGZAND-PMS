// ปัดเศษเป็น 2 ตำแหน่งทศนิยมแบบกัน floating-point error
// ตัวอย่าง: 1.005 → 1.01 (toFixed อย่างเดียวจะได้ 1.00), 299.9999999 → 300.00
export function roundCurrency(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}
