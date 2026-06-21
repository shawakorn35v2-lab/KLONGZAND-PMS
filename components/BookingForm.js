'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CustomerSearchInput from './CustomerSearchInput'
import { createBooking } from '@/app/actions/bookings'
import { getTodayString } from '@/lib/dateUtils'

const CHANNEL_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'agoda', label: 'Agoda' },
  { value: 'line', label: 'Line' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'sale', label: 'Sale' },
]

function getAvailableRooms(rooms, bookings, checkin, checkout) {
  if (!checkin || !checkout) return rooms.filter(r => r.is_active && !r.is_monthly)
  const occupied = new Set(
    (bookings ?? [])
      .filter(b => b.status !== 'cancelled' && b.checkin_date < checkout && b.checkout_date > checkin)
      .map(b => b.room_id)
  )
  return rooms.filter(r => r.is_active && !r.is_monthly && !occupied.has(r.id))
}

export default function BookingForm({ rooms, bookings, onClose }) {
  const router = useRouter()
  const today = getTodayString()

  const [form, setForm] = useState({
    roomId: '',
    channel: 'walkin',
    checkinDate: today,
    checkoutDate: '',
    price: '',
    deposit: '',
    note: '',
  })
  const [customerData, setCustomerData] = useState({ existingId: null, newCustomer: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableRooms = getAvailableRooms(rooms, bookings, form.checkinDate, form.checkoutDate)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!customerData.existingId && !customerData.newCustomer?.full_name) {
      setError('กรุณาเลือกหรือสร้างลูกค้า')
      return
    }
    if (!form.roomId) { setError('กรุณาเลือกห้องพัก'); return }
    if (!form.checkoutDate || form.checkoutDate <= form.checkinDate) {
      setError('วันเช็คเอาท์ต้องหลังวันเช็คอิน')
      return
    }
    setLoading(true)
    const result = await createBooking({
      roomId: form.roomId,
      customerId: customerData.existingId,
      newCustomer: customerData.newCustomer,
      channel: form.channel,
      checkinDate: form.checkinDate,
      checkoutDate: form.checkoutDate,
      price: form.price || 0,
      deposit: form.deposit || 0,
      note: form.note,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
    onClose?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">ลูกค้า *</label>
        <CustomerSearchInput onSelect={setCustomerData} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">วันเช็คอิน *</label>
          <input type="date" required value={form.checkinDate} onChange={e => set('checkinDate', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">วันเช็คเอาท์ *</label>
          <input type="date" required value={form.checkoutDate} min={form.checkinDate} onChange={e => set('checkoutDate', e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="label">ห้องพัก *</label>
        <select required value={form.roomId} onChange={e => set('roomId', e.target.value)} className="input">
          <option value="">-- เลือกห้อง --</option>
          {availableRooms.map(r => (
            <option key={r.id} value={r.id}>
              ห้อง {r.room_no} (อาคาร {r.building}) {r.price_per_night > 0 ? `— ฿${Number(r.price_per_night).toLocaleString('th-TH')}/คืน` : ''}
            </option>
          ))}
        </select>
        {availableRooms.length === 0 && form.checkinDate && form.checkoutDate && (
          <p className="text-xs text-red-500 mt-1">ไม่มีห้องว่างในช่วงวันที่เลือก</p>
        )}
      </div>

      <div>
        <label className="label">ช่องทาง</label>
        <select value={form.channel} onChange={e => set('channel', e.target.value)} className="input">
          {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">ราคารวม (บาท)</label>
          <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">มัดจำ (บาท)</label>
          <input type="number" min="0" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)} className="input" placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className="label">หมายเหตุ</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} className="input" rows={2} placeholder="หมายเหตุเพิ่มเติม" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'กำลังบันทึก...' : 'บันทึกการจอง'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
        )}
      </div>
    </form>
  )
}
