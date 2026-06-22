'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function calcMonthOccupancy(yearNum, monthNum, rooms, bookings, todayStr) {
  const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate()
  const totalRoomNights = rooms.length * daysInMonth
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

  return totalRoomNights > 0
    ? parseFloat((occupiedRoomNights / totalRoomNights * 100).toFixed(1))
    : 0
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600">อัตราเข้าพัก: {payload[0].value}%</p>
    </div>
  )
}

export default function OccupancyChart({ rooms, occupancyBookings }) {
  const data = useMemo(() => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const result = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yearNum = d.getFullYear()
      const monthNum = d.getMonth()
      const rate = calcMonthOccupancy(yearNum, monthNum, rooms, occupancyBookings, todayStr)
      result.push({
        month: `${THAI_MONTHS[monthNum]} ${yearNum + 543}`,
        rate,
      })
    }
    return result
  }, [rooms, occupancyBookings])

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
