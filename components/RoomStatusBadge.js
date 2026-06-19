export function RoomStatusBadge({ status }) {
  const map = {
    clean: { label: 'สะอาด', cls: 'bg-green-100 text-green-800' },
    dirty: { label: 'รอทำความสะอาด', cls: 'bg-yellow-100 text-yellow-800' },
    maintenance: { label: 'ซ่อมบำรุง', cls: 'bg-red-100 text-red-800' },
  }
  const item = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  )
}

export function BookingStatusBadge({ status }) {
  const map = {
    reserved: { label: 'จองแล้ว', cls: 'bg-gray-100 text-gray-800' },
    checked_in: { label: 'เช็คอิน', cls: 'bg-blue-100 text-blue-800' },
    checked_out: { label: 'เช็คเอาท์', cls: 'bg-purple-100 text-purple-800' },
    cancelled: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-800' },
  }
  const item = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  )
}

export function TxTypeBadge({ type }) {
  if (type === 'income') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">รายรับ</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">รายจ่าย</span>
}

export function ChannelBadge({ channel }) {
  const map = {
    walkin: { label: 'Walk-in', cls: 'bg-sky-100 text-sky-800' },
    agoda: { label: 'Agoda', cls: 'bg-orange-100 text-orange-800' },
    line: { label: 'Line', cls: 'bg-green-100 text-green-800' },
    facebook: { label: 'Facebook', cls: 'bg-blue-100 text-blue-800' },
    sale: { label: 'Sale', cls: 'bg-violet-100 text-violet-800' },
  }
  const item = map[channel] ?? { label: channel, cls: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  )
}
