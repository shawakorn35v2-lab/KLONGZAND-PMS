const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const MONTHS_TH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// "2026-06-20" or "2026-06-20T..." → "20/06/2569"
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('T')[0].split('-')
  if (!y || !m || !d) return String(dateStr)
  return `${d}/${m}/${Number(y) + 543}`
}

// "2026-06-01" → "มิถุนายน 2569"
export function formatMonth(dateStr) {
  if (!dateStr) return ''
  const [y, m] = String(dateStr).split('T')[0].split('-')
  if (!y || !m) return String(dateStr)
  return `${MONTHS_TH[Number(m) - 1]} ${Number(y) + 543}`
}

// "2026-06-20" → "20 มิ.ย." (for grid/table headers)
export function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = String(dateStr).split('T')[0].split('-')
  return `${Number(d)} ${MONTHS_TH_SHORT[Number(m) - 1]}`
}

// "2026-06-20" → "20 มิถุนายน 2569" (for confirmation modals etc.)
export function formatLongDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number)
  return `${d} ${MONTHS_TH[m - 1]} ${y + 543}`
}

// Get today as YYYY-MM-DD using local timezone (avoids UTC offset issue with toISOString)
export function getTodayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
