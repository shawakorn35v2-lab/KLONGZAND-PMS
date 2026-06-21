'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import BookingForm from '@/components/BookingForm'
import { BookingStatusBadge, ChannelBadge } from '@/components/RoomStatusBadge'
import { checkinBooking, checkoutBooking, cancelBooking, adminUpdateBooking, adminDeleteBooking } from '@/app/actions/bookings'
import { formatDate, formatShortDate } from '@/lib/dateUtils'
function formatCurrency(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

const STATUS_FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'reserved', label: 'จองแล้ว' },
  { value: 'checked_in', label: 'เช็คอินแล้ว' },
  { value: 'checked_out', label: 'เช็คเอาท์แล้ว' },
]

const CHANNEL_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'agoda', label: 'Agoda' },
  { value: 'line', label: 'Line' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'sale', label: 'Sale' },
]

const STATUS_OPTIONS = [
  { value: 'reserved', label: 'จองแล้ว' },
  { value: 'checked_in', label: 'เช็คอินแล้ว' },
  { value: 'checked_out', label: 'เช็คเอาท์แล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

// หาห้องที่ว่างในช่วงวันที่ที่เลือก (ไม่นับ booking ปัจจุบันที่กำลังแก้ไข)
function getConflictingBooking(bookings, roomId, checkin, checkout, excludeBookingId) {
  if (!roomId || !checkin || !checkout) return null
  return bookings.find(b =>
    b.id !== excludeBookingId &&
    b.room_id === roomId &&
    b.status !== 'cancelled' &&
    b.checkin_date < checkout &&
    b.checkout_date > checkin
  ) ?? null
}

export default function BookingsClient({ bookings, rooms, today, role, adminName }) {
  const router = useRouter()
  const isAdmin = role === 'admin'

  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [loadingId, setLoadingId] = useState(null)

  // Admin edit modal
  const [editBooking, setEditBooking] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [transferReason, setTransferReason] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const filtered = bookings.filter(b => !statusFilter || b.status === statusFilter)

  // Conflict detection: ห้องว่างไหมในช่วงที่แก้ไข
  const editConflict = useMemo(() =>
    editBooking
      ? getConflictingBooking(bookings, editForm.room_id, editForm.checkin_date, editForm.checkout_date, editBooking.id)
      : null,
    [bookings, editForm.room_id, editForm.checkin_date, editForm.checkout_date, editBooking]
  )

  function openEdit(b) {
    setEditBooking(b)
    setEditForm({
      room_id: b.room_id,
      channel: b.channel,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
      price: b.price ?? 0,
      deposit: b.deposit ?? 0,
      status: b.status,
      note: b.note ?? '',
    })
    setTransferReason('')
    setEditError('')
  }

  function setEdit(field, value) {
    setEditForm(p => ({ ...p, [field]: value }))
  }

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

  async function handleEdit(e) {
    e.preventDefault()
    const priceChanged = Number(editForm.price) !== Number(editBooking.price)
    const depositChanged = Number(editForm.deposit) !== Number(editBooking.deposit)
    const hasClosedTx = editBooking.transactions?.some(t => t.is_closed)

    if ((priceChanged || depositChanged) && hasClosedTx) {
      if (!confirm('รายการนี้ปิดยอดไปแล้ว การแก้ไขราคา/มัดจำจะกระทบยอดที่ปิดไปแล้ว ยืนยันหรือไม่?')) return
    }

    if (editConflict) {
      if (!confirm(`ห้อง ${rooms.find(r => r.id === editForm.room_id)?.room_no} มีการจองของ ${editConflict.customer?.full_name ?? 'ลูกค้าอื่น'} ทับช่วงวันนี้อยู่แล้ว ยืนยันบันทึกทับหรือไม่?`)) return
    }

    const oldRoomNo = editBooking.room?.room_no
    const newRoom = rooms.find(r => r.id === editForm.room_id)
    const newRoomNo = newRoom?.room_no

    setEditLoading(true)
    const result = await adminUpdateBooking(
      editBooking.id, editForm, adminName,
      oldRoomNo, newRoomNo,
      editBooking.room_id,
      transferReason
    )
    setEditLoading(false)
    if (result?.error) { setEditError(result.error); return }
    setEditBooking(null)
    router.refresh()
  }

  async function handleDelete(b) {
    const hasClosedTx = b.transactions?.some(t => t.is_closed)
    const msg = hasClosedTx
      ? `ลบการจองห้อง ${b.room?.room_no ?? ''}?\n(มี transaction ที่ปิดยอดแล้วผูกอยู่)`
      : `ลบการจองห้อง ${b.room?.room_no ?? ''}?`
    if (!confirm(msg)) return
    setLoadingId(b.id)
    const result = await adminDeleteBooking(b.id)
    setLoadingId(null)
    if (result?.error) alert(result.error)
    else router.refresh()
  }

  // Availability grid — คำนวณจาก bookings ที่รับมา (จะ re-render เมื่อ router.refresh ดึงข้อมูลใหม่)
  const days = Array.from({ length: 7 }, (_, i) => {
    const [y, m, day] = today.split('-').map(Number)
    const d = new Date(y, m - 1, day + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const occupiedSet = useMemo(() => {
    const set = new Set()
    bookings.forEach(b => {
      if (b.status === 'cancelled') return
      days.forEach(d => {
        if (b.checkin_date <= d && b.checkout_date > d) {
          set.add(`${b.room_id}__${d}`)
        }
      })
    })
    return set
  }, [bookings])

  const selectedRoom = editBooking ? rooms.find(r => r.id === editForm.room_id) : null

  return (
    <div className="space-y-6">
      {/* New booking button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '✕ ปิดฟอร์ม' : '+ จองห้องพักใหม่'}
        </button>
      </div>

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
                    {formatShortDate(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.filter(r => !r.is_monthly).map(room => (
                <tr key={room.id}>
                  <td className="px-2 py-1.5 font-semibold text-gray-700">{room.room_no}</td>
                  {days.map(d => {
                    const occ = occupiedSet.has(`${room.id}__${d}`)
                    return (
                      <td key={d} className="px-1 py-1.5 text-center rounded">
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
                    <div className="flex flex-wrap gap-1.5">
                      {b.status === 'reserved' && (
                        <button onClick={() => handleAction('checkin', b.id)} disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                          เช็คอิน
                        </button>
                      )}
                      {b.status === 'checked_in' && (
                        <button onClick={() => handleAction('checkout', b.id)} disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
                          เช็คเอาท์
                        </button>
                      )}
                      {b.status === 'reserved' && (
                        <button onClick={() => handleAction('cancel', b.id)} disabled={loadingId === b.id}
                          className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-red-100 hover:text-red-700 disabled:opacity-50">
                          ยกเลิก
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(b)} disabled={loadingId === b.id}
                            className="px-2.5 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                            ✏ แก้ไข
                          </button>
                          <button onClick={() => handleDelete(b)} disabled={loadingId === b.id}
                            className="px-2.5 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                            🗑 ลบ
                          </button>
                        </>
                      )}
                      {b.note && <span title={b.note} className="text-gray-400 cursor-help">📝</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {editBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                แก้ไข / โยกวันเข้าพัก — {editBooking.customer?.full_name ?? ''}
              </h3>
              {editBooking.transactions?.some(t => t.is_closed) && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">🔒 ปิดยอดแล้ว</span>
              )}
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              {/* Room */}
              <div>
                <label className="label">ห้องพัก (โยกห้องได้)</label>
                <select value={editForm.room_id} onChange={e => setEdit('room_id', e.target.value)} className="input">
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>ห้อง {r.room_no} (อาคาร {r.building})</option>
                  ))}
                </select>
                {editForm.room_id !== editBooking.room_id && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <label className="label">เหตุผลการย้ายห้อง</label>
                      <input
                        type="text"
                        value={transferReason}
                        onChange={e => setTransferReason(e.target.value)}
                        className="input"
                        placeholder="เช่น ห้องมีปัญหา / ลูกค้าขอย้าย"
                      />
                    </div>
                    <p className="text-xs text-amber-600">
                      ⚠ ห้อง {editBooking.room?.room_no} จะถูกตั้งเป็น "รอทำความสะอาด" อัตโนมัติ และบันทึกใน note
                    </p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">วันเช็คอิน (โยกวันได้)</label>
                  <input type="date" value={editForm.checkin_date}
                    onChange={e => setEdit('checkin_date', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">วันเช็คเอาท์</label>
                  <input type="date" value={editForm.checkout_date}
                    min={editForm.checkin_date}
                    onChange={e => setEdit('checkout_date', e.target.value)} className="input" />
                </div>
              </div>

              {/* Conflict warning — แสดงทันทีเมื่อห้อง/วันชนกัน */}
              {editConflict && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  ⚠ ห้อง {selectedRoom?.room_no} มีการจองของ <strong>{editConflict.customer?.full_name ?? 'ลูกค้าอื่น'}</strong> ทับอยู่ในช่วงวันนี้
                  ({formatDate(editConflict.checkin_date)} – {formatDate(editConflict.checkout_date)})
                </div>
              )}

              {/* Channel */}
              <div>
                <label className="label">ช่องทาง</label>
                <select value={editForm.channel} onChange={e => setEdit('channel', e.target.value)} className="input">
                  {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Price / Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคารวม (บาท)</label>
                  <input type="number" min="0" step="0.01" value={editForm.price}
                    onChange={e => setEdit('price', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">มัดจำ (บาท)</label>
                  <input type="number" min="0" step="0.01" value={editForm.deposit}
                    onChange={e => setEdit('deposit', e.target.value)} className="input" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="label">สถานะ</label>
                <select value={editForm.status} onChange={e => setEdit('status', e.target.value)} className="input">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="label">หมายเหตุ</label>
                <textarea value={editForm.note} onChange={e => setEdit('note', e.target.value)}
                  className="input" rows={3}
                  placeholder="หมายเหตุ (ประวัติย้ายห้องจะเพิ่มอัตโนมัติ)" />
              </div>

              {editError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editLoading} className="btn-primary flex-1 justify-center">
                  {editLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <button type="button" onClick={() => setEditBooking(null)} className="btn-secondary">ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
