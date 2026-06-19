'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoomStatusBadge } from '@/components/RoomStatusBadge'
import { updateHousekeepingStatus } from '@/app/actions/housekeeping'

const STATUS_OPTIONS = [
  { value: 'clean', label: 'สะอาด', icon: '✅' },
  { value: 'dirty', label: 'รอทำความสะอาด', icon: '🔴' },
  { value: 'maintenance', label: 'ซ่อมบำรุง', icon: '🔧' },
]

const STATUS_FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'clean', label: 'สะอาด' },
  { value: 'dirty', label: 'รอทำความสะอาด' },
  { value: 'maintenance', label: 'ซ่อมบำรุง' },
]

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HousekeepingClient({ rooms: initialRooms, latestLogs }) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [filter, setFilter] = useState('')
  const [updating, setUpdating] = useState(null)
  const [notes, setNotes] = useState({})
  const [editingNote, setEditingNote] = useState(null)

  const filtered = rooms.filter(r => !filter || r.housekeeping_status === filter)

  const counts = {
    clean: rooms.filter(r => r.housekeeping_status === 'clean').length,
    dirty: rooms.filter(r => r.housekeeping_status === 'dirty').length,
    maintenance: rooms.filter(r => r.housekeeping_status === 'maintenance').length,
  }

  async function handleUpdate(roomId, status) {
    const note = notes[roomId] || ''
    setUpdating(roomId)
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, housekeeping_status: status } : r))
    const result = await updateHousekeepingStatus(roomId, status, note)
    setUpdating(null)
    setNotes(prev => ({ ...prev, [roomId]: '' }))
    setEditingNote(null)
    if (result.error) {
      alert('ไม่สามารถอัปเดตได้: ' + result.error)
      setRooms(initialRooms)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card border-t-4 border-t-green-500 text-center py-4">
          <p className="text-3xl font-bold text-green-600">{counts.clean}</p>
          <p className="text-xs text-gray-500 mt-1">สะอาด</p>
        </div>
        <div className="card border-t-4 border-t-yellow-500 text-center py-4">
          <p className="text-3xl font-bold text-yellow-600">{counts.dirty}</p>
          <p className="text-xs text-gray-500 mt-1">รอทำความสะอาด</p>
        </div>
        <div className="card border-t-4 border-t-red-500 text-center py-4">
          <p className="text-3xl font-bold text-red-600">{counts.maintenance}</p>
          <p className="text-xs text-gray-500 mt-1">ซ่อมบำรุง</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">ห้อง</th>
                <th className="table-th">อาคาร</th>
                <th className="table-th">สถานะปัจจุบัน</th>
                <th className="table-th">อัปเดตล่าสุด</th>
                <th className="table-th">โดย</th>
                <th className="table-th">เปลี่ยนสถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(room => {
                const log = latestLogs[room.id]
                return (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="table-td font-semibold">{room.room_no}</td>
                    <td className="table-td">{room.building}</td>
                    <td className="table-td"><RoomStatusBadge status={room.housekeeping_status} /></td>
                    <td className="table-td text-gray-500">{formatDateTime(log?.updated_at)}</td>
                    <td className="table-td text-gray-500">{log?.profiles?.full_name ?? '—'}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {STATUS_OPTIONS.filter(o => o.value !== room.housekeeping_status).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (editingNote === room.id) {
                                handleUpdate(room.id, opt.value)
                              } else {
                                handleUpdate(room.id, opt.value)
                              }
                            }}
                            disabled={updating === room.id}
                            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">ไม่มีห้องที่ตรงเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
