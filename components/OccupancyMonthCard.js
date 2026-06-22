'use client'

import { useState, useMemo } from 'react'

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function calcMonthOccupancy(yearNum, monthNum, rooms, bookings, todayStr) {
  const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate()
  const totalRooms = rooms.length
  const totalRoomNights = totalRooms * daysInMonth
  let occupiedRoomNights = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const overnightOccupied = new Set()

    bookings.forEach(b => {
      if (b.stay_type === 'temporary') {
        if (b.checkin_date === dateStr) occupiedRoomNights += 0.5
      } else {
        if (b.checkin_date <= dateStr && b.checkout_date > dateStr) {
          overnightOccupied.add(b.room_id)
        }
      }
    })

    rooms.forEach(r => {
      if (r.is_monthly && r.monthly_start_date && r.monthly_start_date <= dateStr) {
        if (r.monthly_end_date) {
          if (dateStr <= r.monthly_end_date) overnightOccupied.add(r.id)
        } else {
          if (dateStr <= todayStr) overnightOccupied.add(r.id)
        }
      }
    })

    occupiedRoomNights += overnightOccupied.size
  }

  return { daysInMonth, totalRooms, totalRoomNights, occupiedRoomNights }
}

export default function OccupancyMonthCard({ rooms, occupancyBookings, initialMonth }) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const monthOptions = useMemo(() => {
    const now = new Date()
    const opts = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
      opts.push({ value, label })
    }
    return opts
  }, [])

  const stats = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const yearNum = parseInt(yearStr)
    const monthNum = parseInt(monthStr) - 1

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    return calcMonthOccupancy(yearNum, monthNum, rooms, occupancyBookings, todayStr)
  }, [selectedMonth, rooms, occupancyBookings])

  const rate = stats.totalRoomNights > 0
    ? ((stats.occupiedRoomNights / stats.totalRoomNights) * 100).toFixed(1)
    : '0.0'

  const selectedLabel = monthOptions.find(o => o.value === selectedMonth)?.label ?? selectedMonth

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Occupancy รายเดือน</h2>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">ห้อง-คืนทั้งหมดที่มี</span>
          <span className="text-sm font-medium text-gray-900">
            {stats.totalRooms} ห้อง × {stats.daysInMonth} วัน = {stats.totalRoomNights.toLocaleString()} ห้อง-คืน
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">ห้อง-คืนที่มีคนพักจริง</span>
          <span className="text-sm font-medium text-gray-900">
            {stats.occupiedRoomNights.toLocaleString()} ห้อง-คืน
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600">อัตราเข้าพัก</span>
          <span className="text-2xl font-bold text-blue-600">{rate}%</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">{selectedLabel}</p>
    </div>
  )
}
