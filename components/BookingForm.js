'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CustomerSearchInput from './CustomerSearchInput'
import { createBooking } from '@/app/actions/bookings'
import { getTodayString } from '@/lib/dateUtils'
import { createClient } from '@/lib/supabase-browser'

const CHANNEL_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'agoda', label: 'Agoda' },
  { value: 'line', label: 'Line' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'sale', label: 'Sale' },
]

function getAvailableRooms(rooms, bookings, stayType, checkinDate, checkoutDate) {
  const base = rooms.filter(r => r.is_active && !r.is_monthly)
  if (stayType === 'temporary') {
    if (!checkinDate) return base
    // For temporary: exclude rooms with overnight bookings covering this date
    const overnightOccupied = new Set(
      (bookings ?? [])
        .filter(b =>
          b.status !== 'cancelled' &&
          b.stay_type !== 'temporary' &&
          b.checkin_date <= checkinDate &&
          b.checkout_date > checkinDate
        )
        .map(b => b.room_id)
    )
    return base.filter(r => !overnightOccupied.has(r.id))
  }
  // overnight: existing logic
  if (!checkinDate || !checkoutDate) return base
  const occupied = new Set(
    (bookings ?? [])
      .filter(b => b.status !== 'cancelled' && b.checkin_date < checkoutDate && b.checkout_date > checkinDate)
      .map(b => b.room_id)
  )
  return base.filter(r => !occupied.has(r.id))
}

async function uploadDoc(file) {
  const supabase = createClient()
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('booking-documents').upload(path, file)
  if (error) throw new Error(`อัปโหลดล้มเหลว: ${error.message}`)
  return path
}

export default function BookingForm({ rooms, bookings, onClose }) {
  const router = useRouter()
  const today = getTodayString()

  const [stayType, setStayType] = useState('overnight')
  const [form, setForm] = useState({
    roomId: '',
    channel: 'walkin',
    checkinDate: today,
    checkoutDate: '',
    checkinTime: '',
    checkoutTime: '',
    price: '',
    deposit: '',
    note: '',
    vehicleReg: '',
  })
  const [customerData, setCustomerData] = useState({ existingId: null, newCustomer: null })
  const [docFiles, setDocFiles] = useState({ idCard: null })
  const [docPreviews, setDocPreviews] = useState({ idCard: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableRooms = getAvailableRooms(rooms, bookings, stayType, form.checkinDate, form.checkoutDate)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleDocFile(field, file) {
    if (!file) return
    setDocFiles(p => ({ ...p, [field]: file }))
    setDocPreviews(p => ({ ...p, [field]: URL.createObjectURL(file) }))
  }

  function clearDoc(field) {
    setDocFiles(p => ({ ...p, [field]: null }))
    setDocPreviews(p => ({ ...p, [field]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!customerData.existingId && !customerData.newCustomer?.full_name) {
      setError('กรุณาเลือกหรือสร้างลูกค้า')
      return
    }
    if (!form.roomId) { setError('กรุณาเลือกห้องพัก'); return }

    if (stayType === 'temporary') {
      if (!form.checkinDate) { setError('กรุณาเลือกวันที่'); return }
      if (!form.checkinTime || !form.checkoutTime) { setError('กรุณากรอกเวลาเข้าและเวลาออก'); return }
      if (form.checkoutTime <= form.checkinTime) { setError('เวลาออกต้องหลังเวลาเข้า'); return }
    } else {
      if (!form.checkoutDate || form.checkoutDate <= form.checkinDate) {
        setError('วันเช็คเอาท์ต้องหลังวันเช็คอิน')
        return
      }
    }

    setLoading(true)
    try {
      const idCardUrl = docFiles.idCard ? await uploadDoc(docFiles.idCard) : null
      const vehicleRegUrl = form.vehicleReg.trim() || null

      const result = await createBooking({
        roomId: form.roomId,
        customerId: customerData.existingId,
        newCustomer: customerData.newCustomer,
        channel: form.channel,
        checkinDate: form.checkinDate,
        checkoutDate: stayType === 'temporary' ? form.checkinDate : form.checkoutDate,
        price: form.price || 0,
        deposit: form.deposit || 0,
        note: form.note,
        idCardUrl,
        vehicleRegUrl,
        stayType,
        checkinTime: stayType === 'temporary' ? form.checkinTime : null,
        checkoutTime: stayType === 'temporary' ? form.checkoutTime : null,
      })
      if (result.error) { setError(result.error); return }
      router.refresh()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">ลูกค้า *</label>
        <CustomerSearchInput onSelect={setCustomerData} />
      </div>

      {/* ประเภทการพัก */}
      <div>
        <label className="label">ประเภทการพัก</label>
        <div className="flex gap-4 mt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="stayType" value="overnight"
              checked={stayType === 'overnight'}
              onChange={() => setStayType('overnight')}
              className="accent-blue-600" />
            <span>พักค้างคืน</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="stayType" value="temporary"
              checked={stayType === 'temporary'}
              onChange={() => setStayType('temporary')}
              className="accent-orange-500" />
            <span>พักชั่วคราว</span>
          </label>
        </div>
      </div>

      {/* Date/time inputs */}
      {stayType === 'overnight' ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">วันที่ *</label>
            <input type="date" required value={form.checkinDate} onChange={e => set('checkinDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">เวลาเข้า *</label>
            <input type="time" required value={form.checkinTime} onChange={e => set('checkinTime', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">เวลาออก *</label>
            <input type="time" required value={form.checkoutTime} onChange={e => set('checkoutTime', e.target.value)} className="input" />
          </div>
        </div>
      )}

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
        {availableRooms.length === 0 && form.checkinDate && (
          <p className="text-xs text-red-500 mt-1">ไม่มีห้องว่างในช่วงที่เลือก</p>
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
          <input type="number" min="0" step="0.01" value={form.price}
            onChange={e => set('price', e.target.value)}
            onWheel={e => e.currentTarget.blur()}
            className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">มัดจำ (บาท)</label>
          <input type="number" min="0" step="0.01" value={form.deposit}
            onChange={e => set('deposit', e.target.value)}
            onWheel={e => e.currentTarget.blur()}
            className="input" placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className="label">หมายเหตุ</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} className="input" rows={2} placeholder="หมายเหตุเพิ่มเติม" />
      </div>

      {/* Document upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DocUpload label="รูปบัตรประชาชน (ไม่บังคับ)" preview={docPreviews.idCard}
          onChange={f => handleDocFile('idCard', f)} onClear={() => clearDoc('idCard')} />
        <div>
          <label className="label">ทะเบียนรถ (ไม่บังคับ)</label>
          <input type="text" value={form.vehicleReg}
            onChange={e => set('vehicleReg', e.target.value)}
            className="input" placeholder="เช่น กข-1234 กรุงเทพมหานคร" />
        </div>
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

function DocUpload({ label, preview, onChange, onClear }) {
  return (
    <div>
      <label className="label">{label}</label>
      {preview ? (
        <div className="relative">
          <a href={preview} target="_blank" rel="noopener noreferrer">
            <img src={preview} alt={label} className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
          </a>
          <button type="button" onClick={onClear}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs leading-none flex items-center justify-center shadow">
            ✕
          </button>
        </div>
      ) : (
        <input type="file" accept="image/*,application/pdf"
          onChange={e => onChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-lg p-1" />
      )}
    </div>
  )
}
