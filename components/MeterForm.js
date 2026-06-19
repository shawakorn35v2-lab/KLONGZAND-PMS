'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveMeterReading } from '@/app/actions/rooms'

function fmt(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function MeterForm({ roomId }) {
  const router = useRouter()
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [form, setForm] = useState({
    billing_month: defaultMonth,
    prev_reading: '',
    curr_reading: '',
    unit_price: '7.50',
    water_flat_fee: '0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  const units = Math.max(0, Number(form.curr_reading) - Number(form.prev_reading))
  const electricCost = units * Number(form.unit_price)
  const totalAmount = electricCost + Number(form.water_flat_fee)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (Number(form.curr_reading) < Number(form.prev_reading)) {
      setError('ค่ามิเตอร์ปัจจุบันต้องไม่น้อยกว่าค่าก่อนหน้า')
      return
    }
    setLoading(true)
    const result = await saveMeterReading({
      room_id: roomId,
      billing_month: form.billing_month,
      prev_reading: Number(form.prev_reading),
      curr_reading: Number(form.curr_reading),
      unit_price: Number(form.unit_price),
      water_flat_fee: Number(form.water_flat_fee),
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess('บันทึกข้อมูลมิเตอร์สำเร็จ')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">รอบบิล (เดือน)</label>
        <input
          type="date"
          required
          value={form.billing_month}
          onChange={e => set('billing_month', e.target.value)}
          className="input"
        />
        <p className="text-xs text-gray-500 mt-1">กรอกวันที่ 1 ของเดือน เช่น 2026-06-01</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">มิเตอร์ก่อนหน้า (หน่วย)</label>
          <input type="number" min="0" step="0.01" required value={form.prev_reading} onChange={e => set('prev_reading', e.target.value)} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">มิเตอร์ปัจจุบัน (หน่วย)</label>
          <input type="number" min="0" step="0.01" required value={form.curr_reading} onChange={e => set('curr_reading', e.target.value)} className="input" placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">ราคาต่อหน่วย (บาท)</label>
          <input type="number" min="0" step="0.01" required value={form.unit_price} onChange={e => set('unit_price', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">ค่าน้ำเหมา (บาท)</label>
          <input type="number" min="0" step="0.01" value={form.water_flat_fee} onChange={e => set('water_flat_fee', e.target.value)} className="input" placeholder="0.00" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1.5 text-sm">
        <p className="font-semibold text-blue-800 mb-2">ผลการคำนวณ (Preview)</p>
        <div className="flex justify-between text-gray-700">
          <span>หน่วยที่ใช้</span>
          <span className="font-medium">{fmt(units)} หน่วย</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>ค่าไฟฟ้า ({fmt(form.unit_price)} บาท/หน่วย)</span>
          <span className="font-medium">฿{fmt(electricCost)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>ค่าน้ำเหมา</span>
          <span className="font-medium">฿{fmt(form.water_flat_fee)}</span>
        </div>
        <div className="flex justify-between text-blue-800 font-bold border-t border-blue-200 pt-1.5">
          <span>รวมทั้งสิ้น</span>
          <span>฿{fmt(totalAmount)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
        {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลมิเตอร์'}
      </button>
    </form>
  )
}
