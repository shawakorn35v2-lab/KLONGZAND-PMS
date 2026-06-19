'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BookingForm from '@/components/BookingForm'
import { BookingStatusBadge, ChannelBadge } from '@/components/RoomStatusBadge'
import { checkinBooking, checkoutBooking, cancelBooking } from '@/app/actions/bookings'

function formatDate(d) { return d ? new Date(d).toLocaleDateString('th-TH') : '' }
function formatCurrency(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

const STATUS_FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'reserved', label: 'จองแล้ว' },
  { value: 'checked_in', label: 'เช็คอินแล้ว' },
  { value: 'checked_out', label: 'เช็คเอาท์แล้ว' },
]

export default function BookingsClient({ bookings, rooms, today, nextWeek }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [loadingId, setLoadingId] = useState(null)

  const filtered = bookings.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false
    if (dateFilter && b.checkin_date > dateFilter && b.checkout_date <= dateFilter) return false
    return true
  })

  async function handleAction(action, id) {
    setLoadingId(id)
    let result
    if (action === 'checkin') result = await checkinBooking(id)
    else if (action === 'checkout') result = await checkoutBooking(id)
    else if (action === 'cancel') {
      if (!confirm('ยืนยันยกเลิกการจอง?')) { setLoadingId(null); return }
      result = await cancelBooking(id)
    }
    setLoadingId(null)
    if (result?.error) alert('ไม่สามารถดำเนินการได้: ' + result.error)
    else router.refresh()
  }

  // Availability grid: rooms × next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  function isOccupied(roomId, day) {
    return bookings.some(b =>
      b.room_id === roomId &&
      b.status !== 'cancelled' &&
      b.checkin_date <= day &&
      b.checkout_date > day
    )
  }

  return (
    <div className="space-y-6">
      {/* New booking button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '✕ ปิดฟอร์ม' : '+ จองห้องพักใหม่'}
        </button>
      </div>

      {/* Booking form */}
      {showForm && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">จองห้องพักใหม่</h2>
          <BookingForm rooms={rooms} bookings={bookings} onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Availability grid */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">ห้องว่าง 7 วันข้างหน้า</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left px-2 py-1 text-gray-500 font-medium w-16">ห้อง</th>
                {days.map(d => (
                  <th key={d} className="px-1 py-1 text-center text-gray-500 font-medium">
                    {new Date(d).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.filter(r => !r.is_monthly).map(room => (
                <tr key={room.id}>
                  <td className="px-2 py-1.5 font-semibold text-gray-700">{room.room_no}</td>
                  {days.map(d => {
                    const occ = isOccupied(room.id, d)
                    return (
                      <td key={d} className={`px-1 py-1.5 text-center rounded`}>
                        <span className={`inline-block w-full rounded text-center py-0.5 ${occ ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {occ ? '●' : '○'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">● มีการจอง  ○ ว่าง</p>
        </div>
      </div>

      {/* Booking list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 flex-1">รายการจอง</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">ห้อง</th>
                <th className="table-th">ลูกค้า</th>
                <th className="table-th">เช็คอิน</th>
                <th className="table-th">เช็คเอาท์</th>
                <th className="table-th">ช่องทาง</th>
                <th className="table-th text-right">ราคา</th>
                <th className="table-th text-right">มัดจำ</th>
                <th className="table-th">สถานะ</th>
                <th className="table-th">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
              )}
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-td font-semibold">{b.room?.room_no ?? '-'}</td>
                  <td className="table-td">
                    <div>{b.customer?.full_name ?? '-'}</div>
                    {b.customer?.phone && <div className="text-xs text-gray-400">{b.customer.phone}</div>}
                  </td>
                  <td className="table-td">{formatDate(b.checkin_date)}</td>
                  <td className="table-td">{formatDate(b.checkout_date)}</td>
                  <td className="table-td"><ChannelBadge channel={b.channel} /></td>
                  <td className="table-td text-right">{formatCurrency(b.price)}</td>
                  <td className="table-td text-right">{formatCurrency(b.deposit)}</td>
                  <td className="table-td"><BookingStatusBadge status={b.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-1.5">
                      {b.status === 'reserved' && (
                        <button
                          onClick={() => handleAction('checkin', b.id)}
                          disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          เช็คอิน
                        </button>
                      )}
                      {b.status === 'checked_in' && (
                        <button
                          onClick={() => handleAction('checkout', b.id)}
                          disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                          เช็คเอาท์
                        </button>
                      )}
                      {b.status === 'reserved' && (
                        <button
                          onClick={() => handleAction('cancel', b.id)}
                          disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                      )}
                      {b.note && (
                        <span title={b.note} className="text-gray-400 cursor-help">📝</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
