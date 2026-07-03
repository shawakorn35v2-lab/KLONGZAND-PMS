'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReceipt, updateReceipt } from '@/app/actions/receipts'
import { getTodayString } from '@/lib/dateUtils'

function fmt(n) {
  return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const emptyItem = () => ({ description: '', quantity: '', unitPrice: '' })

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'เงินสด' },
  { value: 'transfer', label: 'โอนเงิน' },
  { value: 'other', label: 'อื่นๆ' },
]

function initialFormFromReceipt(r) {
  if (!r) {
    return {
      form: {
        customerName: '', customerAddress: '', customerTel: '', customerTaxId: '',
        paymentMethod: 'cash', paymentOtherNote: '', remark: '', discount: '',
      },
      items: [emptyItem(), emptyItem(), emptyItem()],
    }
  }
  const items = (r.items ?? []).map(it => ({
    description: it.description ?? '',
    quantity: it.quantity == null ? '' : String(it.quantity),
    unitPrice: it.unit_price == null ? '' : String(it.unit_price),
  }))
  while (items.length < 1) items.push(emptyItem())
  return {
    form: {
      customerName: r.customer_name ?? '',
      customerAddress: r.customer_address ?? '',
      customerTel: r.customer_tel ?? '',
      customerTaxId: r.customer_tax_id ?? '',
      paymentMethod: r.payment_method ?? 'cash',
      paymentOtherNote: r.payment_other_note ?? '',
      remark: r.remark ?? '',
      discount: r.discount == null ? '' : String(r.discount),
    },
    items,
  }
}

export default function ReceiptForm({ initialReceipt = null }) {
  const router = useRouter()
  const isEdit = !!initialReceipt
  const seed = initialFormFromReceipt(initialReceipt)
  const [form, setForm] = useState(seed.form)
  const [items, setItems] = useState(seed.items)
  const [receiptDate, setReceiptDate] = useState(initialReceipt?.receipt_date ?? getTodayString())
  const [editNote, setEditNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(p => ({ ...p, [field]: value })) }

  function updateItem(i, field, value) {
    setItems(p => p.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))
  }
  function addItem() {
    if (items.length >= 10) return
    setItems(p => [...p, emptyItem()])
  }
  function removeItem(i) {
    if (items.length <= 1) return
    setItems(p => p.filter((_, idx) => idx !== i))
  }

  const itemAmounts = items.map(it => Number(it.quantity || 0) * Number(it.unitPrice || 0))
  const subtotal = itemAmounts.reduce((s, x) => s + x, 0)
  const discount = Math.max(0, Number(form.discount || 0))
  const total = Math.max(0, subtotal - discount)

  const hasAnyItem = items.some(
    it => it.description.trim() || Number(it.quantity) > 0 || Number(it.unitPrice) > 0
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.customerName.trim()) { setError('กรุณากรอกชื่อลูกค้า'); return }
    if (!hasAnyItem) { setError('กรุณากรอกอย่างน้อย 1 รายการ'); return }

    setLoading(true)
    const payload = {
      customerName: form.customerName.trim(),
      customerAddress: form.customerAddress.trim(),
      customerTel: form.customerTel.trim(),
      customerTaxId: form.customerTaxId.trim(),
      paymentMethod: form.paymentMethod,
      paymentOtherNote: form.paymentMethod === 'other' ? form.paymentOtherNote.trim() : '',
      remark: form.remark.trim(),
      discount,
      receipt_date: receiptDate,
      items: items.filter(it => it.description.trim() || Number(it.quantity) > 0 || Number(it.unitPrice) > 0),
    }

    const result = isEdit
      ? await updateReceipt(initialReceipt.id, payload, editNote.trim())
      : await createReceipt(payload)

    if (result.error) { setError(result.error); setLoading(false); return }

    if (isEdit) {
      router.push(`/receipts/${initialReceipt.id}`)
      router.refresh()
    } else {
      router.push(`/receipts/${result.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isEdit && (
        <div className="card bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-3">
          <span className="text-sm text-amber-800">
            กำลังแก้ไขใบเสร็จเลขที่ <span className="font-semibold">{initialReceipt.receipt_no}</span>
            {' — '}เลขที่จะไม่เปลี่ยน
          </span>
        </div>
      )}

      {/* Customer info */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">ข้อมูลลูกค้า</h2>
        <div>
          <label className="label">วันที่ / Date *</label>
          <input
            type="date" required
            value={receiptDate}
            onChange={e => setReceiptDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">ชื่อลูกค้า *</label>
          <input
            type="text" required
            value={form.customerName}
            onChange={e => set('customerName', e.target.value)}
            className="input"
            placeholder="คุณ..."
          />
        </div>
        <div>
          <label className="label">ที่อยู่</label>
          <input
            type="text"
            value={form.customerAddress}
            onChange={e => set('customerAddress', e.target.value)}
            className="input"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">เบอร์โทร</label>
            <input
              type="tel"
              value={form.customerTel}
              onChange={e => set('customerTel', e.target.value)}
              className="input"
              placeholder="08x-xxx-xxxx"
            />
          </div>
          <div>
            <label className="label">เลขประจำตัวผู้เสียภาษี</label>
            <input
              type="text"
              value={form.customerTaxId}
              onChange={e => set('customerTaxId', e.target.value)}
              className="input"
              maxLength={20}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-900">รายการสินค้า/บริการ ({items.length}/10)</h2>
          <button
            type="button" onClick={addItem} disabled={items.length >= 10}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40"
          >
            + เพิ่มรายการ
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase">
                <th className="py-2 pr-2 w-10">#</th>
                <th className="py-2 pr-2">รายการ</th>
                <th className="py-2 pr-2 w-24">จำนวน</th>
                <th className="py-2 pr-2 w-32">ราคา/หน่วย</th>
                <th className="py-2 pr-2 w-32 text-right">จำนวนเงิน</th>
                <th className="py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 text-gray-500 align-middle">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="text" value={it.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      className="input text-sm" placeholder="รายการ / Description"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" min="0" step="0.01" value={it.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                      onWheel={e => e.currentTarget.blur()}
                      className="input text-sm text-right" placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" min="0" step="0.01" value={it.unitPrice}
                      onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                      onWheel={e => e.currentTarget.blur()}
                      className="input text-sm text-right" placeholder="0.00"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium text-gray-800 align-middle">
                    {fmt(itemAmounts[i])}
                  </td>
                  <td className="py-1.5 align-middle">
                    {items.length > 1 && (
                      <button
                        type="button" onClick={() => removeItem(i)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                        title="ลบแถวนี้"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment + remark */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">ชำระโดย</h2>
          <div className="flex flex-wrap gap-4">
            {PAYMENT_OPTIONS.map(o => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio" name="paymentMethod" value={o.value}
                  checked={form.paymentMethod === o.value}
                  onChange={() => set('paymentMethod', o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {form.paymentMethod === 'other' && (
            <div>
              <label className="label">ระบุช่องทางอื่น</label>
              <input
                type="text" value={form.paymentOtherNote}
                onChange={e => set('paymentOtherNote', e.target.value)}
                className="input" placeholder="เช่น QR PromptPay"
              />
            </div>
          )}
          <div>
            <label className="label">หมายเหตุ</label>
            <textarea
              rows={2} value={form.remark}
              onChange={e => set('remark', e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold text-gray-900">สรุปยอด</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">รวมเงิน (Sub-total)</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center gap-3 text-sm">
            <span className="text-gray-600 whitespace-nowrap">ส่วนลด (Discount)</span>
            <input
              type="number" min="0" step="0.01" value={form.discount}
              onChange={e => set('discount', e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="input max-w-[140px] text-right text-sm"
              placeholder="0.00"
            />
          </div>
          <div className="border-t-2 border-blue-600 pt-2 flex justify-between text-base font-bold text-blue-700">
            <span>รับเงินแล้ว (Total)</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {isEdit && (
        <div className="card">
          <label className="label">เหตุผลการแก้ไข (ไม่บังคับ)</label>
          <input
            type="text" value={editNote}
            onChange={e => setEditNote(e.target.value)}
            className="input"
            placeholder="เช่น พิมพ์ชื่อลูกค้าผิด, ลูกค้าขอเพิ่มรายการ"
          />
          <p className="text-xs text-gray-500 mt-1">
            ระบบจะบันทึกประวัติการแก้ไขไว้ในหน้ารายละเอียดใบเสร็จ
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading
            ? 'กำลังบันทึก...'
            : isEdit ? '💾 บันทึกการแก้ไข' : '💾 บันทึกและดูใบเสร็จ'}
        </button>
        <button
          type="button"
          onClick={() => router.push(isEdit ? `/receipts/${initialReceipt.id}` : '/receipts')}
          className="btn-secondary"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
