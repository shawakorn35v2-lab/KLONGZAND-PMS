'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCustomer } from '@/app/actions/customers'
import { formatDate } from '@/lib/dateUtils'

export default function CustomersClient({ customers: initialCustomers }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = initialCustomers.filter(c =>
    !query || c.full_name?.toLowerCase().includes(query.toLowerCase()) || c.phone?.includes(query)
  )

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('กรุณากรอกชื่อ'); return }
    setLoading(true)
    const result = await createCustomer({
      full_name: form.full_name,
      phone: form.phone || null,
      note: form.note || null,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setForm({ full_name: '', phone: '', note: '' })
    setShowForm(false)
    setError('')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อหรือเบอร์โทร..."
          className="input sm:max-w-sm"
        />
        <button onClick={() => setShowForm(!showForm)} className="btn-primary sm:w-auto justify-center">
          {showForm ? '✕ ปิด' : '+ เพิ่มลูกค้าใหม่'}
        </button>
      </div>

      {showForm && (
        <div className="card max-w-md">
          <h2 className="text-base font-semibold text-gray-900 mb-4">เพิ่มลูกค้าใหม่</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">ชื่อ-นามสกุล *</label>
              <input type="text" required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="input" placeholder="กรอกชื่อ" />
            </div>
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input" placeholder="0xx-xxx-xxxx" />
            </div>
            <div>
              <label className="label">หมายเหตุ</label>
              <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="input" rows={2} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">ชื่อ-นามสกุล</th>
                <th className="table-th">เบอร์โทร</th>
                <th className="table-th">หมายเหตุ</th>
                <th className="table-th">วันที่สร้าง</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">ไม่พบข้อมูล</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{c.full_name}</td>
                  <td className="table-td">{c.phone ?? '—'}</td>
                  <td className="table-td text-gray-500">{c.note ?? '—'}</td>
                  <td className="table-td text-gray-500">{formatDate(c.created_at)}</td>
                  <td className="table-td">
                    <Link href={`/customers/${c.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      ดูประวัติ →
                    </Link>
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
