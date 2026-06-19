'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoomStatusBadge } from '@/components/RoomStatusBadge'
import { updateRoom } from '@/app/actions/rooms'

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'villa']

function EditableCell({ value, onSave, type = 'text', options }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function save() {
    onSave(val)
    setEditing(false)
  }

  if (editing) {
    if (options) {
      return (
        <select
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onSave(val); setEditing(false) }}
          autoFocus
          className="border border-blue-400 rounded px-2 py-1 text-sm w-full"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    return (
      <input
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
        className="border border-blue-400 rounded px-2 py-1 text-sm w-full"
      />
    )
  }

  return (
    <span onClick={() => setEditing(true)} className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-sm block" title="คลิกเพื่อแก้ไข">
      {value ?? '—'}
    </span>
  )
}

export default function RoomsTable({ rooms: initialRooms }) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [pending, startTransition] = useTransition()

  async function handleUpdate(id, field, value) {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    const result = await updateRoom(id, { [field]: value })
    if (result.error) {
      alert('ไม่สามารถบันทึกได้: ' + result.error)
      setRooms(initialRooms)
    }
  }

  const statusOptions = [
    { value: 'clean', label: 'สะอาด' },
    { value: 'dirty', label: 'รอทำความสะอาด' },
    { value: 'maintenance', label: 'ซ่อมบำรุง' },
  ]

  const roomTypeOptions = ROOM_TYPES.map(t => ({ value: t, label: t }))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="table-th">ห้อง</th>
            <th className="table-th">อาคาร</th>
            <th className="table-th">ประเภท</th>
            <th className="table-th">ราคา/คืน</th>
            <th className="table-th">รายเดือน</th>
            <th className="table-th">ค่าเช่า/เดือน</th>
            <th className="table-th">สถานะแม่บ้าน</th>
            <th className="table-th">เปิดใช้</th>
            <th className="table-th">มิเตอร์</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rooms.map(room => (
            <tr key={room.id} className={`hover:bg-gray-50 ${!room.is_active ? 'opacity-50' : ''}`}>
              <td className="table-td font-semibold">{room.room_no}</td>
              <td className="table-td">{room.building}</td>
              <td className="table-td min-w-[120px]">
                <EditableCell
                  value={room.room_type}
                  options={roomTypeOptions}
                  onSave={v => handleUpdate(room.id, 'room_type', v)}
                />
              </td>
              <td className="table-td min-w-[100px]">
                <EditableCell
                  value={room.price_per_night}
                  type="number"
                  onSave={v => handleUpdate(room.id, 'price_per_night', Number(v))}
                />
              </td>
              <td className="table-td">
                <button
                  onClick={() => handleUpdate(room.id, 'is_monthly', !room.is_monthly)}
                  className={`w-10 h-6 rounded-full transition-colors ${room.is_monthly ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${room.is_monthly ? 'translate-x-4' : ''}`} />
                </button>
              </td>
              <td className="table-td min-w-[100px]">
                <EditableCell
                  value={room.monthly_rent}
                  type="number"
                  onSave={v => handleUpdate(room.id, 'monthly_rent', Number(v))}
                />
              </td>
              <td className="table-td min-w-[160px]">
                <EditableCell
                  value={room.housekeeping_status}
                  options={statusOptions}
                  onSave={v => handleUpdate(room.id, 'housekeeping_status', v)}
                />
              </td>
              <td className="table-td">
                <button
                  onClick={() => handleUpdate(room.id, 'is_active', !room.is_active)}
                  className={`w-10 h-6 rounded-full transition-colors ${room.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${room.is_active ? 'translate-x-4' : ''}`} />
                </button>
              </td>
              <td className="table-td">
                {room.is_monthly && (
                  <Link href={`/rooms/${room.id}/meter`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    ดูมิเตอร์
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 px-4 py-2">คลิกที่ข้อมูลเพื่อแก้ไข</p>
    </div>
  )
}
