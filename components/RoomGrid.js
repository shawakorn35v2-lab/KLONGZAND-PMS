'use client'

export default function RoomGrid({ rooms, bookings }) {
  const checkedInRoomIds = new Set((bookings ?? []).filter(b => b.status === 'checked_in').map(b => b.room_id))

  const statusMap = {
    clean: { label: 'สะอาด', bg: 'bg-green-50 border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
    dirty: { label: 'รอทำความสะอาด', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    maintenance: { label: 'ซ่อมบำรุง', bg: 'bg-red-50 border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  }

  const buildings = ['A', 'B', 'C']

  return (
    <div className="space-y-4">
      {buildings.map(building => {
        const buildingRooms = rooms.filter(r => r.building === building)
        return (
          <div key={building}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">อาคาร {building}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-2">
              {buildingRooms.map(room => {
                const isOccupied = checkedInRoomIds.has(room.id)
                const s = isOccupied
                  ? { label: 'เช็คอินแล้ว', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' }
                  : (statusMap[room.housekeeping_status] ?? statusMap.clean)
                return (
                  <div
                    key={room.id}
                    className={`border rounded-lg p-2 text-center ${s.bg}`}
                  >
                    <div className={`font-bold text-sm ${s.text}`}>{room.room_no}</div>
                    <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${s.dot}`} />
                    <div className={`text-xs mt-0.5 ${s.text} leading-tight`}>{s.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {[
          { dot: 'bg-green-500', label: 'สะอาด/ว่าง' },
          { dot: 'bg-blue-500', label: 'เช็คอินแล้ว' },
          { dot: 'bg-yellow-500', label: 'รอทำความสะอาด' },
          { dot: 'bg-red-500', label: 'ซ่อมบำรุง' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
