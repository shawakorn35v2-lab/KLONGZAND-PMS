'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addTransactionCategory, deleteTransactionCategory } from '@/app/actions/transactionCategories'

export default function ManageCategoriesModal({ categories, usage, onClose }) {
  const router = useRouter()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('income')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const incomeCats = categories.filter(c => c.tx_type === 'income')
  const expenseCats = categories.filter(c => c.tx_type === 'expense')

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!newName.trim()) { setError('กรุณากรอกชื่อหมวดหมู่'); return }
    setBusy(true)
    const result = await addTransactionCategory({ name: newName.trim(), tx_type: newType })
    setBusy(false)
    if (result.error) { setError(result.error); return }
    setNewName('')
    router.refresh()
  }

  async function handleDelete(cat) {
    const count = usage[cat.name] ?? 0
    const msg = count > 0
      ? `หมวดหมู่ "${cat.name}" ถูกใช้ในรายการ ${count.toLocaleString('th-TH')} รายการอยู่แล้ว\n` +
        `รายการเดิมจะไม่ถูกลบ แต่หมวดหมู่นี้จะหายไปจากตัวเลือกในฟอร์ม\nยืนยันลบหรือไม่?`
      : `ลบหมวดหมู่ "${cat.name}" ?`
    if (!confirm(msg)) return
    setDeletingId(cat.id)
    const result = await deleteTransactionCategory(cat.id)
    setDeletingId(null)
    if (result.error) { alert(result.error); return }
    router.refresh()
  }

  function renderList(list, emptyText) {
    if (list.length === 0) return <p className="text-sm text-gray-400 py-2">{emptyText}</p>
    return (
      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
        {list.map(c => {
          const count = usage[c.name] ?? 0
          return (
            <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-900 truncate">{c.name}</span>
                {count > 0 && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    ({count.toLocaleString('th-TH')} รายการ)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c)}
                disabled={deletingId === c.id}
                className="text-red-400 hover:text-red-600 disabled:opacity-40 text-base leading-none px-2"
                title="ลบหมวดหมู่นี้"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose?.()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">จัดการหมวดหมู่รายรับ-รายจ่าย</h3>
          <button type="button" onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="space-y-3 mb-5 pb-5 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">+ เพิ่มหมวดหมู่ใหม่</p>
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="input max-w-[130px]"
              disabled={busy}
            >
              <option value="income">รายรับ</option>
              <option value="expense">รายจ่าย</option>
            </select>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input flex-1"
              placeholder="ชื่อหมวดหมู่"
              disabled={busy}
              maxLength={50}
            />
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? '...' : '+ เพิ่ม'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </form>

        {/* Lists */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">รายรับ ({incomeCats.length})</p>
            {renderList(incomeCats, 'ยังไม่มีหมวดหมู่รายรับ')}
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">รายจ่าย ({expenseCats.length})</p>
            {renderList(expenseCats, 'ยังไม่มีหมวดหมู่รายจ่าย')}
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
