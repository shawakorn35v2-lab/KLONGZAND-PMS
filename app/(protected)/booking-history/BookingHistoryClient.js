'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/dateUtils'
import { FIELD_LABEL, formatEditValue } from '@/lib/bookingEditFormat'

export default function BookingHistoryClient({ edits, staff, rooms, dateFrom, dateTo, staffId }) {
  const router = useRouter()
  const [filterFrom, setFilterFrom] = useState(dateFrom ?? '')
  const [filterTo, setFilterTo] = useState(dateTo ?? '')
  const [filterStaff, setFilterStaff] = useState(staffId ?? '')

  const roomsById = Object.fromEntries(rooms.map(r => [r.id, r.room_no]))

  function applyFilter() {
    const params = new URLSearchParams()
    if (filterFrom) params.set('dateFrom', filterFrom)
    if (filterTo) params.set('dateTo', filterTo)
    if (filterStaff) params.set('staffId', filterStaff)
    router.push(`/booking-history${params.toString() ? '?' + params.toString() : ''}`)
  }

  function resetFilter() {
    setFilterFrom('')
    setFilterTo('')
    setFilterStaff('')
    router.push('/booking-history')
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">ตั้งแต่วันที่</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">ถึงวันที่</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">พนักงาน</label>
          <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="input">
            <option value="">ทั้งหมด</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <button onClick={applyFilter} className="btn-primary">กรอง</button>
        <button onClick={resetFilter} className="btn-secondary">ล้าง</button>
      </div>

      <div className="card">
        {edits.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">ไม่พบประวัติการแก้ไขในช่วงที่เลือก</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {edits.map(e => (
              <div key={e.id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-gray-500 text-xs">{formatDateTime(e.edited_at)} — {e.profiles?.full_name ?? '—'}</span>
                  <span className="text-xs text-gray-400">
                    ห้อง {e.bookings?.room?.room_no ?? '—'} · {e.bookings?.customer?.full_name ?? '—'}
                  </span>
                </div>
                <div className="text-gray-800 mt-0.5">
                  แก้ {FIELD_LABEL[e.field_name] ?? e.field_name}: {formatEditValue(e.field_name, e.old_value, roomsById)} → {formatEditValue(e.field_name, e.new_value, roomsById)}
                </div>
                {e.reason && <div className="text-xs text-gray-400 mt-0.5">เหตุผล: {e.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
