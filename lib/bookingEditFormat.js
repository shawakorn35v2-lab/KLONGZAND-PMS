import { formatDate } from './dateUtils'

export const FIELD_LABEL = {
  price: 'ราคาห้อง',
  deposit: 'เงินมัดจำ',
  checkin_date: 'วันเช็คอิน',
  checkout_date: 'วันเช็คเอาท์',
  checkin_time: 'เวลาเช็คอิน',
  checkout_time: 'เวลาเช็คเอาท์',
  room_id: 'ห้องพัก',
  stay_type: 'ประเภทการพัก',
  status: 'สถานะ',
  channel: 'ช่องทางการจอง',
  note: 'หมายเหตุ',
}

const STATUS_LABEL = { reserved: 'จองแล้ว', checked_in: 'เช็คอินแล้ว', checked_out: 'เช็คเอาท์แล้ว', cancelled: 'ยกเลิก' }
const CHANNEL_LABEL = { walkin: 'Walk-in', agoda: 'Agoda', line: 'Line', facebook: 'Facebook', sale: 'Sale' }
const STAY_TYPE_LABEL = { overnight: 'ค้างคืน', temporary: 'ชั่วคราว' }

// roomsById: { [room_id]: room_no } — caller builds this from a rooms list it already has
export function formatEditValue(fieldName, value, roomsById = {}) {
  if (value === null || value === undefined || value === '') return '—'
  if (fieldName === 'checkin_date' || fieldName === 'checkout_date') return formatDate(value)
  if (fieldName === 'checkin_time' || fieldName === 'checkout_time') return String(value).slice(0, 5)
  if (fieldName === 'price' || fieldName === 'deposit') return Number(value).toLocaleString('th-TH') + ' บาท'
  if (fieldName === 'room_id') return roomsById[value] ? `ห้อง ${roomsById[value]}` : value
  if (fieldName === 'status') return STATUS_LABEL[value] ?? value
  if (fieldName === 'channel') return CHANNEL_LABEL[value] ?? value
  if (fieldName === 'stay_type') return STAY_TYPE_LABEL[value] ?? value
  return value
}
