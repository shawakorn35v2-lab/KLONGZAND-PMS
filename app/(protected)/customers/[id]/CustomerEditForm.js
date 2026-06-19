'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomer } from '@/app/actions/customers'

export default function CustomerEditForm({ customer }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: customer.full_name, phone: customer.phone ?? '', note: customer.note ?? '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    const result = await updateCustomer(customer.id, {
      full_name: form.full_name,
      phone: form.phone || null,
      note: form.note || null,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">ชื่อ-นามสกุล</p>
          <p className="font-medium text-gray-900">{customer.full_name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">เบอร์โทร</p>
          <p className="font-medium text-gray-900">{customer.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">หมายเหตุ</p>
          <p className="text-gray-700">{customer.note ?? '—'}</p>
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs mt-2">✏️ แก้ไข</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label className="label">ชื่อ-นามสกุล *</label>
        <input type="text" required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">เบอร์โทร</label>
        <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input" />
      </div>
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="input" rows={2} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary text-xs">{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs">ยกเลิก</button>
      </div>
    </form>
  )
}
