'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/app/actions/transactions'

const INCOME_CATEGORIES = ['ค่าห้อง', 'ค่ามัดจำ', 'ค่าบริการ', 'อื่นๆ']
const EXPENSE_CATEGORIES = ['ค่าสาธารณูปโภค', 'ซ่อมบำรุง', 'วัสดุ-อุปกรณ์', 'เงินเดือน', 'อื่นๆ']

export default function TransactionForm({ onClose }) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    tx_date: today,
    tx_type: 'income',
    category: INCOME_CATEGORIES[0],
    amount: '',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'tx_type') {
        next.category = value === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.amount || Number(form.amount) <= 0) { setError('กรุณากรอกจำนวนเงิน'); return }
    setLoading(true)
    const result = await createTransaction({
      tx_date: form.tx_date,
      tx_type: form.tx_type,
      category: form.category,
      amount: form.amount,
      note: form.note || null,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
    onClose?.()
  }

  const categories = form.tx_type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">วันที่</label>
        <input type="date" required value={form.tx_date} onChange={e => set('tx_date', e.target.value)} className="input" />
      </div>

      <div>
        <label className="label">ประเภท</label>
        <div className="flex gap-3">
          {[{ value: 'income', label: 'รายรับ', color: 'green' }, { value: 'expense', label: 'รายจ่าย', color: 'red' }].map(t => (
            <label key={t.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tx_type"
                value={t.value}
                checked={form.tx_type === t.value}
                onChange={() => set('tx_type', t.value)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">หมวดหมู่</label>
        <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="label">จำนวนเงิน (บาท) *</label>
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
          className="input"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="label">หมายเหตุ</label>
        <input type="text" value={form.note} onChange={e => set('note', e.target.value)} className="input" placeholder="รายละเอียดเพิ่มเติม" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {onClose && <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>}
      </div>
    </form>
  )
}
